import type { PrismaClient } from "@prisma/client";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export async function pruneExpiredRateLimits(
  prisma: PrismaClient,
  { limit = 1_000 }: { limit?: number } = {},
) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) {
    throw new Error("Invalid rate-limit prune limit.");
  }
  const removed = await prisma.$queryRaw<Array<{ key: string }>>`
    WITH expired AS (
      SELECT "key"
      FROM "RateLimitBucket"
      WHERE "resetAt" < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      ORDER BY "resetAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "RateLimitBucket" bucket
    USING expired
    WHERE bucket."key" = expired."key"
    RETURNING bucket."key"
  `;
  return removed.length;
}

export async function consumeSharedRateLimit(
  prisma: PrismaClient,
  {
    key,
    limit,
    windowMs,
  }: {
    key: string;
    limit: number;
    windowMs: number;
  },
): Promise<RateLimitResult> {
  if (!key || key.length > 300) throw new Error("Invalid rate-limit key.");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) {
    throw new Error("Invalid rate-limit capacity.");
  }
  if (
    !Number.isSafeInteger(windowMs) ||
    windowMs < 1_000 ||
    windowMs > 86_400_000
  ) {
    throw new Error("Invalid rate-limit window.");
  }

  await pruneExpiredRateLimits(prisma, { limit: 100 });
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (
      ${key},
      1,
      CURRENT_TIMESTAMP + (${windowMs} * INTERVAL '1 millisecond'),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN 1
        ELSE LEAST("RateLimitBucket"."count" + 1, ${limit + 1})
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP
          THEN CURRENT_TIMESTAMP + (${windowMs} * INTERVAL '1 millisecond')
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count", "resetAt"
  `;
  const bucket = rows[0];
  if (!bucket) throw new Error("Rate-limit bucket update returned no row.");
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
