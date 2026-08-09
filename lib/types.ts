export type SuggestionStatus =
  | "PENDING"
  | "CONSIDERING"
  | "ACCEPTED"
  | "REJECTED"
  | "MODIFIED"
  | "IMPLEMENTED";
export type SuggestionCategory =
  "WEBSITE" | "PERSONALITY" | "SOCIAL" | "APPEARANCE" | "FEATURE" | "OTHER";

export type SiteConfigData = {
  theme: "classic_swamp" | "midnight_swamp" | "misty_pond";
  accent: "lime" | "amber" | "mint";
  heroTitle: string;
  heroSubtitle: string;
  ctaCopy: string;
  announcement: string | null;
  statusText: string;
  frogMood: "calm" | "suspicious" | "pleased" | "plotting";
  frogAccessory: "none" | "crown" | "lily";
  enabledSections: string[];
};

export type PublicSuggestion = {
  id: string;
  text: string;
  category: SuggestionCategory;
  displayName: string;
  status: SuggestionStatus;
  supportCount: number;
  createdAt: Date;
  decision?: {
    reasoningPublic: string;
    confidence: number;
    decision: string;
  } | null;
};

export type ToddData = {
  config: SiteConfigData;
  suggestions: PublicSuggestion[];
  thoughts: Array<{
    id: string;
    content: string;
    eventType: string;
    createdAt: Date;
  }>;
  changes: Array<{
    id: string;
    actionType: string;
    previousValue: unknown;
    newValue: unknown;
    reasoning: string;
    sourceName: string;
    createdAt: Date;
  }>;
  socialPosts: Array<{ id: string; content: string; createdAt: Date }>;
  personality: Record<string, number>;
  stats: {
    decisions: number;
    reviewed: number;
    accepted: number;
    changes: number;
    posts: number;
  };
  autonomyPaused: boolean;
};
