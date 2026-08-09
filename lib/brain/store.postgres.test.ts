import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PrismaClient } from "@prisma/client";

import { getToddData } from "../data";
import {
  claimDecisionRun,
  enqueueDecisionRun,
  saveRunContext,
} from "./store";
import { createFencedAiRun } from "./worker";

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
  if (!databaseUrl) return;
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OutboxEvent", "ToddActivity", "AiRun", "Action", "Decision",
      "DecisionRun", "SuggestionSupport", "Suggestion", "Memory",
      "SiteConfig", "Personality", "ToddState", "AuditLog"
    RESTART IDENTITY CASCADE
  `);
  await prisma.toddState.create({ data: { id: "todd" } });
  await prisma.personality.create({ data: { id: "personality" } });
  await prisma.siteConfig.create({
    data: {
      version: 1,
      isActive: true,
      theme: "classic_swamp",
      accent: "lime",
      heroTitle: "TODD",
      heroSubtitle: "A frog.",
      ctaCopy: "Suggest",
      statusText: "Thinking",
      frogMood: "suspicious",
      frogAccessory: "none",
      enabledSections: [],
    },
  });
});

async function createSuggestion() {
  return prisma.suggestion.create({
    data: {
      text: "Make the website darker.",
      category: "WEBSITE",
      displayName: "tester",
      supportCount: 10,
    },
  });
}

integrationTest("demo mode never labels populated PostgreSQL data as live", async () => {
  const previousMode = process.env.TODD_RUNTIME_MODE;
  process.env.TODD_RUNTIME_MODE = "demo";
  try {
    const data = await getToddData();
    assert.equal(data.config.heroSubtitle, "A frog.");
    assert.deepEqual(data.provenance, {
      mode: "demo",
      synthetic: true,
      label: "Demo data — not live Todd activity",
    });
  } finally {
    if (previousMode === undefined) delete process.env.TODD_RUNTIME_MODE;
    else process.env.TODD_RUNTIME_MODE = previousMode;
  }
});

integrationTest("concurrent duplicate enqueue creates one logical run", async () => {
  const suggestion = await createSuggestion();

  const [left, right] = await Promise.all([
    enqueueDecisionRun(prisma, {
      idempotencyKey: "cron:2026-08-09T22:45",
      trigger: "CRON",
    }),
    enqueueDecisionRun(prisma, {
      idempotencyKey: "cron:2026-08-09T22:45",
      trigger: "CRON",
    }),
  ]);

  assert.ok(left);
  assert.ok(right);
  assert.equal(left.id, right.id);
  assert.equal(await prisma.decisionRun.count(), 1);
  assert.equal(
    (await prisma.suggestion.findUniqueOrThrow({ where: { id: suggestion.id } }))
      .status,
    "CONSIDERING",
  );
});

integrationTest("two workers cannot claim the same run", async () => {
  await createSuggestion();
  const queued = await enqueueDecisionRun(prisma, {
    idempotencyKey: "admin:one",
    trigger: "ADMIN",
  });
  assert.ok(queued);

  const claims = await Promise.all([
    claimDecisionRun(prisma, { workerId: "worker-a", leaseMs: 60_000 }),
    claimDecisionRun(prisma, { workerId: "worker-b", leaseMs: 60_000 }),
  ]);
  const winners = claims.filter((claim) => claim !== null);

  assert.equal(winners.length, 1);
  assert.equal(winners[0]?.id, queued.id);
  assert.equal(winners[0]?.attemptCount, 1);
});

integrationTest("paused autonomy blocks claims without corrupting queued work", async () => {
  await createSuggestion();
  const run = await enqueueDecisionRun(prisma, {
    idempotencyKey: "admin:paused",
    trigger: "ADMIN",
  });
  assert.ok(run);
  await prisma.toddState.update({
    where: { id: "todd" },
    data: { autonomyPaused: true },
  });
  assert.equal(
    await claimDecisionRun(prisma, { workerId: "paused-worker", leaseMs: 60_000 }),
    null,
  );
  assert.equal(
    (await prisma.decisionRun.findUniqueOrThrow({ where: { id: run.id } })).status,
    "QUEUED",
  );
  await prisma.toddState.update({
    where: { id: "todd" },
    data: { autonomyPaused: false },
  });
  assert.ok(
    await claimDecisionRun(prisma, { workerId: "resumed-worker", leaseMs: 60_000 }),
  );
});

integrationTest("stale lease token cannot persist context", async () => {
  await createSuggestion();
  await enqueueDecisionRun(prisma, {
    idempotencyKey: "admin:fence",
    trigger: "ADMIN",
  });
  const claim = await claimDecisionRun(prisma, {
    workerId: "worker-a",
    leaseMs: 60_000,
  });
  assert.ok(claim);

  await assert.rejects(
    () =>
      saveRunContext(prisma, {
        runId: claim.id,
        leaseToken: "stale-token",
        context: { suggestion: "wrong" },
        contextHash: "bad",
        promptHash: "bad",
      }),
    /lease/i,
  );
  assert.equal(
    (await prisma.decisionRun.findUniqueOrThrow({ where: { id: claim.id } }))
      .contextSnapshot,
    null,
  );
});

integrationTest("an expired lease is reclaimed with a new fencing token", async () => {
  await createSuggestion();
  await enqueueDecisionRun(prisma, {
    idempotencyKey: "admin:reclaim",
    trigger: "ADMIN",
  });
  const first = await claimDecisionRun(prisma, {
    workerId: "worker-a",
    leaseMs: 60_000,
  });
  assert.ok(first);
  await prisma.decisionRun.update({
    where: { id: first.id },
    data: { leaseExpiresAt: new Date(Date.now() - 1_000) },
  });

  const second = await claimDecisionRun(prisma, {
    workerId: "worker-b",
    leaseMs: 60_000,
  });

  assert.ok(second);
  assert.notEqual(second.leaseToken, first.leaseToken);
  assert.equal(second.workerId, "worker-b");
  assert.equal(second.attemptCount, 2);
});

integrationTest("stale lease token cannot create a provider attempt", async () => {
  await createSuggestion();
  await enqueueDecisionRun(prisma, {
    idempotencyKey: "admin:attempt-fence",
    trigger: "ADMIN",
  });
  const claim = await claimDecisionRun(prisma, {
    workerId: "worker-a",
    leaseMs: 60_000,
  });
  assert.ok(claim);
  await prisma.decisionRun.update({
    where: { id: claim.id },
    data: { leaseToken: "new-owner-token" },
  });

  await assert.rejects(
    () => createFencedAiRun(prisma, claim, { contextHash: "hash" }),
    /lease/i,
  );
  assert.equal(await prisma.aiRun.count({ where: { decisionRunId: claim.id } }), 0);
});

integrationTest("an expired final attempt is failed and releases its suggestion", async () => {
  const suggestion = await createSuggestion();
  const run = await enqueueDecisionRun(prisma, {
    idempotencyKey: "admin:exhausted-crash",
    trigger: "ADMIN",
  });
  assert.ok(run);
  await prisma.decisionRun.update({ where: { id: run.id }, data: { maxAttempts: 1 } });
  const claim = await claimDecisionRun(prisma, {
    workerId: "worker-final",
    leaseMs: 60_000,
  });
  assert.ok(claim);
  await prisma.decisionRun.update({
    where: { id: run.id },
    data: { leaseExpiresAt: new Date(Date.now() - 1_000) },
  });

  assert.equal(
    await claimDecisionRun(prisma, { workerId: "recovery", leaseMs: 60_000 }),
    null,
  );
  assert.equal(
    (await prisma.decisionRun.findUniqueOrThrow({ where: { id: run.id } })).status,
    "FAILED",
  );
  assert.equal(
    (await prisma.suggestion.findUniqueOrThrow({ where: { id: suggestion.id } })).status,
    "PENDING",
  );
});
