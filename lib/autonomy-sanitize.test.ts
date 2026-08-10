import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeEvaluationAction } from "./evaluation-sanitize";
import type { Evaluation } from "./validation";

function base(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    suggestionId: "s1",
    decision: "accept",
    confidence: 0.7,
    reasoningPublic: "sure whatever",
    action: null,
    memoryToStore: null,
    memoryType: "decision",
    memoryImportance: 65,
    personalityDeltas: {
      curiosity: 0,
      stubbornness: 0,
      chaos: 0,
      confidence: 0,
      friendliness: 0,
    },
    activityId: null,
    thought: null,
    ...overrides,
  };
}

test("sanitizeEvaluationAction keeps allowed accents", () => {
  const evaluation = sanitizeEvaluationAction(
    base({
      action: {
        type: "site_config_update",
        payload: { key: "accent", value: "lime" },
      },
    }),
  );
  assert.equal(evaluation.action?.payload.value, "lime");
});

test("sanitizeEvaluationAction drops illegal accents instead of failing", () => {
  const evaluation = sanitizeEvaluationAction(
    base({
      action: {
        type: "site_config_update",
        payload: { key: "accent", value: "neon purple" },
      },
    }),
  );
  assert.equal(evaluation.action, null);
  assert.equal(evaluation.decision, "accept");
});
