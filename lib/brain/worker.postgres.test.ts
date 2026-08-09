import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PrismaClient } from "@prisma/client";

import { MockAiProvider, type AiProvider } from "../ai/provider";
import { getBrainState, rollbackLatestConfig } from "../autonomy";
import { submitVisitorSuggestion } from "../suggestions";
import { enqueueDecisionRun } from "./store";
import { processNextDecisionRun } from "./worker";

function personalityProvider(delta: number): AiProvider {
  return {
    providerName: "mock",
    modelName: "personality-test",
    evaluateSuggestion: async (context) => ({
      evaluation: {
        suggestionId: context.suggestion.id,
        decision: "accept",
        confidence: 0.9,
        thought: "A measured personality update.",
        reasoningPublic: "This seems reasonable.",
        memory: null,
        personalityDeltas: {
          curiosity: delta,
          stubbornness: 0,
          chaos: 0,
          confidence: 0,
          friendliness: 0,
        },
        activity: { type: "reviewing", durationSeconds: 60 },
        action: null,
      },
      metadata: {
        provider: "mock",
        model: "personality-test",
        requestId: "request-test",
        responseId: "response-test",
        finishStatus: "completed",
        inputTokens: 10,
        outputTokens: 10,
        latencyMs: 1,
        costKnown: true,
        costMicros: 0,
      },
    }),
  };
}

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
  await prisma.memory.create({
    data: {
      type: "website",
      content: "Todd remembers an earlier theme request.",
      importance: 70,
    },
  });
});

async function queueDarkSuggestion(key = "worker:success") {
  const suggestion = await prisma.suggestion.create({
    data: {
      text: "Make the website darker.",
      category: "WEBSITE",
      displayName: "tester",
      supportCount: 10,
    },
  });
  const run = await enqueueDecisionRun(prisma, {
    idempotencyKey: key,
    trigger: "ADMIN",
  });
  assert.ok(run);
  return { suggestion, run };
}

integrationTest("worker atomically commits one complete decision", async () => {
  const { suggestion, run } = await queueDarkSuggestion();

  const result = await processNextDecisionRun({
    prisma,
    provider: new MockAiProvider(),
    workerId: "worker-a",
    leaseMs: 60_000,
  });

  if (result.status !== "succeeded") {
    const failedRun = await prisma.decisionRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    assert.fail(
      `expected success; got ${result.status}: ${failedRun.lastErrorCode} / ${failedRun.lastErrorMessage}`,
    );
  }
  assert.equal(result.runId, run.id);
  const persistedRun = await prisma.decisionRun.findUniqueOrThrow({
    where: { id: run.id },
  });
  assert.equal(persistedRun.status, "SUCCEEDED");
  assert.ok(persistedRun.contextHash);
  assert.ok(persistedRun.promptHash);
  assert.equal(persistedRun.leaseToken, null);
  assert.equal(await prisma.decision.count({ where: { decisionRunId: run.id } }), 1);
  assert.equal(await prisma.aiRun.count({ where: { decisionRunId: run.id } }), 1);
  assert.equal(await prisma.thought.count(), 1);
  assert.equal(await prisma.action.count(), 1);
  assert.equal(await prisma.memory.count({ where: { sourceRunId: run.id } }), 1);
  assert.equal(await prisma.toddActivity.count({ where: { decisionRunId: run.id } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { decisionRunId: run.id } }), 1);
  assert.equal(
    (await prisma.suggestion.findUniqueOrThrow({ where: { id: suggestion.id } }))
      .status,
    "IMPLEMENTED",
  );
  const activeConfig = await prisma.siteConfig.findFirstOrThrow({
    where: { isActive: true },
    include: { parentConfig: true },
  });
  assert.equal(activeConfig.theme, "midnight_swamp");
  assert.equal(activeConfig.version, 2);
  assert.equal(activeConfig.parentConfig?.version, 1);
  const state = await getBrainState();
  assert.equal(state.mood, "suspicious");
  assert.equal((state.currentThought?.content.length ?? 0) > 0, true);
  assert.equal((state.latestDecision?.reasoningPublic.length ?? 0) > 0, true);
  assert.equal("provider" in state, false);
  assert.equal("model" in state, false);
  assert.equal("latestRun" in state, false);

  await rollbackLatestConfig();
  assert.equal(
    (await prisma.siteConfig.findFirstOrThrow({ where: { isActive: true } })).version,
    1,
  );
  assert.equal(
    (await prisma.action.findFirstOrThrow()).status,
    "REVERTED",
  );

  const idle = await processNextDecisionRun({
    prisma,
    provider: new MockAiProvider(),
    workerId: "worker-a",
    leaseMs: 60_000,
  });
  assert.deepEqual(idle, { status: "idle" });
  assert.equal(await prisma.decision.count(), 1);
});

integrationTest("provider failure records the attempt and schedules a retry", async () => {
  const { run } = await queueDarkSuggestion("worker:retry");
  const failingProvider: AiProvider = {
    providerName: "mock",
    modelName: "failure-test",
    evaluateSuggestion: async () => {
      throw new Error("temporary upstream failure with secret-like detail");
    },
  };

  const result = await processNextDecisionRun({
    prisma,
    provider: failingProvider,
    workerId: "worker-a",
    leaseMs: 60_000,
  });

  assert.equal(result.status, "retrying");
  const persistedRun = await prisma.decisionRun.findUniqueOrThrow({
    where: { id: run.id },
  });
  assert.equal(persistedRun.status, "RETRYING");
  assert.equal(persistedRun.leaseToken, null);
  assert.ok(persistedRun.nextAttemptAt > new Date());
  assert.equal(await prisma.decision.count(), 0);
  const attempt = await prisma.aiRun.findFirstOrThrow({
    where: { decisionRunId: run.id },
  });
  assert.equal(attempt.status, "FAILED");
  assert.ok(attempt.error);
  assert.ok(attempt.completedAt);
});

integrationTest("exhausted provider failure returns suggestion to pending", async () => {
  const { suggestion, run } = await queueDarkSuggestion("worker:failed");
  await prisma.decisionRun.update({
    where: { id: run.id },
    data: { maxAttempts: 1 },
  });
  const failingProvider: AiProvider = {
    providerName: "mock",
    modelName: "failure-test",
    evaluateSuggestion: async () => {
      throw new Error("permanent failure");
    },
  };

  const result = await processNextDecisionRun({
    prisma,
    provider: failingProvider,
    workerId: "worker-a",
    leaseMs: 60_000,
  });

  assert.equal(result.status, "failed");
  assert.equal(
    (await prisma.decisionRun.findUniqueOrThrow({ where: { id: run.id } }))
      .status,
    "FAILED",
  );
  assert.equal(
    (await prisma.suggestion.findUniqueOrThrow({ where: { id: suggestion.id } }))
      .status,
    "PENDING",
  );
  assert.equal(await prisma.decision.count(), 0);
});

integrationTest("concurrent finalization preserves both personality deltas", async () => {
  const first = await queueDarkSuggestion("worker:personality:first");
  const secondSuggestion = await prisma.suggestion.create({
    data: {
      text: "Please consider a second calm improvement.",
      category: "PERSONALITY",
      displayName: "tester-two",
      supportCount: 9,
    },
  });
  const second = await enqueueDecisionRun(prisma, {
    idempotencyKey: "worker:personality:second",
    trigger: "ADMIN",
  });
  assert.ok(second);
  assert.equal(second.suggestionId, secondSuggestion.id);
  const before = await prisma.personality.findUniqueOrThrow({ where: { id: "personality" } });

  const results = await Promise.all([
    processNextDecisionRun({
      prisma,
      provider: personalityProvider(1),
      workerId: "personality-a",
      leaseMs: 60_000,
    }),
    processNextDecisionRun({
      prisma,
      provider: personalityProvider(1),
      workerId: "personality-b",
      leaseMs: 60_000,
    }),
  ]);

  assert.equal(results.filter((result) => result.status === "succeeded").length, 2);
  assert.equal(first.run.status, "QUEUED");
  const after = await prisma.personality.findUniqueOrThrow({ where: { id: "personality" } });
  assert.equal(after.curiosity, before.curiosity + 2);
});

integrationTest("provider success remains truthful when publication fails", async () => {
  const { suggestion, run } = await queueDarkSuggestion("worker:commit-failure");
  await prisma.decision.create({
    data: {
      suggestionId: suggestion.id,
      decisionRunId: run.id,
      decision: "REJECT",
      confidence: 0,
      reasoningPublic: "Injected uniqueness conflict.",
      rawResponse: {},
    },
  });

  const result = await processNextDecisionRun({
    prisma,
    provider: personalityProvider(0),
    workerId: "commit-failure",
    leaseMs: 60_000,
  });

  assert.equal(result.status, "retrying");
  const attempt = await prisma.aiRun.findFirstOrThrow({
    where: { decisionRunId: run.id },
  });
  assert.equal(attempt.status, "SUCCEEDED");
  assert.equal(attempt.provider, "mock");
  assert.equal(attempt.responseId, "response-test");
  assert.equal(attempt.inputTokens, 10);
});

integrationTest("visitor submission reaches a persisted mock-model decision", async () => {
  const submitted = await submitVisitorSuggestion(prisma, {
    fingerprint: "vertical-slice-visitor",
    text: "Please switch the swamp to dark mode for night reading.",
    category: "FEATURE",
    displayName: "Night visitor",
  });
  assert.equal(submitted.ok, true);
  const run = await enqueueDecisionRun(prisma, {
    idempotencyKey: "vertical:visitor-to-decision",
    trigger: "CRON",
  });
  assert.ok(run);
  const result = await processNextDecisionRun({
    prisma,
    provider: new MockAiProvider(),
    workerId: "vertical-worker",
    leaseMs: 60_000,
  });
  assert.equal(result.status, "succeeded");
  assert.equal("runId" in result ? result.runId : null, run.id);
  assert.equal("decisionId" in result && Boolean(result.decisionId), true);
  const persisted = await prisma.suggestion.findUniqueOrThrow({
    where: { id: run.suggestionId },
    include: { decisions: true },
  });
  assert.equal(persisted.displayName, "Night visitor");
  assert.equal(persisted.decisions[0]?.reasoningPublic.length > 0, true);
});
