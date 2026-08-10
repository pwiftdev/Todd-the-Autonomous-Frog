import { getActiveToddActivity } from "@/lib/activity";
import { assertLiveDatabase, getAppMode, hasDatabase } from "@/lib/config";
import { defaultToddData } from "@/lib/default-data";
import { prisma } from "@/lib/prisma";
import type { SiteConfigData, ToddData } from "@/lib/types";

function dayNumberFrom(createdAt: Date) {
  const ms = Date.now() - createdAt.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export async function getToddData(): Promise<ToddData> {
  assertLiveDatabase();
  const mode = getAppMode();

  if (!hasDatabase()) {
    if (mode === "live") {
      throw new Error("Live mode requires DATABASE_URL.");
    }
    // Demo-only empty Day 0 shell — no fabricated community history.
    return defaultToddData;
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
      acceptedCount,
      actionCount,
      postCount,
      activity,
    ] = await Promise.all([
      prisma.siteConfig.findFirst({
        where: { isActive: true },
        orderBy: { version: "desc" },
      }),
      prisma.suggestion.findMany({
        take: 20,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
      prisma.suggestion.count({
        where: { status: { in: ["ACCEPTED", "MODIFIED", "IMPLEMENTED"] } },
      }),
      prisma.action.count({ where: { revertedAt: null } }),
      prisma.socialPost.count(),
      getActiveToddActivity(),
    ]);

    if (!config || !personality || !state) {
      if (mode === "live") {
        throw new Error(
          "Live database is missing Todd foundation data. Run npm run db:seed:genesis.",
        );
      }
      return defaultToddData;
    }

    const dayNumber = dayNumberFrom(state.createdAt);
    const announcement =
      config.announcement ??
      (dayNumber === 0
        ? "DAY 0 · BIRTH"
        : `DAY ${dayNumber} · AUTONOMY ONLINE`);

    return {
      mode,
      dayNumber,
      createdAt: state.createdAt,
      currentActivity: activity
        ? {
            activityId: activity.activityId,
            room: activity.room,
            label: activity.label,
            reason: activity.reason,
            startAt: activity.startAt,
            endAt: activity.endAt,
          }
        : null,
      config: {
        ...config,
        announcement,
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
        accepted: acceptedCount,
        changes: actionCount,
        posts: postCount,
      },
      autonomyPaused: state.autonomyPaused,
    };
  } catch (error) {
    // Live must never silently substitute fabricated history.
    if (mode === "live") throw error;
    return defaultToddData;
  }
}
