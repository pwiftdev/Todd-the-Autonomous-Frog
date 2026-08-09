import { prisma } from "@/lib/prisma";
import { defaultToddData } from "@/lib/default-data";
import { getRuntimeConfig } from "@/lib/brain/runtime";
import type { SiteConfigData, ToddData } from "@/lib/types";

export class ToddDataUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Todd's live data is unavailable.", options);
    this.name = "ToddDataUnavailableError";
  }
}

function syntheticToddData(mode: "demo" | "test"): ToddData {
  return {
    ...defaultToddData,
    provenance: {
      mode,
      synthetic: true,
      label: "Demo data — not live Todd activity",
    },
  };
}

export function dataProvenanceForMode(
  mode: "demo" | "live" | "test",
): ToddData["provenance"] {
  if (mode === "live") {
    return {
      mode,
      synthetic: false,
      label: "Live PostgreSQL data",
    };
  }
  return {
    mode,
    synthetic: true,
    label: "Demo data — not live Todd activity",
  };
}

export async function getToddData(): Promise<ToddData> {
  const runtime = getRuntimeConfig();
  if (!runtime.databaseUrl) {
    return syntheticToddData(runtime.mode as "demo" | "test");
  }
  try {
    const [
      config,
      suggestions,
      thoughts,
      actions,
      socialPosts,
      personality,
      state,
      decisionCount,
    ] = await Promise.all([
      prisma.siteConfig.findFirst({
        where: { isActive: true },
        orderBy: { version: "desc" },
      }),
      prisma.suggestion.findMany({
        take: 12,
        orderBy: [{ supportCount: "desc" }, { createdAt: "desc" }],
        include: { decisions: { take: 1, orderBy: { createdAt: "desc" } } },
      }),
      prisma.thought.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      prisma.action.findMany({
        where: { revertedAt: null },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { suggestion: true },
      }),
      prisma.socialPost.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
      prisma.personality.findUnique({ where: { id: "personality" } }),
      prisma.toddState.findUnique({ where: { id: "todd" } }),
      prisma.decision.count(),
    ]);

    if (!config || !personality || !state) {
      throw new ToddDataUnavailableError();
    }
    const accepted = suggestions.filter((item) =>
      ["ACCEPTED", "MODIFIED", "IMPLEMENTED"].includes(item.status),
    ).length;

    return {
      provenance: dataProvenanceForMode(runtime.mode),
      config: {
        ...config,
        enabledSections: config.enabledSections as string[],
      } as SiteConfigData,
      suggestions: suggestions.map((item) => ({
        ...item,
        decision: item.decisions[0] ?? null,
      })),
      thoughts,
      changes: actions.map((action) => ({
        id: action.id,
        actionType: action.type,
        previousValue: action.previousValue,
        newValue: action.newValue,
        reasoning: action.reasoning,
        sourceName: action.suggestion?.displayName ?? "Todd",
        createdAt: action.createdAt,
      })),
      socialPosts,
      personality: {
        curiosity: personality.curiosity,
        stubbornness: personality.stubbornness,
        chaos: personality.chaos,
        confidence: personality.confidence,
        friendliness: personality.friendliness,
      },
      stats: {
        decisions: decisionCount,
        reviewed: decisionCount,
        accepted,
        changes: actions.length,
        posts: socialPosts.length,
      },
      autonomyPaused: state.autonomyPaused,
    };
  } catch (error) {
    if (runtime.mode === "demo" || runtime.mode === "test") {
      return syntheticToddData(runtime.mode);
    }
    if (error instanceof ToddDataUnavailableError) throw error;
    throw new ToddDataUnavailableError({ cause: error });
  }
}
