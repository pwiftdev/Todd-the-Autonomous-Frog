import assert from "node:assert/strict";
import test from "node:test";

import type { BrainEvaluation } from "../brain/contracts";
import {
  MockAiProvider,
  OpenAiProvider,
  ProviderResponseError,
  type EvaluationContext,
} from "./provider";

const context: EvaluationContext = {
  suggestion: {
    id: "suggestion-1",
    text: "Make the website darker.",
    category: "WEBSITE",
    supportCount: 12,
  },
  personality: {
    curiosity: 82,
    stubbornness: 76,
    chaos: 48,
    confidence: 86,
    friendliness: 58,
  },
  config: {
    theme: "classic_swamp",
    accent: "lime",
    heroTitle: "TODD",
    heroSubtitle: "An autonomous frog.",
    ctaCopy: "Suggest something",
    announcement: null,
    statusText: "Thinking",
    frogMood: "suspicious",
    frogAccessory: "none",
    enabledSections: ["thoughts"],
  },
  memories: [
    {
      id: "memory-1",
      type: "preference",
      content: "Todd prefers dark ponds.",
      importance: 80,
      createdAt: "2026-08-09T00:00:00.000Z",
    },
  ],
};

const evaluation: BrainEvaluation = {
  suggestionId: "suggestion-1",
  decision: "accept",
  confidence: 0.9,
  thought: "Dark water is less irritating.",
  reasoningPublic: "The sun has had enough attention.",
  memory: {
    type: "preference",
    content: "Todd prefers dark presentation themes.",
    importance: 70,
  },
  personalityDeltas: {
    curiosity: 0,
    stubbornness: 1,
    chaos: 0,
    confidence: 0,
    friendliness: 0,
  },
  activity: { type: "reviewing", durationSeconds: 300 },
  action: {
    type: "site_config_update",
    payload: { key: "theme", value: "midnight_swamp" },
  },
};

test("mock provider satisfies the same strict brain contract", async () => {
  const result = await new MockAiProvider().evaluateSuggestion(context);

  assert.equal(result.evaluation.suggestionId, context.suggestion.id);
  assert.equal(result.metadata.provider, "mock");
  assert.equal(result.metadata.costKnown, true);
  assert.equal(result.metadata.costMicros, 0);
});

test("OpenAI provider sends a stored-off strict Responses request and returns usage", async () => {
  let capturedBody: Record<string, unknown> | undefined;
  let capturedSignal: AbortSignal | undefined;
  let capturedHeaders: Record<string, string> | undefined;
  const client = {
    responses: {
      parse: async (
        body: Record<string, unknown>,
        options: {
          signal?: AbortSignal;
          headers?: Record<string, string>;
        },
      ) => {
        capturedBody = body;
        capturedSignal = options.signal;
        capturedHeaders = options.headers;
        return {
          id: "resp_1",
          model: "gpt-test",
          status: "completed",
          output_parsed: evaluation,
          usage: { input_tokens: 100, output_tokens: 40, total_tokens: 140 },
          _request_id: "request-1",
        };
      },
    },
  };
  const provider = new OpenAiProvider({
    client,
    model: "gpt-test",
    timeoutMs: 5_000,
  });

  const result = await provider.evaluateSuggestion(context, {
    idempotencyKey: "decision:run-1",
  });

  assert.equal(capturedBody?.model, "gpt-test");
  assert.equal(capturedBody?.store, false);
  assert.equal((capturedBody?.text as { format?: { strict?: boolean } }).format?.strict, true);
  assert.ok(capturedSignal instanceof AbortSignal);
  assert.equal(capturedHeaders?.["Idempotency-Key"], "decision:run-1");
  assert.deepEqual(result.evaluation, evaluation);
  assert.deepEqual(
    { ...result.metadata, latencyMs: undefined },
    {
      provider: "openai",
      model: "gpt-test",
      requestId: "request-1",
      responseId: "resp_1",
      finishStatus: "completed",
      inputTokens: 100,
      outputTokens: 40,
      latencyMs: undefined,
      costKnown: false,
      costMicros: null,
    },
  );
  assert.equal(typeof result.metadata.latencyMs, "number");
});

test("OpenAI provider fails closed when parsed output is absent", async () => {
  const provider = new OpenAiProvider({
    client: {
      responses: {
        parse: async () => ({
          id: "resp_bad",
          model: "gpt-test",
          status: "incomplete",
          output_parsed: null,
          usage: null,
        }),
      },
    },
    model: "gpt-test",
  });

  await assert.rejects(
    () => provider.evaluateSuggestion(context),
    ProviderResponseError,
  );
});
