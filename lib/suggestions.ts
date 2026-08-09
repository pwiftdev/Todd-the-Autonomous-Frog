import type { PrismaClient } from "@prisma/client";

import { consumeSharedRateLimit } from "@/lib/security/rate-limit";
import { suggestionSchema } from "@/lib/validation";

export type SuggestionSubmissionResult = {
  ok: boolean;
  message: string;
  suggestionId?: string;
};

export async function submitVisitorSuggestion(
  prisma: PrismaClient,
  input: {
    fingerprint: string;
    text: unknown;
    category: unknown;
    displayName: unknown;
  },
): Promise<SuggestionSubmissionResult> {
  const rate = await consumeSharedRateLimit(prisma, {
    key: `suggestion:${input.fingerprint}`,
    limit: 5,
    windowMs: 60 * 60 * 1_000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      message: "Todd has heard enough from this visitor for now.",
    };
  }
  const parsed = suggestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Todd rejected the wording.",
    };
  }
  const suggestion = await prisma.suggestion.create({ data: parsed.data });
  return {
    ok: true,
    message: "Submitted. Todd owes you nothing.",
    suggestionId: suggestion.id,
  };
}
