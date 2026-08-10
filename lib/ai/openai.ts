import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { AiProvider, AiResult, EvaluationContext } from "@/lib/ai/provider";
import { getOpenAiModel } from "@/lib/config";
import { buildToddSystemPrompt, toddVoice } from "@/lib/todd-personality";
import {
  evaluationSchema,
  normalizeEvaluation,
  personalityDeltaSchema,
  type Evaluation,
} from "@/lib/validation";

const reflectionSchema = z.object({
  journal: z.string().min(1).max(800),
  thought: z.string().min(1).max(280),
  personalityDeltas: personalityDeltaSchema.nullable(),
});

export class OpenAiProvider implements AiProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private model = getOpenAiModel();

  private systemFor(context?: {
    personality?: Record<string, number>;
    memories?: string[];
  }) {
    return buildToddSystemPrompt({
      traits: context?.personality,
      memories: context?.memories,
    });
  }

  private async timed<T>(fn: () => Promise<T>): Promise<AiResult<T>> {
    const started = Date.now();
    const value = await fn();
    return {
      value,
      usage: {
        model: this.model,
        latencyMs: Date.now() - started,
      },
    };
  }

  async evaluateSuggestion(
    context: EvaluationContext,
  ): Promise<AiResult<Evaluation>> {
    const started = Date.now();
    const response = await this.client.responses.parse({
      model: this.model,
      input: [
        {
          role: "system",
          content: this.systemFor({
            personality: context.personality,
            memories: context.memories,
          }),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "evaluateSuggestion",
            suggestion: context.suggestion,
            siteConfig: context.config,
            outputRules: {
              decision: ["accept", "reject", "postpone", "modify"],
              action: "nullable site_config_update only",
              activityId:
                "nullable world activity id such as review_suggestions, deep_thought, yoga, lift_weights, pond_relax",
              voice: "all public strings lowercase degen frog talk",
              nullFields:
                "use null for memoryToStore/action/activityId/thought/personalityDeltas when unused",
            },
          }),
        },
      ],
      text: {
        format: zodTextFormat(evaluationSchema, "evaluation"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) throw new Error("OpenAI returned no structured evaluation.");
    const value = normalizeEvaluation(evaluationSchema.parse(parsed));
    value.reasoningPublic = toddVoice(value.reasoningPublic);
    if (value.thought) value.thought = toddVoice(value.thought);
    if (value.memoryToStore) value.memoryToStore = toddVoice(value.memoryToStore, 500);
    return {
      value,
      usage: {
        model: this.model,
        latencyMs: Date.now() - started,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }

  async generateThought(event: string): Promise<AiResult<string>> {
    return this.timed(async () => {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          { role: "system", content: this.systemFor() },
          {
            role: "user",
            content: `write one short todd thought about: ${event}. lowercase degen frog only.`,
          },
        ],
        max_output_tokens: 120,
      });
      const text = response.output_text?.trim();
      if (!text) throw new Error("OpenAI returned an empty thought.");
      return toddVoice(text);
    });
  }

  async generateSocialPost(event: string): Promise<AiResult<string>> {
    return this.timed(async () => {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          { role: "system", content: this.systemFor() },
          {
            role: "user",
            content: `write one short todd social post about: ${event}. lowercase degen frog only.`,
          },
        ],
        max_output_tokens: 120,
      });
      const text = response.output_text?.trim();
      if (!text) throw new Error("OpenAI returned an empty social post.");
      return toddVoice(text, 160);
    });
  }

  async generateReflection(summary: string) {
    const started = Date.now();
    const response = await this.client.responses.parse({
      model: this.model,
      input: [
        { role: "system", content: this.systemFor() },
        {
          role: "user",
          content: `write todd's daily reflection from this summary (lowercase degen frog): ${summary}`,
        },
      ],
      text: {
        format: zodTextFormat(reflectionSchema, "reflection"),
      },
    });
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("OpenAI returned no structured reflection.");
    const value = reflectionSchema.parse(parsed);
    return {
      value: {
        journal: toddVoice(value.journal, 800),
        thought: toddVoice(value.thought),
        personalityDeltas: value.personalityDeltas ?? undefined,
      },
      usage: {
        model: this.model,
        latencyMs: Date.now() - started,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }
}
