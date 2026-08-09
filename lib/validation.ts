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
});

export type Evaluation = z.infer<typeof evaluationSchema>;
