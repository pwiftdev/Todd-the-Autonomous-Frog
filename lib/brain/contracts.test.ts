import assert from "node:assert/strict";
import test from "node:test";

import {
  brainEvaluationSchema,
  enforceEvaluationPolicy,
} from "./contracts";

const baseEvaluation = {
  suggestionId: "suggestion-1",
  decision: "accept" as const,
  confidence: 0.82,
  thought: "The humans have made a surprisingly coherent request.",
  reasoningPublic: "Fine. This improves the pond.",
  memory: {
    type: "preference" as const,
    content: "Todd approved a darker presentation.",
    importance: 70,
  },
  personalityDeltas: {
    curiosity: 1,
    stubbornness: 0,
    chaos: 0,
    confidence: 1,
    friendliness: 0,
  },
  activity: { type: "reviewing" as const, durationSeconds: 300 },
  action: {
    type: "site_config_update" as const,
    payload: { key: "theme" as const, value: "midnight_swamp" },
  },
};

test("brain evaluation rejects unknown fields and out-of-range deltas", () => {
  assert.equal(
    brainEvaluationSchema.safeParse({ ...baseEvaluation, hiddenCommand: "run" })
      .success,
    false,
  );
  assert.equal(
    brainEvaluationSchema.safeParse({
      ...baseEvaluation,
      personalityDeltas: { ...baseEvaluation.personalityDeltas, chaos: 99 },
    }).success,
    false,
  );
});

test("policy rejects output for a different claimed suggestion", () => {
  assert.throws(
    () => enforceEvaluationPolicy(baseEvaluation, "suggestion-2"),
    /suggestion/i,
  );
});

test("policy rejects disallowed site configuration values", () => {
  assert.throws(
    () =>
      enforceEvaluationPolicy(
        {
          ...baseEvaluation,
          action: {
            type: "site_config_update",
            payload: { key: "theme", value: "javascript:alert(1)" },
          },
        },
        "suggestion-1",
      ),
    /allowed/i,
  );
});

test("policy rejects actions attached to reject or postpone decisions", () => {
  for (const decision of ["reject", "postpone"] as const) {
    assert.throws(
      () =>
        enforceEvaluationPolicy(
          { ...baseEvaluation, decision },
          "suggestion-1",
        ),
      /action/i,
    );
  }
});

test("policy returns a deeply validated evaluation", () => {
  const result = enforceEvaluationPolicy(baseEvaluation, "suggestion-1");

  assert.deepEqual(result, baseEvaluation);
});
