import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import type { EvaluationContext } from "@/lib/ai/provider";
import type { SiteConfigData } from "@/lib/types";

export type ContextMemory = {
  id: string;
  type: string;
  content: string;
  importance: number;
  createdAt: string;
};

function normalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalize(child)]),
  );
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(normalize(value));
}

export function hashContext(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function hashPrompt(value: unknown) {
  return createHash("sha256")
    .update(`todd-evaluation-v1\n${canonicalJson(value)}`)
    .digest("hex");
}

export function selectMemories(
  memories: ContextMemory[],
  category: string,
  limit = 8,
) {
  const normalizedCategory = category.toLowerCase();
  return [...memories]
    .sort((left, right) => {
      const leftMatches = left.type.toLowerCase() === normalizedCategory ? 0 : 1;
      const rightMatches = right.type.toLowerCase() === normalizedCategory ? 0 : 1;
      return (
        leftMatches - rightMatches ||
        right.importance - left.importance ||
        right.createdAt.localeCompare(left.createdAt) ||
        left.id.localeCompare(right.id)
      );
    })
    .slice(0, Math.max(0, limit));
}

export async function loadEvaluationContext(
  prisma: PrismaClient,
  suggestionId: string,
): Promise<EvaluationContext> {
  const [suggestion, personality, config, memories] = await Promise.all([
    prisma.suggestion.findUniqueOrThrow({ where: { id: suggestionId } }),
    prisma.personality.findUniqueOrThrow({ where: { id: "personality" } }),
    prisma.siteConfig.findFirstOrThrow({
      where: { isActive: true },
      orderBy: [{ version: "desc" }, { id: "asc" }],
    }),
    prisma.memory.findMany({
      take: 50,
      orderBy: [
        { importance: "desc" },
        { createdAt: "desc" },
        { id: "asc" },
      ],
    }),
  ]);

  return {
    suggestion: {
      id: suggestion.id,
      text: suggestion.text,
      category: suggestion.category,
      supportCount: suggestion.supportCount,
    },
    personality: {
      curiosity: personality.curiosity,
      stubbornness: personality.stubbornness,
      chaos: personality.chaos,
      confidence: personality.confidence,
      friendliness: personality.friendliness,
    },
    config: {
      theme: config.theme,
      accent: config.accent,
      heroTitle: config.heroTitle,
      heroSubtitle: config.heroSubtitle,
      ctaCopy: config.ctaCopy,
      announcement: config.announcement,
      statusText: config.statusText,
      frogMood: config.frogMood,
      frogAccessory: config.frogAccessory,
      enabledSections: config.enabledSections as string[],
    } as SiteConfigData,
    memories: selectMemories(
      memories.map((memory) => ({
        id: memory.id,
        type: memory.type,
        content: memory.content,
        importance: memory.importance,
        createdAt: memory.createdAt.toISOString(),
      })),
      suggestion.category,
    ),
  };
}
