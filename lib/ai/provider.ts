import type { SiteConfigData } from "@/lib/types";
import type { Evaluation } from "@/lib/validation";
import { getAppMode } from "@/lib/config";
import { MockAiProvider } from "@/lib/ai/mock";
import { OpenAiProvider } from "@/lib/ai/openai";

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

export type AiUsage = {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
};

export type AiResult<T> = {
  value: T;
  usage?: AiUsage;
};

export interface AiProvider {
  evaluateSuggestion(
    context: EvaluationContext,
  ): Promise<AiResult<Evaluation>>;
  generateThought(event: string): Promise<AiResult<string>>;
  generateSocialPost(event: string): Promise<AiResult<string>>;
  generateReflection?(summary: string): Promise<
    AiResult<{
      journal: string;
      thought: string;
      personalityDeltas?: Partial<Record<string, number>>;
    }>
  >;
}

export function createAiProvider(): AiProvider {
  const preferred = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (preferred === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAiProvider();
  }
  if (preferred === "openai" && getAppMode() === "live") {
    console.warn(
      "[todd] AI_PROVIDER=openai but OPENAI_API_KEY is missing; using mock.",
    );
  }
  return new MockAiProvider();
}

export const aiProvider: AiProvider = createAiProvider();

export { MockAiProvider, OpenAiProvider };
