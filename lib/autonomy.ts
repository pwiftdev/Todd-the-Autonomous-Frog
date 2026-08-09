import { randomUUID } from "node:crypto";
import type { BrainRunTrigger } from "@prisma/client";

import { createAiProvider } from "@/lib/ai/provider";
import { getRuntimeConfig } from "@/lib/brain/runtime";
import { enqueueDecisionRun } from "@/lib/brain/store";
import { processNextDecisionRun } from "@/lib/brain/worker";
import { prisma } from "@/lib/prisma";

function requirePersistentRuntime() {
  const config = getRuntimeConfig();
  if (!config.databaseUrl) {
    throw new Error("Persistent brain operations require DATABASE_URL.");
  }
  return config;
}

export async function enqueueDecisionCycle({
  idempotencyKey,
  trigger,
}: {
  idempotencyKey: string;
  trigger: BrainRunTrigger;
}) {
  requirePersistentRuntime();
  const run = await enqueueDecisionRun(prisma, { idempotencyKey, trigger });
  return run
    ? {
        status: run.status.toLowerCase(),
        runId: run.id,
        suggestionId: run.suggestionId,
      }
    : { status: "idle" as const };
}

export async function runDecisionWorker(workerId?: string) {
  const config = requirePersistentRuntime();
  return processNextDecisionRun({
    prisma,
    provider: createAiProvider(config),
    workerId: workerId ?? `worker:${process.pid}:${randomUUID()}`,
  });
}

export async function getBrainState() {
  const config = requirePersistentRuntime();
  const [state, activity, currentThought, latestDecision] = await Promise.all([
    prisma.toddState.findUniqueOrThrow({ where: { id: "todd" } }),
    prisma.toddActivity.findFirst({
      where: { isCurrent: true, endsAt: { gt: new Date() } },
      orderBy: { startedAt: "desc" },
      select: {
        type: true,
        location: true,
        startedAt: true,
        endsAt: true,
      },
    }),
    prisma.thought.findFirst({
      orderBy: { createdAt: "desc" },
      select: { content: true, eventType: true, createdAt: true },
    }),
    prisma.decision.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        decision: true,
        confidence: true,
        reasoningPublic: true,
        createdAt: true,
        suggestion: { select: { text: true, category: true } },
      },
    }),
  ]);
  return {
    mode: config.mode,
    brainStatus: state.autonomyPaused
      ? "paused"
      : activity
        ? "working"
        : "idle",
    autonomyPaused: state.autonomyPaused,
    status: state.currentStatus,
    mood: state.currentMood,
    nextDecisionAt: state.nextDecisionAt,
    activity: activity
      ? { ...activity, type: activity.type.toLowerCase() }
      : null,
    currentThought,
    latestDecision: latestDecision
      ? {
          ...latestDecision,
          decision: latestDecision.decision.toLowerCase(),
          suggestion: {
            ...latestDecision.suggestion,
            category: latestDecision.suggestion.category.toLowerCase(),
          },
        }
      : null,
  };
}

export async function rollbackLatestConfig() {
  requirePersistentRuntime();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1 AS "locked"
      FROM pg_advisory_xact_lock(hashtextextended('site-config', 0))
    `;
    const current = await tx.siteConfig.findFirst({
      where: { isActive: true },
      include: { parentConfig: true },
      orderBy: { version: "desc" },
    });
    if (!current?.parentConfig) {
      throw new Error("There is no earlier config to restore.");
    }
    await tx.siteConfig.update({
      where: { id: current.id },
      data: { isActive: false },
    });
    await tx.siteConfig.update({
      where: { id: current.parentConfig.id },
      data: { isActive: true },
    });
    const latestAction = await tx.action.findFirst({
      where: { revertedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latestAction) {
      await tx.action.update({
        where: { id: latestAction.id },
        data: { revertedAt: new Date(), status: "REVERTED" },
      });
    }
    await tx.auditLog.create({
      data: {
        event: "SITE_CONFIG_ROLLED_BACK",
        actor: "admin",
        metadata: {
          from: current.version,
          to: current.parentConfig.version,
          fromId: current.id,
          toId: current.parentConfig.id,
        },
      },
    });
  });
}
