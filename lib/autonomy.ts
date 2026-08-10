import { Prisma } from "@prisma/client";
import { aiProvider } from "@/lib/ai/provider";
import {
  enqueueOutbox,
  getActiveToddActivity,
  resolveWorldActivity,
  setToddActivity,
} from "@/lib/activity";
import { applyPersonalityDeltas, retrieveRelevantMemories } from "@/lib/memory";
import { prisma } from "@/lib/prisma";
import { socialProvider } from "@/lib/social/provider";
import type { SiteConfigData } from "@/lib/types";
import { assertWithinTokenBudget, recordAiUsage } from "@/lib/usage";
import { getMaxSocialPostsPerDay } from "@/lib/config";
import { toddVoice } from "@/lib/todd-personality";
import { evaluationSchema, normalizeEvaluation, type Evaluation } from "@/lib/validation";

const allowedValues: Partial<Record<keyof SiteConfigData, readonly string[]>> =
  {
    theme: ["classic_swamp", "midnight_swamp", "misty_pond"],
    accent: ["lime", "amber", "mint"],
    frogMood: ["calm", "suspicious", "pleased", "plotting"],
    frogAccessory: ["none", "crown", "lily"],
  };

function validateConfigValue(key: keyof SiteConfigData, value: string | null) {
  const choices = allowedValues[key];
  if (choices && (value === null || !choices.includes(value)))
    throw new Error(`Value is not allowed for ${key}`);
  if (
    ["heroTitle", "heroSubtitle", "ctaCopy", "statusText"].includes(key) &&
    !value
  )
    throw new Error(`${key} cannot be empty`);
}

async function applyConfigAction(
  evaluation: Evaluation,
  decisionId: string,
  suggestionId: string,
) {
  if (!evaluation.action) return;
  const { key, value } = evaluation.action.payload;
  validateConfigValue(key, value);

  await prisma.$transaction(async (tx) => {
    const current = await tx.siteConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });
    if (!current) throw new Error("No active site config exists");
    const previousValue = current[key as keyof typeof current];
    await tx.siteConfig.update({
      where: { id: current.id },
      data: { isActive: false },
    });
    await tx.siteConfig.create({
      data: {
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
        version: current.version + 1,
        isActive: true,
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
        newValue: value === null ? Prisma.JsonNull : value,
        reasoning: evaluation.reasoningPublic,
      },
    });
    await tx.auditLog.create({
      data: {
        event: "SITE_CONFIG_UPDATED",
        actor: "todd",
        metadata: { key, previousValue, value, decisionId },
      },
    });
  });

  await enqueueOutbox("config.updated", {
    key,
    value,
    decisionId,
  });
}

export async function runDecisionCycle() {
  if (!process.env.DATABASE_URL) {
    return { message: "Database unavailable. Decision cycle skipped." };
  }
  await assertWithinTokenBudget();

  const suggestion = await prisma.suggestion.findFirst({
    where: { status: "PENDING" },
    orderBy: [{ supportCount: "desc" }, { createdAt: "asc" }],
  });
  if (!suggestion)
    return {
      message: "No pending suggestions. Todd stared at the pond instead.",
    };

  const [state, personality, config, memories] = await Promise.all([
    prisma.toddState.findUnique({ where: { id: "todd" } }),
    prisma.personality.findUniqueOrThrow({ where: { id: "personality" } }),
    prisma.siteConfig.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { version: "desc" },
    }),
    retrieveRelevantMemories({
      category: suggestion.category,
      suggestionText: suggestion.text,
    }),
  ]);
  if (state?.autonomyPaused) throw new Error("Todd's autonomy is paused.");

  await prisma.suggestion.update({
    where: { id: suggestion.id },
    data: { status: "CONSIDERING" },
  });

  const request = {
    suggestion: {
      id: suggestion.id,
      text: suggestion.text,
      category: suggestion.category,
      supportCount: suggestion.supportCount,
    },
    personality: {
      curiosity: personality.curiosity,
      stubbornness: personality.stubbornness,
      chaos: personality.chaos,
      confidence: personality.confidence,
      friendliness: personality.friendliness,
    },
    config: {
      theme: config.theme,
      accent: config.accent,
      heroTitle: config.heroTitle,
      heroSubtitle: config.heroSubtitle,
      ctaCopy: config.ctaCopy,
      announcement: config.announcement,
      statusText: config.statusText,
      frogMood: config.frogMood,
      frogAccessory: config.frogAccessory,
      enabledSections: config.enabledSections as string[],
    } as SiteConfigData,
    memories,
  };

  const run = await prisma.aiRun.create({
    data: { operation: "evaluateSuggestion", request },
  });

  try {
    const ai = await aiProvider.evaluateSuggestion(request);
    const evaluation = normalizeEvaluation(evaluationSchema.parse(ai.value));
    evaluation.reasoningPublic = toddVoice(evaluation.reasoningPublic);
    if (evaluation.thought) evaluation.thought = toddVoice(evaluation.thought);
    if (evaluation.memoryToStore) {
      evaluation.memoryToStore = toddVoice(evaluation.memoryToStore, 500);
    }
    await prisma.aiRun.update({
      where: { id: run.id },
      data: {
        response: evaluation,
        model: ai.usage?.model,
        inputTokens: ai.usage?.inputTokens,
        outputTokens: ai.usage?.outputTokens,
        latencyMs: ai.usage?.latencyMs,
      },
    });
    await recordAiUsage({
      operation: "evaluateSuggestion",
      usage: ai.usage,
      aiRunId: run.id,
    });

    const status = {
      accept: "ACCEPTED",
      reject: "REJECTED",
      postpone: "PENDING",
      modify: "MODIFIED",
    }[evaluation.decision] as
      | "ACCEPTED"
      | "REJECTED"
      | "PENDING"
      | "MODIFIED";

    const decision = await prisma.decision.create({
      data: {
        suggestionId: suggestion.id,
        decision: evaluation.decision.toUpperCase() as
          | "ACCEPT"
          | "REJECT"
          | "POSTPONE"
          | "MODIFY",
        confidence: evaluation.confidence,
        reasoningPublic: evaluation.reasoningPublic,
        rawResponse: evaluation,
      },
    });

    await applyConfigAction(evaluation, decision.id, suggestion.id);
    await applyPersonalityDeltas(evaluation.personalityDeltas);

    const thoughtContent =
      evaluation.thought?.trim() || evaluation.reasoningPublic;
    const thought = await prisma.thought.create({
      data: {
        content: thoughtContent,
        eventType: evaluation.action ? "website_change" : "decision",
      },
    });

    await prisma.$transaction([
      prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: evaluation.action ? "IMPLEMENTED" : status },
      }),
      ...(evaluation.memoryToStore
        ? [
            prisma.memory.create({
              data: {
                type: evaluation.memoryType ?? "decision",
                content: evaluation.memoryToStore,
                importance: evaluation.memoryImportance ?? 65,
              },
            }),
          ]
        : []),
    ]);

    const activityId =
      (evaluation.activityId &&
        resolveWorldActivity(evaluation.activityId)?.id) ||
      (evaluation.action ? "change_website" : "make_decision");
    await setToddActivity({
      activityId,
      reason: evaluation.reasoningPublic,
      thoughtId: thought.id,
    });

    await enqueueOutbox("decision.made", {
      suggestionId: suggestion.id,
      decision: evaluation.decision,
      reasoningPublic: evaluation.reasoningPublic,
    });

    if (["accept", "modify"].includes(evaluation.decision)) {
      await enqueueOutbox("social.consider", {
        event: evaluation.reasoningPublic,
        suggestionId: suggestion.id,
      });
    }

    await prisma.toddState.update({
      where: { id: "todd" },
      data: {
        nextDecisionAt: new Date(Date.now() + 5 * 60_000),
        currentMood: config.frogMood,
      },
    });

    return { message: evaluation.reasoningPublic, decisionId: decision.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown evaluation error";
    await prisma.$transaction([
      prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: "PENDING" },
      }),
      prisma.aiRun.update({ where: { id: run.id }, data: { error: message } }),
      prisma.auditLog.create({
        data: {
          event: "DECISION_FAILED",
          actor: "todd",
          success: false,
          metadata: { suggestionId: suggestion.id, error: message },
        },
      }),
    ]);
    throw error;
  }
}

export async function runObservationCycle() {
  if (!process.env.DATABASE_URL) {
    return { message: "Database unavailable." };
  }
  await assertWithinTokenBudget();
  const state = await prisma.toddState.findUnique({ where: { id: "todd" } });
  if (state?.autonomyPaused) throw new Error("Todd's autonomy is paused.");

  const pending = await prisma.suggestion.count({
    where: { status: "PENDING" },
  });
  const event =
    pending > 0
      ? `${pending} suggestions waiting in the pond`
      : "the swamp is quiet and under control";

  const run = await prisma.aiRun.create({
    data: { operation: "generateThought", request: { event } },
  });
  try {
    const ai = await aiProvider.generateThought(event);
    const thoughtText = toddVoice(ai.value);
    await prisma.aiRun.update({
      where: { id: run.id },
      data: {
        response: { thought: ai.value },
        model: ai.usage?.model,
        inputTokens: ai.usage?.inputTokens,
        outputTokens: ai.usage?.outputTokens,
        latencyMs: ai.usage?.latencyMs,
      },
    });
    await recordAiUsage({
      operation: "generateThought",
      usage: ai.usage,
      aiRunId: run.id,
    });

    const thought = await prisma.thought.create({
      data: { content: thoughtText, eventType: "observation" },
    });
    await setToddActivity({
      activityId: "deep_thought",
      reason: thoughtText,
      thoughtId: thought.id,
    });
    await prisma.toddState.update({
      where: { id: "todd" },
      data: { lastObservationAt: new Date() },
    });
    await enqueueOutbox("thought.created", {
      id: thought.id,
      content: thought.content,
    });
    return { message: thoughtText };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Observation failed";
    await prisma.aiRun.update({ where: { id: run.id }, data: { error: message } });
    throw error;
  }
}

export async function runSocialCycle(forcedEvent?: string) {
  if (!process.env.DATABASE_URL) {
    return { message: "Database unavailable." };
  }
  const state = await prisma.toddState.findUnique({ where: { id: "todd" } });
  if (state?.autonomyPaused) throw new Error("Todd's autonomy is paused.");

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const postedToday = await prisma.socialPost.count({
    where: { createdAt: { gte: start } },
  });
  if (postedToday >= getMaxSocialPostsPerDay()) {
    return { message: "Social quota reached for today." };
  }

  const style = await prisma.socialStyle.findUnique({
    where: { id: "social-style" },
  });
  const latest =
    forcedEvent ??
    (
      await prisma.thought.findFirst({
        orderBy: { createdAt: "desc" },
      })
    )?.content ??
    "The pond is quiet.";

  const run = await prisma.aiRun.create({
    data: {
      operation: "generateSocialPost",
      request: { event: latest, style },
    },
  });

  try {
    const ai = await aiProvider.generateSocialPost(latest);
    const content = toddVoice(ai.value, style?.maxLength ?? 160);

    await prisma.aiRun.update({
      where: { id: run.id },
      data: {
        response: { content },
        model: ai.usage?.model,
        inputTokens: ai.usage?.inputTokens,
        outputTokens: ai.usage?.outputTokens,
        latencyMs: ai.usage?.latencyMs,
      },
    });
    await recordAiUsage({
      operation: "generateSocialPost",
      usage: ai.usage,
      aiRunId: run.id,
    });

    const posted = await socialProvider.post(content);
    await prisma.socialPost.create({
      data: {
        content,
        provider: process.env.SOCIAL_PROVIDER ?? "mock",
        externalId: posted.id,
        status: process.env.X_LIVE === "1" ? "POSTED" : "POSTED",
      },
    });
    await setToddActivity({
      activityId: "write_social_post",
      reason: content,
    });
    await prisma.toddState.update({
      where: { id: "todd" },
      data: { lastSocialAt: new Date() },
    });
    await enqueueOutbox("social.posted", { content, externalId: posted.id });
    return { message: content };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Social cycle failed";
    await prisma.aiRun.update({ where: { id: run.id }, data: { error: message } });
    await prisma.auditLog.create({
      data: {
        event: "SOCIAL_FAILED",
        actor: "todd",
        success: false,
        metadata: { error: message },
      },
    });
    // Social failure must not undo prior decisions.
    return { message: `Social delivery failed: ${message}` };
  }
}

export async function runDailyReflection() {
  if (!process.env.DATABASE_URL) {
    return { message: "Database unavailable." };
  }
  await assertWithinTokenBudget();
  const state = await prisma.toddState.findUnique({ where: { id: "todd" } });
  if (state?.autonomyPaused) throw new Error("Todd's autonomy is paused.");

  const [decisions, thoughts, memories] = await Promise.all([
    prisma.decision.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
    prisma.thought.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    prisma.memory.findMany({
      take: 8,
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const summary = JSON.stringify({
    decisions: decisions.map((d) => d.reasoningPublic),
    thoughts: thoughts.map((t) => t.content),
    memories: memories.map((m) => m.content),
  }).slice(0, 4000);

  const run = await prisma.aiRun.create({
    data: { operation: "generateReflection", request: { summary } },
  });

  const fallback = {
    journal: toddVoice(
      `reviewed ${decisions.length} decisions. still a frog. pond ok.`,
      800,
    ),
    thought: toddVoice("day was mid. im still him"),
    personalityDeltas: {
      curiosity: 1,
      stubbornness: 0,
      chaos: 0,
      confidence: 0,
      friendliness: 0,
    },
  };

  try {
    const ai = aiProvider.generateReflection
      ? await aiProvider.generateReflection(summary)
      : { value: fallback, usage: undefined };
    const value = {
      journal: toddVoice(ai.value.journal, 800),
      thought: toddVoice(ai.value.thought),
      personalityDeltas: ai.value.personalityDeltas,
    };
    await prisma.aiRun.update({
      where: { id: run.id },
      data: {
        response: value,
        model: ai.usage?.model,
        inputTokens: ai.usage?.inputTokens,
        outputTokens: ai.usage?.outputTokens,
        latencyMs: ai.usage?.latencyMs,
      },
    });
    await recordAiUsage({
      operation: "generateReflection",
      usage: ai.usage,
      aiRunId: run.id,
    });
    await prisma.dailyJournal.create({ data: { content: value.journal } });
    const thought = await prisma.thought.create({
      data: { content: value.thought, eventType: "reflection" },
    });
    await applyPersonalityDeltas(value.personalityDeltas);
    await setToddActivity({
      activityId: "night_journal",
      reason: value.thought,
      thoughtId: thought.id,
    });
    await prisma.toddState.update({
      where: { id: "todd" },
      data: { lastReflectionAt: new Date() },
    });
    return { message: value.thought };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reflection failed";
    await prisma.aiRun.update({ where: { id: run.id }, data: { error: message } });
    throw error;
  }
}

export async function runMemoryMaintenance() {
  if (!process.env.DATABASE_URL) {
    return { message: "Database unavailable." };
  }
  const memories = await prisma.memory.findMany({
    orderBy: { createdAt: "asc" },
  });
  let decayed = 0;
  for (const memory of memories) {
    if (memory.importance <= 20) continue;
    const ageDays =
      (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 3) continue;
    await prisma.memory.update({
      where: { id: memory.id },
      data: { importance: Math.max(10, memory.importance - 1) },
    });
    decayed += 1;
  }
  return { message: `Decayed ${decayed} memories.` };
}

export async function ensureRoomActivity() {
  if (!process.env.DATABASE_URL) return { message: "Database unavailable." };
  const active = await getActiveToddActivity();
  if (active) return { message: `Active: ${active.activityId}` };
  await setToddActivity({
    activityId: "deep_thought",
    reason: "No active plan. Contemplating the pond.",
  });
  return { message: "Started deep_thought" };
}

export async function rollbackLatestConfig() {
  await prisma.$transaction(async (tx) => {
    const versions = await tx.siteConfig.findMany({
      take: 2,
      orderBy: { version: "desc" },
    });
    if (versions.length < 2)
      throw new Error("There is no earlier config to restore.");
    await tx.siteConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.siteConfig.update({
      where: { id: versions[1].id },
      data: { isActive: true },
    });
    const latestAction = await tx.action.findFirst({
      where: { revertedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latestAction)
      await tx.action.update({
        where: { id: latestAction.id },
        data: { revertedAt: new Date() },
      });
    await tx.auditLog.create({
      data: {
        event: "SITE_CONFIG_ROLLED_BACK",
        actor: "admin",
        metadata: { from: versions[0].version, to: versions[1].version },
      },
    });
  });
  await enqueueOutbox("config.rolled_back", { at: new Date().toISOString() });
}
