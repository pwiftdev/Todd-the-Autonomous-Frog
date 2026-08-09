import { z } from "zod";

const personalityDeltasSchema = z
  .object({
    curiosity: z.number().int().min(-2).max(2),
    stubbornness: z.number().int().min(-2).max(2),
    chaos: z.number().int().min(-2).max(2),
    confidence: z.number().int().min(-2).max(2),
    friendliness: z.number().int().min(-2).max(2),
  })
  .strict();

const actionSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("theme"), value: z.enum(["classic_swamp", "midnight_swamp", "misty_pond"]) }),
  z.object({ key: z.literal("accent"), value: z.enum(["lime", "amber", "mint"]) }),
  z.object({ key: z.literal("frogMood"), value: z.enum(["calm", "suspicious", "pleased", "plotting"]) }),
  z.object({ key: z.literal("frogAccessory"), value: z.enum(["none", "crown", "lily"]) }),
  z.object({ key: z.literal("heroTitle"), value: z.string().trim().min(1).max(80) }),
  z.object({ key: z.literal("heroSubtitle"), value: z.string().trim().min(1).max(180) }),
  z.object({ key: z.literal("ctaCopy"), value: z.string().trim().min(1).max(80) }),
  z.object({ key: z.literal("announcement"), value: z.string().trim().max(180).nullable() }),
  z.object({ key: z.literal("statusText"), value: z.string().trim().min(1).max(80) }),
]);

export const brainEvaluationSchema = z
  .object({
    suggestionId: z.string().min(1).max(128),
    decision: z.enum(["accept", "reject", "postpone", "modify"]),
    confidence: z.number().min(0).max(1),
    thought: z.string().trim().min(1).max(280),
    reasoningPublic: z.string().trim().min(1).max(280),
    memory: z
      .object({
        type: z.enum(["preference", "community", "website", "decision"]),
        content: z.string().trim().min(1).max(500),
        importance: z.number().int().min(0).max(100),
      })
      .strict()
      .nullable(),
    personalityDeltas: personalityDeltasSchema,
    activity: z
      .object({
        type: z.enum(["reviewing", "thinking", "resting"]),
        durationSeconds: z.number().int().min(60).max(1800),
      })
      .strict(),
    action: z
      .object({
        type: z.literal("site_config_update"),
        payload: actionSchema,
      })
      .strict()
      .nullable(),
  })
  .strict();

export type BrainEvaluation = z.infer<typeof brainEvaluationSchema>;
export type PersonalityDeltas = z.infer<typeof personalityDeltasSchema>;

export function enforceEvaluationPolicy(
  candidate: unknown,
  claimedSuggestionId: string,
): BrainEvaluation {
  const parsed = brainEvaluationSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("Evaluation contains values outside the allowed policy.", {
      cause: parsed.error,
    });
  }
  if (parsed.data.suggestionId !== claimedSuggestionId) {
    throw new Error("Evaluation suggestion does not match the claimed suggestion.");
  }
  if (
    parsed.data.action &&
    parsed.data.decision !== "accept" &&
    parsed.data.decision !== "modify"
  ) {
    throw new Error("Only accepted or modified decisions may include an action.");
  }
  return parsed.data;
}

export function applyPersonalityDeltas(
  current: Record<keyof PersonalityDeltas, number>,
  deltas: PersonalityDeltas,
) {
  return Object.fromEntries(
    Object.entries(deltas).map(([trait, delta]) => [
      trait,
      Math.max(0, Math.min(100, current[trait as keyof PersonalityDeltas] + delta)),
    ]),
  ) as Record<keyof PersonalityDeltas, number>;
}
