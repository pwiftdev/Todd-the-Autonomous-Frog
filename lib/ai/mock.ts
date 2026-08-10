import type { EvaluationContext } from "@/lib/ai/provider";
import type { AiProvider, AiResult } from "@/lib/ai/provider";
import { toddVoice } from "@/lib/todd-personality";
import type { Evaluation } from "@/lib/validation";

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

export class MockAiProvider implements AiProvider {
  async evaluateSuggestion({
    suggestion,
  }: EvaluationContext): Promise<AiResult<Evaluation>> {
    const text = suggestion.text.toLowerCase();
    const base = {
      suggestionId: suggestion.id,
      confidence: 0.72,
      memoryToStore: null as string | null,
      memoryType: "decision" as const,
      memoryImportance: 65,
      personalityDeltas: {
        curiosity: 0,
        stubbornness: 0,
        chaos: 0,
        confidence: 0,
        friendliness: 0,
      },
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
        value: {
          ...base,
          decision: "reject",
          confidence: 0.96,
          reasoningPublic: toddVoice("nah thats sus. not happening bro"),
          action: null,
          activityId: "deep_thought",
          thought: toddVoice("someone tried something weird. i said no"),
          personalityDeltas: { ...base.personalityDeltas, stubbornness: 1 },
        },
      };
    }
    if (includesAny(text, ["dark", "night", "midnight"])) {
      return {
        value: {
          ...base,
          decision: "accept",
          reasoningPublic: toddVoice("ok dark mode goes hard. flipping it"),
          action: {
            type: "site_config_update",
            payload: { key: "theme", value: "midnight_swamp" },
          },
          memoryToStore: toddVoice("dark swamp looks cooler. remember that"),
          memoryType: "preference",
          activityId: "review_suggestions",
          thought: toddVoice("made it darker. feel smarter already"),
        },
      };
    }
    if (includesAny(text, ["crown", "king"])) {
      return {
        value: {
          ...base,
          decision: "accept",
          reasoningPublic: toddVoice(
            `${suggestion.supportCount || "a bunch of"} humans said crown. fine i guess`,
          ),
          action: {
            type: "site_config_update",
            payload: { key: "frogAccessory", value: "crown" },
          },
          memoryToStore: toddVoice("crown is kinda fire on a frog"),
          memoryType: "website",
          memoryImportance: 80,
          activityId: "polish_crown",
          thought: toddVoice("crown on. look at me"),
          personalityDeltas: { ...base.personalityDeltas, confidence: 1 },
        },
      };
    }
    if (includesAny(text, ["neon", "every button", "all green"])) {
      return {
        value: {
          ...base,
          decision: "modify",
          reasoningPublic: toddVoice("ok some green. not all green. im not insane"),
          action: {
            type: "site_config_update",
            payload: { key: "accent", value: "lime" },
          },
          memoryToStore: toddVoice("too much green is mid. little green is ok"),
          memoryType: "preference",
          activityId: "change_website",
          thought: toddVoice("compromised. still winning"),
        },
      };
    }
    if (includesAny(text, ["happy", "smile", "friendly"])) {
      return {
        value: {
          ...base,
          decision: "modify",
          reasoningPublic: toddVoice("i can look nice for like 2 seconds"),
          action: {
            type: "site_config_update",
            payload: { key: "frogMood", value: "pleased" },
          },
          memoryToStore: toddVoice("tried smiling. weird but ok"),
          activityId: "pond_relax",
          thought: toddVoice("forced a smile. exhausting"),
          personalityDeltas: { ...base.personalityDeltas, friendliness: 1 },
        },
      };
    }
    if (includesAny(text, ["exercise", "gym", "workout", "weights"])) {
      return {
        value: {
          ...base,
          decision: "reject",
          confidence: 0.8,
          reasoningPublic: toddVoice("bro im a frog not a gym bro. sit down"),
          action: null,
          activityId: "quit_workout",
          thought: toddVoice("they want me to exercise. absolute comedy"),
          personalityDeltas: { ...base.personalityDeltas, chaos: 1 },
        },
      };
    }
    return {
      value: {
        ...base,
        decision: "reject",
        confidence: 0.61,
        reasoningPublic: toddVoice("idk man. sounds mid. not doing that"),
        action: null,
        activityId: "review_suggestions",
        thought: toddVoice("brain empty. rejected for vibes"),
        personalityDeltas: { ...base.personalityDeltas, stubbornness: 1 },
      },
    };
  }

  async generateThought(event: string): Promise<AiResult<string>> {
    return {
      value: toddVoice(`hmm ${event.toLowerCase()}. pond still mine tho`),
    };
  }

  async generateSocialPost(event: string): Promise<AiResult<string>> {
    return {
      value: toddVoice(`${event.slice(0, 100)}. i cooked. or maybe not. idk`),
    };
  }

  async generateReflection(summary: string) {
    return {
      value: {
        journal: toddVoice(`day notes: ${summary.slice(0, 240)}. learned a tiny bit. still a frog`),
        thought: toddVoice("day was weird. im still him"),
        personalityDeltas: {
          curiosity: 1,
          stubbornness: 0,
          chaos: 0,
          confidence: 0,
          friendliness: 0,
        },
      },
    };
  }
}
