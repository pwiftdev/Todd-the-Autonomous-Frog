import { randomUUID } from "node:crypto";
import {
  type BrainRunTrigger,
  type DecisionRun,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

export class LeaseLostError extends Error {
  constructor() {
    super("The decision-run lease is no longer current.");
    this.name = "LeaseLostError";
  }
}

type DatabaseClient = PrismaClient;

type EnqueueOptions = {
  idempotencyKey: string;
  trigger: BrainRunTrigger;
};

export async function enqueueDecisionRun(
  prisma: DatabaseClient,
  options: EnqueueOptions,
): Promise<DecisionRun | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${options.idempotencyKey}, 0))
    `;
    const existing = await tx.decisionRun.findUnique({
      where: { idempotencyKey: options.idempotencyKey },
    });
    if (existing) return existing;

    const candidates = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s."id"
      FROM "Suggestion" s
      WHERE s."status" = 'PENDING'
        AND NOT EXISTS (
          SELECT 1
          FROM "DecisionRun" r
          WHERE r."suggestionId" = s."id"
            AND r."status" IN ('QUEUED', 'RUNNING', 'RETRYING')
        )
      ORDER BY s."supportCount" DESC, s."createdAt" ASC, s."id" ASC
      FOR UPDATE OF s SKIP LOCKED
      LIMIT 1
    `;
    const candidate = candidates[0];
    if (!candidate) return null;

    const run = await tx.decisionRun.create({
      data: {
        idempotencyKey: options.idempotencyKey,
        trigger: options.trigger,
        suggestionId: candidate.id,
      },
    });
    await tx.suggestion.update({
      where: { id: candidate.id },
      data: { status: "CONSIDERING" },
    });
    await tx.auditLog.create({
      data: {
        event: "DECISION_RUN_QUEUED",
        actor: options.trigger.toLowerCase(),
        metadata: {
          runId: run.id,
          suggestionId: run.suggestionId,
          idempotencyKey: run.idempotencyKey,
        },
      },
    });
    return run;
  });
}

export type ClaimedDecisionRun = {
  id: string;
  idempotencyKey: string;
  trigger: BrainRunTrigger;
  status: "RUNNING";
  suggestionId: string;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  contextSnapshot: Prisma.JsonValue | null;
  contextHash: string | null;
  promptHash: string | null;
};

export async function claimDecisionRun(
  prisma: DatabaseClient,
  {
    workerId,
    leaseMs,
  }: {
    workerId: string;
    leaseMs: number;
  },
): Promise<ClaimedDecisionRun | null> {
  if (!workerId.trim()) throw new Error("workerId is required.");
  if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 600_000) {
    throw new Error("leaseMs must be between 1 and 600 seconds.");
  }
  const leaseToken = randomUUID();
  return prisma.$transaction(async (tx) => {
    const exhausted = await tx.$queryRaw<Array<{ id: string; suggestionId: string }>>`
      WITH expired AS (
        SELECT r."id"
        FROM "DecisionRun" r
        WHERE r."status" = 'RUNNING'
          AND r."leaseExpiresAt" < CURRENT_TIMESTAMP
          AND r."attemptCount" >= r."maxAttempts"
        ORDER BY r."leaseExpiresAt" ASC, r."id" ASC
        FOR UPDATE OF r SKIP LOCKED
        LIMIT 100
      )
      UPDATE "DecisionRun" r
      SET "status" = 'FAILED',
          "workerId" = NULL,
          "leaseToken" = NULL,
          "leaseExpiresAt" = NULL,
          "completedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP,
          "lastErrorCode" = 'LEASE_EXPIRED_EXHAUSTED',
          "lastErrorMessage" = 'The final worker lease expired before completion.'
      FROM expired
      WHERE r."id" = expired."id"
      RETURNING r."id", r."suggestionId"
    `;
    if (exhausted.length > 0) {
      await tx.suggestion.updateMany({
        where: { id: { in: exhausted.map((run) => run.suggestionId) } },
        data: { status: "PENDING" },
      });
      await tx.auditLog.createMany({
        data: exhausted.map((run) => ({
          event: "DECISION_RUN_EXHAUSTED_AFTER_LEASE_EXPIRY",
          actor: "worker",
          metadata: { runId: run.id, suggestionId: run.suggestionId },
        })),
      });
    }
    const rows = await tx.$queryRaw<ClaimedDecisionRun[]>`
    WITH candidate AS (
      SELECT r."id"
      FROM "DecisionRun" r
      WHERE (
          (r."status" IN ('QUEUED', 'RETRYING') AND r."nextAttemptAt" <= CURRENT_TIMESTAMP)
          OR
          (r."status" = 'RUNNING' AND r."leaseExpiresAt" < CURRENT_TIMESTAMP)
        )
        AND r."attemptCount" < r."maxAttempts"
        AND NOT EXISTS (
          SELECT 1 FROM "ToddState" t
          WHERE t."id" = 'todd' AND t."autonomyPaused" = true
        )
      ORDER BY r."nextAttemptAt" ASC, r."createdAt" ASC, r."id" ASC
      FOR UPDATE OF r SKIP LOCKED
      LIMIT 1
    )
    UPDATE "DecisionRun" r
    SET "status" = 'RUNNING',
        "workerId" = ${workerId},
        "leaseToken" = ${leaseToken},
        "leaseExpiresAt" = CURRENT_TIMESTAMP + (${leaseMs} * INTERVAL '1 millisecond'),
        "attemptCount" = r."attemptCount" + 1,
        "startedAt" = COALESCE(r."startedAt", CURRENT_TIMESTAMP),
        "updatedAt" = CURRENT_TIMESTAMP,
        "lastErrorCode" = NULL,
        "lastErrorMessage" = NULL
    FROM candidate
    WHERE r."id" = candidate."id"
    RETURNING r."id", r."idempotencyKey", r."trigger", r."status",
              r."suggestionId", r."workerId", r."leaseToken",
              r."leaseExpiresAt", r."attemptCount", r."maxAttempts",
              r."contextSnapshot", r."contextHash", r."promptHash"
    `;
    return rows[0] ?? null;
  });
}

export async function saveRunContext(
  prisma: DatabaseClient,
  {
    runId,
    leaseToken,
    context,
    contextHash,
    promptHash,
  }: {
    runId: string;
    leaseToken: string;
    context: Prisma.InputJsonValue;
    contextHash: string;
    promptHash: string;
  },
) {
  const updated = await prisma.$executeRaw`
    UPDATE "DecisionRun"
    SET "contextSnapshot" = ${JSON.stringify(context)}::jsonb,
        "contextHash" = ${contextHash},
        "promptHash" = ${promptHash},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${runId}
      AND "status" = 'RUNNING'
      AND "leaseToken" = ${leaseToken}
      AND "leaseExpiresAt" > CURRENT_TIMESTAMP
  `;
  if (updated !== 1) throw new LeaseLostError();
}

export async function heartbeatDecisionRun(
  prisma: DatabaseClient,
  {
    runId,
    leaseToken,
    leaseMs,
  }: { runId: string; leaseToken: string; leaseMs: number },
) {
  const updated = await prisma.$executeRaw`
    UPDATE "DecisionRun"
    SET "leaseExpiresAt" = CURRENT_TIMESTAMP + (${leaseMs} * INTERVAL '1 millisecond'),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${runId}
      AND "status" = 'RUNNING'
      AND "leaseToken" = ${leaseToken}
      AND "leaseExpiresAt" > CURRENT_TIMESTAMP
  `;
  if (updated !== 1) throw new LeaseLostError();
}
