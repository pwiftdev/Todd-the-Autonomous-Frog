import {
  type BrainRunStatus,
  Prisma,
  type PrismaClient,
  type ToddActivityKind,
} from "@prisma/client";

import {
  type AiProvider,
  type EvaluationContext,
  type ProviderEvaluation,
} from "@/lib/ai/provider";
import {
  applyPersonalityDeltas,
  enforceEvaluationPolicy,
  type BrainEvaluation,
} from "@/lib/brain/contracts";
import {
  hashContext,
  hashPrompt,
  loadEvaluationContext,
} from "@/lib/brain/context";
import {
  claimDecisionRun,
  heartbeatDecisionRun,
  LeaseLostError,
  saveRunContext,
  type ClaimedDecisionRun,
} from "@/lib/brain/store";

export type WorkerResult =
  | { status: "idle" }
  | { status: "succeeded"; runId: string; decisionId: string }
  | { status: "retrying" | "failed"; runId: string }
  | { status: "lease_lost"; runId: string };

function safeError(error: unknown) {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `Prisma:${error.code}`
      : error instanceof Error
        ? error.name.slice(0, 80)
        : "UnknownError";
  const message =
    error instanceof LeaseLostError
      ? error.message
      : "The AI provider request or decision transaction failed.";
  return { code, message };
}

function decisionStatus(evaluation: BrainEvaluation) {
  if (evaluation.action) return "IMPLEMENTED" as const;
  return {
    accept: "ACCEPTED",
    reject: "REJECTED",
    postpone: "PENDING",
    modify: "MODIFIED",
  }[evaluation.decision] as
    | "ACCEPTED"
    | "REJECTED"
    | "PENDING"
    | "MODIFIED";
}

function activityKind(type: BrainEvaluation["activity"]["type"]): ToddActivityKind {
  return {
    reviewing: "REVIEWING",
    thinking: "THINKING",
    resting: "RESTING",
  }[type] as ToddActivityKind;
}

async function assertCurrentLease(
  tx: Prisma.TransactionClient,
  claim: ClaimedDecisionRun,
) {
  const current = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "DecisionRun"
    WHERE "id" = ${claim.id}
      AND "status" = 'RUNNING'
      AND "leaseToken" = ${claim.leaseToken}
      AND "leaseExpiresAt" > CURRENT_TIMESTAMP
    FOR UPDATE
  `;
  if (!current[0]) throw new LeaseLostError();
}

async function applyConfigAction(
  tx: Prisma.TransactionClient,
  evaluation: BrainEvaluation,
  decisionId: string,
  suggestionId: string,
) {
  if (!evaluation.action) return;
  await tx.$queryRaw<Array<{ locked: number }>>`
    SELECT 1 AS "locked"
    FROM pg_advisory_xact_lock(hashtextextended('site-config', 0))
  `;
  const active = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "SiteConfig"
    WHERE "isActive" = true
    ORDER BY "version" DESC, "id" ASC
    FOR UPDATE
    LIMIT 1
  `;
  if (!active[0]) throw new Error("No active site configuration exists.");
  const current = await tx.siteConfig.findUniqueOrThrow({
    where: { id: active[0].id },
  });
  const highestVersion = await tx.siteConfig.aggregate({
    _max: { version: true },
  });
  const { key, value } = evaluation.action.payload;
  const previousValue = current[key];

  await tx.siteConfig.update({
    where: { id: current.id },
    data: { isActive: false },
  });
  await tx.siteConfig.create({
    data: {
      parentConfigId: current.id,
      version: (highestVersion._max.version ?? 0) + 1,
      isActive: true,
      theme: current.theme,
      accent: current.accent,
      heroTitle: current.heroTitle,
      heroSubtitle: current.heroSubtitle,
      ctaCopy: current.ctaCopy,
      announcement: current.announcement,
      statusText: current.statusText,
      frogMood: current.frogMood,
      frogAccessory: current.frogAccessory,
      enabledSections: current.enabledSections as Prisma.InputJsonValue,
      [key]: value,
    },
  });
  await tx.action.create({
    data: {
      suggestionId,
      decisionId,
      type: `${key}_update`,
      previousValue:
        previousValue === null
          ? Prisma.JsonNull
          : (previousValue as Prisma.InputJsonValue),
      newValue:
        value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue),
      reasoning: evaluation.reasoningPublic,
    },
  });
}

async function finalizeDecision(
  prisma: PrismaClient,
  claim: ClaimedDecisionRun,
  attemptId: string,
  providerResult: ProviderEvaluation,
) {
  const evaluation = enforceEvaluationPolicy(
    providerResult.evaluation,
    claim.suggestionId,
  );
  return prisma.$transaction(async (tx) => {
    await assertCurrentLease(tx, claim);
    const decision = await tx.decision.create({
      data: {
        decisionRunId: claim.id,
        suggestionId: claim.suggestionId,
        decision: evaluation.decision.toUpperCase() as
          | "ACCEPT"
          | "REJECT"
          | "POSTPONE"
          | "MODIFY",
        confidence: evaluation.confidence,
        reasoningPublic: evaluation.reasoningPublic,
        rawResponse: evaluation as Prisma.InputJsonValue,
      },
    });

    await applyConfigAction(
      tx,
      evaluation,
      decision.id,
      claim.suggestionId,
    );
    await tx.suggestion.update({
      where: { id: claim.suggestionId },
      data: { status: decisionStatus(evaluation) },
    });
    await tx.thought.create({
      data: {
        content: evaluation.thought,
        eventType: evaluation.action ? "website_change" : "decision",
      },
    });
    if (evaluation.memory) {
      await tx.memory.create({
        data: {
          ...evaluation.memory,
          sourceRunId: claim.id,
          sourceDecisionId: decision.id,
        },
      });
    }

    const personalities = await tx.$queryRaw<
      Array<{
        id: string;
        curiosity: number;
        stubbornness: number;
        chaos: number;
        confidence: number;
        friendliness: number;
      }>
    >`
      SELECT "id", "curiosity", "stubbornness", "chaos", "confidence", "friendliness"
      FROM "Personality"
      WHERE "id" = 'personality'
      FOR UPDATE
    `;
    const personality = personalities[0];
    if (!personality) throw new Error("Todd's personality is unavailable.");
    const updatedPersonality = applyPersonalityDeltas(
      {
        curiosity: personality.curiosity,
        stubbornness: personality.stubbornness,
        chaos: personality.chaos,
        confidence: personality.confidence,
        friendliness: personality.friendliness,
      },
      evaluation.personalityDeltas,
    );
    await tx.personality.update({
      where: { id: personality.id },
      data: updatedPersonality,
    });

    await tx.toddActivity.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });
    await tx.toddActivity.create({
      data: {
        decisionRunId: claim.id,
        type: activityKind(evaluation.activity.type),
        reason: evaluation.thought,
        endsAt: new Date(Date.now() + evaluation.activity.durationSeconds * 1_000),
      },
    });
    await tx.toddState.update({
      where: { id: "todd" },
      data: {
        currentStatus: evaluation.activity.type,
        nextDecisionAt: new Date(
          Date.now() + evaluation.activity.durationSeconds * 1_000,
        ),
      },
    });

    await tx.outboxEvent.create({
      data: {
        decisionRunId: claim.id,
        type: "brain.decision.completed",
        dedupeKey: `decision:${claim.id}:completed`,
        payload: {
          runId: claim.id,
          decisionId: decision.id,
          suggestionId: claim.suggestionId,
          activity: evaluation.activity.type,
        },
      },
    });
    const metadata = providerResult.metadata;
    await tx.aiRun.update({
      where: { id: attemptId },
      data: {
        status: "SUCCEEDED",
        provider: metadata.provider,
        model: metadata.model,
        response: evaluation as Prisma.InputJsonValue,
        requestId: metadata.requestId,
        responseId: metadata.responseId,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        costKnown: metadata.costKnown,
        costMicros:
          metadata.costMicros === null ? null : BigInt(metadata.costMicros),
        latencyMs: metadata.latencyMs,
        completedAt: new Date(),
      },
    });
    await tx.decisionRun.update({
      where: { id: claim.id },
      data: {
        status: "SUCCEEDED",
        workerId: null,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    await tx.auditLog.create({
      data: {
        event: "DECISION_RUN_SUCCEEDED",
        actor: "todd",
        metadata: {
          runId: claim.id,
          decisionId: decision.id,
          suggestionId: claim.suggestionId,
          provider: metadata.provider,
          model: metadata.model,
        },
      },
    });
    return decision.id;
  });
}

async function recordFailure(
  prisma: PrismaClient,
  claim: ClaimedDecisionRun,
  attemptId: string | null,
  error: unknown,
  providerResult: ProviderEvaluation | null,
): Promise<"retrying" | "failed"> {
  const safe = safeError(error);
  return prisma.$transaction(async (tx) => {
    await assertCurrentLease(tx, claim);
    const terminal = claim.attemptCount >= claim.maxAttempts;
    const status: BrainRunStatus = terminal ? "FAILED" : "RETRYING";
    const backoffMs = Math.min(
      15 * 60_000,
      30_000 * 2 ** Math.max(0, claim.attemptCount - 1),
    );

    if (attemptId) {
      const metadata = providerResult?.metadata;
      await tx.aiRun.update({
        where: { id: attemptId },
        data: {
          status: providerResult ? "SUCCEEDED" : "FAILED",
          provider: metadata?.provider,
          model: metadata?.model,
          response: providerResult
            ? (providerResult.evaluation as Prisma.InputJsonValue)
            : undefined,
          requestId: metadata?.requestId,
          responseId: metadata?.responseId,
          inputTokens: metadata?.inputTokens,
          outputTokens: metadata?.outputTokens,
          costKnown: metadata?.costKnown ?? false,
          costMicros:
            metadata?.costMicros === null || metadata?.costMicros === undefined
              ? null
              : BigInt(metadata.costMicros),
          latencyMs: metadata?.latencyMs,
          error: safe.message,
          completedAt: new Date(),
        },
      });
    }
    await tx.decisionRun.update({
      where: { id: claim.id },
      data: {
        status,
        workerId: null,
        leaseToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: new Date(Date.now() + backoffMs),
        completedAt: terminal ? new Date() : null,
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
      },
    });
    if (terminal) {
      await tx.suggestion.update({
        where: { id: claim.suggestionId },
        data: { status: "PENDING" },
      });
    }
    await tx.auditLog.create({
      data: {
        event: terminal ? "DECISION_RUN_FAILED" : "DECISION_RUN_RETRYING",
        actor: "worker",
        success: false,
        metadata: {
          runId: claim.id,
          suggestionId: claim.suggestionId,
          attempt: claim.attemptCount,
          code: safe.code,
          providerCompleted: Boolean(providerResult),
        },
      },
    });
    return terminal ? "failed" : "retrying";
  });
}

export async function createFencedAiRun(
  prisma: PrismaClient,
  claim: ClaimedDecisionRun,
  request: Prisma.InputJsonValue,
) {
  return prisma.$transaction(async (tx) => {
    await assertCurrentLease(tx, claim);
    const details = request as Record<string, unknown>;
    return tx.aiRun.create({
      data: {
        decisionRunId: claim.id,
        attemptNumber: claim.attemptCount,
        operation: "evaluateSuggestion",
        status: "RUNNING",
        provider:
          typeof details.provider === "string" ? details.provider : "unknown",
        model: typeof details.model === "string" ? details.model : null,
        promptHash:
          claim.promptHash ??
          (typeof details.promptHash === "string" ? details.promptHash : null),
        request,
      },
    });
  });
}

export async function processNextDecisionRun({
  prisma,
  provider,
  workerId,
  leaseMs = 90_000,
}: {
  prisma: PrismaClient;
  provider: AiProvider;
  workerId: string;
  leaseMs?: number;
}): Promise<WorkerResult> {
  const claim = await claimDecisionRun(prisma, { workerId, leaseMs });
  if (!claim) return { status: "idle" };

  let attemptId: string | null = null;
  let providerResult: ProviderEvaluation | null = null;
  try {
    const context = claim.contextSnapshot
      ? (claim.contextSnapshot as unknown as EvaluationContext)
      : await loadEvaluationContext(prisma, claim.suggestionId);
    const contextHash = claim.contextHash ?? hashContext(context);
    const promptHash = claim.promptHash ?? hashPrompt(context);
    if (!claim.contextSnapshot) {
      await saveRunContext(prisma, {
        runId: claim.id,
        leaseToken: claim.leaseToken,
        context: context as unknown as Prisma.InputJsonValue,
        contextHash,
        promptHash,
      });
    }
    await heartbeatDecisionRun(prisma, {
      runId: claim.id,
      leaseToken: claim.leaseToken,
      leaseMs,
    });
    const attempt = await createFencedAiRun(prisma, claim, {
      suggestionId: claim.suggestionId,
      contextHash,
      promptHash,
      provider: provider.providerName,
      model: provider.modelName,
    });
    attemptId = attempt.id;

    providerResult = await provider.evaluateSuggestion(context, {
      idempotencyKey: `todd-decision:${claim.id}`,
    });
    const decisionId = await finalizeDecision(
      prisma,
      claim,
      attempt.id,
      providerResult,
    );
    return { status: "succeeded", runId: claim.id, decisionId };
  } catch (error) {
    if (error instanceof LeaseLostError) {
      return { status: "lease_lost", runId: claim.id };
    }
    try {
      const status = await recordFailure(
        prisma,
        claim,
        attemptId,
        error,
        providerResult,
      );
      return { status, runId: claim.id };
    } catch (failureError) {
      if (failureError instanceof LeaseLostError) {
        return { status: "lease_lost", runId: claim.id };
      }
      throw failureError;
    }
  }
}
