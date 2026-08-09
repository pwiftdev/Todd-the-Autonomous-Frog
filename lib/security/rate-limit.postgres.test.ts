import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PrismaClient } from "@prisma/client";

import { consumeSharedRateLimit, pruneExpiredRateLimits } from "./rate-limit";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;
const prisma = new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
);

before(async () => {
  if (databaseUrl) await prisma.$connect();
});

after(async () => {
  if (databaseUrl) await prisma.$disconnect();
});

beforeEach(async () => {
  if (databaseUrl) await prisma.rateLimitBucket.deleteMany();
});

integrationTest("shared limiter is atomic under concurrent replicas", async () => {
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      consumeSharedRateLimit(prisma, {
        key: "suggestion:test-client",
        limit: 3,
        windowMs: 60_000,
      }),
    ),
  );

  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.equal(results.filter((result) => !result.allowed).length, 7);
  const bucket = await prisma.rateLimitBucket.findUniqueOrThrow({
    where: { key: "suggestion:test-client" },
  });
  assert.equal(bucket.count, 4, "denied traffic must not grow the bucket without bound");
});

integrationTest("expired window resets the shared count", async () => {
  await prisma.rateLimitBucket.create({
    data: {
      key: "suggestion:expired",
      count: 4,
      resetAt: new Date(0),
    },
  });

  const result = await consumeSharedRateLimit(prisma, {
    key: "suggestion:expired",
    limit: 3,
    windowMs: 60_000,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
});

integrationTest("expired identities are pruned in bounded batches", async () => {
  await prisma.rateLimitBucket.createMany({
    data: Array.from({ length: 3 }, (_, index) => ({
      key: `expired:${index}`,
      count: 1,
      resetAt: new Date(0),
    })),
  });
  const removed = await pruneExpiredRateLimits(prisma, { limit: 2 });
  assert.equal(removed, 2);
  assert.equal(await prisma.rateLimitBucket.count(), 1);
});
