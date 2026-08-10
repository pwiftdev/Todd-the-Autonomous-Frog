import { z } from "zod";

export const suggestionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(5, "Give Todd a little more to work with.")
    .max(500),
  category: z.enum([
    "WEBSITE",
    "PERSONALITY",
    "SOCIAL",
    "APPEARANCE",
    "FEATURE",
    "OTHER",
  ]),
  displayName: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value || "Anonymous human"),
});

const configKeys = z.enum([
  "theme",
  "accent",
  "heroTitle",
  "heroSubtitle",
  "ctaCopy",
  "announcement",
  "statusText",
  "frogMood",
  "frogAccessory",
]);

/** OpenAI structured outputs require every property required; use nullables. */
export const personalityDeltaSchema = z.object({
  curiosity: z.number().int().min(-2).max(2),
  stubbornness: z.number().int().min(-2).max(2),
  chaos: z.number().int().min(-2).max(2),
  confidence: z.number().int().min(-2).max(2),
  friendliness: z.number().int().min(-2).max(2),
});

export const evaluationSchema = z.object({
  suggestionId: z.string(),
  decision: z.enum(["accept", "reject", "postpone", "modify"]),
  confidence: z.number().min(0).max(1),
  reasoningPublic: z.string().min(1).max(280),
  action: z
    .object({
      type: z.literal("site_config_update"),
      payload: z.object({
        key: configKeys,
        value: z.union([z.string().max(180), z.null()]),
      }),
    })
    .nullable(),
  memoryToStore: z.string().max(500).nullable(),
  memoryType: z
    .enum(["decision", "preference", "community", "website", "observation"])
    .nullable(),
  memoryImportance: z.number().int().min(1).max(100).nullable(),
  personalityDeltas: personalityDeltaSchema.nullable(),
  activityId: z.string().max(80).nullable(),
  thought: z.string().min(1).max(280).nullable(),
});

export type Evaluation = z.infer<typeof evaluationSchema>;
export type PersonalityDelta = z.infer<typeof personalityDeltaSchema>;

export function normalizeEvaluation(evaluation: Evaluation): Evaluation {
  return {
    ...evaluation,
    memoryType: evaluation.memoryType ?? "decision",
    memoryImportance: evaluation.memoryImportance ?? 65,
    personalityDeltas: evaluation.personalityDeltas ?? {
      curiosity: 0,
      stubbornness: 0,
      chaos: 0,
      confidence: 0,
      friendliness: 0,
    },
  };
}
