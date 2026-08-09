import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL(
  "../../prisma/migrations/20260809230000_brain_backend/migration.sql",
  import.meta.url,
);

test("brain persistence schema contains durable runs, activity, outbox, attempts and shared limits", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  for (const model of [
    "DecisionRun",
    "ToddActivity",
    "OutboxEvent",
    "RateLimitBucket",
  ]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /parentConfigId\s+String\?/);
  assert.match(schema, /enum BrainRunStatus/);
  assert.match(schema, /leaseToken\s+String\?/);
  assert.match(schema, /contextHash\s+String\?/);
  assert.match(schema, /decisionRunId\s+String\?/);
});

test("migration enforces one live run per suggestion and bounded personality", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /ADD COLUMN "parentConfigId" TEXT/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "DecisionRun_one_live_per_suggestion"[\s\S]+WHERE "status" IN \('QUEUED', 'RUNNING', 'RETRYING'\)/,
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "SiteConfig_one_active"[\s\S]+WHERE "isActive" = true/,
  );
  for (const trait of [
    "curiosity",
    "stubbornness",
    "chaos",
    "confidence",
    "friendliness",
  ]) {
    assert.match(
      migration,
      new RegExp(`CHECK \\("${trait}" BETWEEN 0 AND 100\\)`),
    );
  }
});
