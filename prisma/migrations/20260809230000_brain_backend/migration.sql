-- Durable Todd brain lifecycle, provider ledger, activity, outbox, and shared limits.

CREATE TYPE "BrainRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "BrainRunTrigger" AS ENUM ('CRON', 'ADMIN');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'RUNNING', 'DELIVERED', 'RETRYING', 'FAILED', 'CANCELLED');
CREATE TYPE "ToddActivityKind" AS ENUM ('REVIEWING', 'THINKING', 'RESTING');

ALTER TABLE "Personality"
  ADD CONSTRAINT "Personality_curiosity_range" CHECK ("curiosity" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Personality_stubbornness_range" CHECK ("stubbornness" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Personality_chaos_range" CHECK ("chaos" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Personality_confidence_range" CHECK ("confidence" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Personality_friendliness_range" CHECK ("friendliness" BETWEEN 0 AND 100);

ALTER TABLE "Memory"
  ADD COLUMN "sourceRunId" TEXT,
  ADD COLUMN "sourceDecisionId" TEXT;

ALTER TABLE "SiteConfig"
  ADD COLUMN "parentConfigId" TEXT;

-- The legacy schema only had a monotonic unique version. Preserve that only
-- available lineage by linking each version to its immediate predecessor.
UPDATE "SiteConfig" child
SET "parentConfigId" = (
  SELECT parent."id"
  FROM "SiteConfig" parent
  WHERE parent."version" < child."version"
  ORDER BY parent."version" DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "SiteConfig" parent
  WHERE parent."version" < child."version"
);

ALTER TABLE "Decision"
  ADD COLUMN "decisionRunId" TEXT;

ALTER TABLE "AiRun"
  ADD COLUMN "decisionRunId" TEXT,
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'RUNNING',
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "model" TEXT,
  ADD COLUMN "promptHash" TEXT,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "responseId" TEXT,
  ADD COLUMN "inputTokens" INTEGER,
  ADD COLUMN "outputTokens" INTEGER,
  ADD COLUMN "costKnown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "costMicros" BIGINT,
  ADD COLUMN "latencyMs" INTEGER,
  ADD COLUMN "completedAt" TIMESTAMP(3);

-- Legacy rows were request-bound logs, not active durable attempts. Preserve
-- what can be inferred without inventing provider or usage information.
UPDATE "AiRun"
SET "status" = CASE
      WHEN "response" IS NOT NULL THEN 'SUCCEEDED'
      WHEN "error" IS NOT NULL THEN 'FAILED'
      ELSE 'LEGACY_UNKNOWN'
    END,
    "completedAt" = "createdAt";

CREATE TABLE "DecisionRun" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "trigger" "BrainRunTrigger" NOT NULL,
  "status" "BrainRunStatus" NOT NULL DEFAULT 'QUEUED',
  "suggestionId" TEXT NOT NULL,
  "workerId" TEXT,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contextSnapshot" JSONB,
  "contextHash" TEXT,
  "promptHash" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DecisionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DecisionRun_attempt_bounds" CHECK ("attemptCount" >= 0 AND "maxAttempts" BETWEEN 1 AND 10),
  CONSTRAINT "DecisionRun_lease_shape" CHECK (
    ("status" = 'RUNNING' AND "leaseToken" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)
    OR "status" <> 'RUNNING'
  )
);

CREATE TABLE "ToddActivity" (
  "id" TEXT NOT NULL,
  "decisionRunId" TEXT,
  "type" "ToddActivityKind" NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'backend',
  "reason" TEXT NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToddActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToddActivity_time_order" CHECK ("endsAt" > "startedAt")
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "decisionRunId" TEXT,
  "type" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "workerId" TEXT,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboxEvent_attempt_bounds" CHECK ("attemptCount" >= 0 AND "maxAttempts" BETWEEN 1 AND 20)
);

CREATE TABLE "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "RateLimitBucket_count_nonnegative" CHECK ("count" >= 0)
);

CREATE UNIQUE INDEX "DecisionRun_idempotencyKey_key" ON "DecisionRun"("idempotencyKey");
CREATE INDEX "DecisionRun_status_nextAttemptAt_createdAt_idx" ON "DecisionRun"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "DecisionRun_leaseExpiresAt_idx" ON "DecisionRun"("leaseExpiresAt");
CREATE INDEX "DecisionRun_suggestionId_createdAt_idx" ON "DecisionRun"("suggestionId", "createdAt");
CREATE UNIQUE INDEX "DecisionRun_one_live_per_suggestion" ON "DecisionRun"("suggestionId") WHERE "status" IN ('QUEUED', 'RUNNING', 'RETRYING');
CREATE UNIQUE INDEX "SiteConfig_one_active" ON "SiteConfig"("isActive") WHERE "isActive" = true;
CREATE INDEX "SiteConfig_parentConfigId_idx" ON "SiteConfig"("parentConfigId");

CREATE UNIQUE INDEX "Decision_decisionRunId_key" ON "Decision"("decisionRunId");
CREATE UNIQUE INDEX "AiRun_decisionRunId_attemptNumber_key" ON "AiRun"("decisionRunId", "attemptNumber");
CREATE INDEX "Memory_sourceRunId_idx" ON "Memory"("sourceRunId");

CREATE UNIQUE INDEX "ToddActivity_decisionRunId_key" ON "ToddActivity"("decisionRunId");
CREATE INDEX "ToddActivity_isCurrent_endsAt_idx" ON "ToddActivity"("isCurrent", "endsAt");
CREATE UNIQUE INDEX "ToddActivity_one_current" ON "ToddActivity"("isCurrent") WHERE "isCurrent" = true;

CREATE UNIQUE INDEX "OutboxEvent_dedupeKey_key" ON "OutboxEvent"("dedupeKey");
CREATE INDEX "OutboxEvent_status_nextAttemptAt_createdAt_idx" ON "OutboxEvent"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "OutboxEvent_leaseExpiresAt_idx" ON "OutboxEvent"("leaseExpiresAt");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

ALTER TABLE "DecisionRun"
  ADD CONSTRAINT "DecisionRun_suggestionId_fkey"
  FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Decision"
  ADD CONSTRAINT "Decision_decisionRunId_fkey"
  FOREIGN KEY ("decisionRunId") REFERENCES "DecisionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiRun"
  ADD CONSTRAINT "AiRun_decisionRunId_fkey"
  FOREIGN KEY ("decisionRunId") REFERENCES "DecisionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToddActivity"
  ADD CONSTRAINT "ToddActivity_decisionRunId_fkey"
  FOREIGN KEY ("decisionRunId") REFERENCES "DecisionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_decisionRunId_fkey"
  FOREIGN KEY ("decisionRunId") REFERENCES "DecisionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SiteConfig"
  ADD CONSTRAINT "SiteConfig_parentConfigId_fkey"
  FOREIGN KEY ("parentConfigId") REFERENCES "SiteConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
