import { prisma } from "@/lib/prisma";

export async function retrieveRelevantMemories(input: {
  category?: string;
  suggestionText?: string;
  limit?: number;
}) {
  const limit = input.limit ?? 8;
  const [important, recent, journals] = await Promise.all([
    prisma.memory.findMany({
      take: limit,
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    }),
    prisma.memory.findMany({
      take: Math.ceil(limit / 2),
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyJournal.findMany({
      take: 2,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const category = input.category?.toLowerCase();
  const text = input.suggestionText?.toLowerCase() ?? "";
  const scored = new Map<
    string,
    { content: string; importance: number; score: number }
  >();

  for (const memory of [...important, ...recent]) {
    let score = memory.importance;
    if (category && memory.type.toLowerCase().includes(category)) score += 20;
    if (category && memory.content.toLowerCase().includes(category)) score += 10;
    if (text) {
      const overlap = text
        .split(/\W+/)
        .filter((token) => token.length > 4)
        .filter((token) => memory.content.toLowerCase().includes(token)).length;
      score += overlap * 4;
    }
    const existing = scored.get(memory.id);
    if (!existing || existing.score < score) {
      scored.set(memory.id, {
        content: memory.content,
        importance: memory.importance,
        score,
      });
    }
  }

  for (const journal of journals) {
    scored.set(`journal:${journal.id}`, {
      content: `Journal: ${journal.content}`,
      importance: 55,
      score: 55,
    });
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.content);
}

export function clampTrait(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function applyPersonalityDeltas(
  deltas?: Partial<Record<string, number>> | null,
) {
  if (!deltas) return null;
  const current = await prisma.personality.findUniqueOrThrow({
    where: { id: "personality" },
  });
  const next = {
    curiosity: clampTrait(current.curiosity + (deltas.curiosity ?? 0)),
    stubbornness: clampTrait(
      current.stubbornness + (deltas.stubbornness ?? 0),
    ),
    chaos: clampTrait(current.chaos + (deltas.chaos ?? 0)),
    confidence: clampTrait(current.confidence + (deltas.confidence ?? 0)),
    friendliness: clampTrait(
      current.friendliness + (deltas.friendliness ?? 0),
    ),
  };
  return prisma.personality.update({
    where: { id: "personality" },
    data: next,
  });
}
