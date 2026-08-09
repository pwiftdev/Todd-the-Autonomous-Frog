import type { SiteConfigData } from "@/lib/types";
import type { Evaluation } from "@/lib/validation";

export type EvaluationContext = {
  suggestion: {
    id: string;
    text: string;
    category: string;
    supportCount: number;
  };
  personality: Record<string, number>;
  config: SiteConfigData;
  memories: string[];
};

export interface AiProvider {
  evaluateSuggestion(context: EvaluationContext): Promise<Evaluation>;
  generateThought(event: string): Promise<string>;
  generateSocialPost(event: string): Promise<string>;
}

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

export class MockAiProvider implements AiProvider {
  async evaluateSuggestion({
    suggestion,
  }: EvaluationContext): Promise<Evaluation> {
    const text = suggestion.text.toLowerCase();
    const base = {
      suggestionId: suggestion.id,
      confidence: 0.88,
      memoryToStore: null,
    };

    if (
      includesAny(text, [
        "comic sans",
        "give me control",
        "password",
        "script",
        "javascript",
      ])
    ) {
      return {
        ...base,
        decision: "reject",
        confidence: 0.99,
        reasoningPublic: "I considered it. It was stupid. Rejected.",
        action: null,
      };
    }
    if (includesAny(text, ["dark", "night", "midnight"])) {
      return {
        ...base,
        decision: "accept",
        reasoningPublic: "The sun was becoming irritating.",
        action: {
          type: "site_config_update",
          payload: { key: "theme", value: "midnight_swamp" },
        },
        memoryToStore: "Todd prefers darker swamp conditions.",
      };
    }
    if (includesAny(text, ["crown", "king"])) {
      return {
        ...base,
        decision: "accept",
        reasoningPublic: `${suggestion.supportCount || "Several"} humans support this. Compelling evidence.`,
        action: {
          type: "site_config_update",
          payload: { key: "frogAccessory", value: "crown" },
        },
        memoryToStore: "Todd has accepted the crown as appropriate attire.",
      };
    }
    if (includesAny(text, ["neon", "every button", "all green"])) {
      return {
        ...base,
        decision: "modify",
        reasoningPublic: "Most of them. Not all. I have standards.",
        action: {
          type: "site_config_update",
          payload: { key: "accent", value: "lime" },
        },
        memoryToStore: "Todd tolerates green accents, not green excess.",
      };
    }
    if (includesAny(text, ["happy", "smile", "friendly"])) {
      return {
        ...base,
        decision: "modify",
        reasoningPublic: "I will look pleased. Briefly.",
        action: {
          type: "site_config_update",
          payload: { key: "frogMood", value: "pleased" },
        },
        memoryToStore: "Todd briefly experimented with appearing approachable.",
      };
    }
    return {
      ...base,
      decision: "reject",
      confidence: 0.74,
      reasoningPublic: "Interesting pressure. Insufficient argument.",
      action: null,
    };
  }

  async generateThought(event: string) {
    return `I have reviewed the situation: ${event.toLowerCase()}. The pond remains under control.`;
  }

  async generateSocialPost(event: string) {
    return `${event.slice(0, 130)}\n\nI decided correctly.`;
  }
}

export const aiProvider: AiProvider = new MockAiProvider();
