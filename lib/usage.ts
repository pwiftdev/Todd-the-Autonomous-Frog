import { prisma } from "@/lib/prisma";
import { getDailyTokenBudget } from "@/lib/config";
import type { AiUsage } from "@/lib/ai/provider";

const COST_PER_MILLION = {
  input: 0.4,
  output: 1.6,
};

export async function recordAiUsage(input: {
  operation: string;
  usage?: AiUsage;
  aiRunId?: string;
  provider?: string;
}) {
  if (!input.usage) return null;
  const inputTokens = input.usage.inputTokens ?? 0;
  const outputTokens = input.usage.outputTokens ?? 0;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * COST_PER_MILLION.input +
    (outputTokens / 1_000_000) * COST_PER_MILLION.output;

  return prisma.usageLedger.create({
    data: {
      provider: input.provider ?? process.env.AI_PROVIDER ?? "mock",
      model: input.usage.model ?? "unknown",
      operation: input.operation,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      aiRunId: input.aiRunId,
    },
  });
}

export async function tokensUsedToday() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.usageLedger.findMany({
    where: { createdAt: { gte: start } },
    select: { inputTokens: true, outputTokens: true },
  });
  return rows.reduce(
    (total, row) => total + row.inputTokens + row.outputTokens,
    0,
  );
}

export async function assertWithinTokenBudget() {
  const used = await tokensUsedToday();
  const budget = getDailyTokenBudget();
  if (used >= budget) {
    throw new Error(
      `Daily token budget exhausted (${used}/${budget}). Autonomy paused by cost guard.`,
    );
  }
}
