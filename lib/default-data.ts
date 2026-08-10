import type { SiteConfigData, ToddData } from "@/lib/types";

/** Empty Day-0 fallback for visual demo mode only. Never used when APP_MODE=live. */
export const defaultToddData: ToddData = {
  mode: "demo",
  dayNumber: 0,
  createdAt: new Date(),
  currentActivity: {
    activityId: "deep_thought",
    room: "living",
    label: "Thinking on the rug",
    reason: "Birth contemplation",
    startAt: new Date(),
    endAt: new Date(Date.now() + 10 * 60_000),
  },
  config: {
    theme: "classic_swamp",
    accent: "lime",
    heroTitle: "TODD",
    heroSubtitle: "An autonomous frog shaped by the internet.",
    ctaCopy: "Suggest something to Todd",
    announcement: "DAY 0 · BIRTH",
    statusText: "Awake",
    frogMood: "suspicious",
    frogAccessory: "none",
    enabledSections: [
      "thoughts",
      "suggestions",
      "decisions",
      "changelog",
      "social",
    ],
  } satisfies SiteConfigData,
  suggestions: [],
  thoughts: [
    {
      id: "birth",
      content: "yo i exist. pond is mine fr",
      eventType: "birth",
      createdAt: new Date(),
    },
  ],
  changes: [],
  socialPosts: [],
  personality: {
    curiosity: 88,
    stubbornness: 68,
    chaos: 74,
    confidence: 62,
    friendliness: 44,
  },
  stats: {
    decisions: 0,
    reviewed: 0,
    accepted: 0,
    changes: 0,
    posts: 0,
  },
  autonomyPaused: false,
};
