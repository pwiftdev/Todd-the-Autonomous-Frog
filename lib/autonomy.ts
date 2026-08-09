import { Prisma } from "@prisma/client";
import { aiProvider } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { socialProvider } from "@/lib/social/provider";
import type { SiteConfigData } from "@/lib/types";
import { evaluationSchema, type Evaluation } from "@/lib/validation";

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
}

export async function runDecisionCycle() {
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
    prisma.memory.findMany({
      take: 8,
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
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
    memories: memories.map((item) => item.content),
  };
  const run = await prisma.aiRun.create({
    data: { operation: "evaluateSuggestion", request },
  });
  try {
    const evaluation = evaluationSchema.parse(
      await aiProvider.evaluateSuggestion(request),
    );
    const status = {
      accept: "ACCEPTED",
      reject: "REJECTED",
      postpone: "PENDING",
      modify: "MODIFIED",
    }[evaluation.decision] as "ACCEPTED" | "REJECTED" | "PENDING" | "MODIFIED";
    const decision = await prisma.decision.create({
      data: {
        suggestionId: suggestion.id,
        decision: evaluation.decision.toUpperCase() as
          "ACCEPT" | "REJECT" | "POSTPONE" | "MODIFY",
        confidence: evaluation.confidence,
        reasoningPublic: evaluation.reasoningPublic,
        rawResponse: evaluation,
      },
    });
    await applyConfigAction(evaluation, decision.id, suggestion.id);
    await prisma.$transaction([
      prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: evaluation.action ? "IMPLEMENTED" : status },
      }),
      prisma.thought.create({
        data: {
          content: evaluation.reasoningPublic,
          eventType: evaluation.action ? "website_change" : "decision",
        },
      }),
      ...(evaluation.memoryToStore
        ? [
            prisma.memory.create({
              data: {
                type: "decision",
                content: evaluation.memoryToStore,
                importance: 65,
              },
            }),
          ]
        : []),
      prisma.aiRun.update({
        where: { id: run.id },
        data: { response: evaluation },
      }),
    ]);
    return { message: evaluation.reasoningPublic };
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

export async function runSocialCycle() {
  const latest = await prisma.thought.findFirst({
    orderBy: { createdAt: "desc" },
  });
  const content = await aiProvider.generateSocialPost(
    latest?.content ?? "The pond is quiet.",
  );
  const posted = await socialProvider.post(content);
  await prisma.socialPost.create({
    data: {
      content,
      provider: process.env.SOCIAL_PROVIDER ?? "mock",
      externalId: posted.id,
    },
  });
  return { message: content };
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
}
