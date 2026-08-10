-- CreateEnum
CREATE TYPE "BrainJobType" AS ENUM ('TICK', 'SUGGESTION_REVIEW', 'OBSERVATION', 'SOCIAL', 'DAILY_REFLECTION', 'MEMORY_MAINTENANCE', 'ROOM_TRANSITION');

-- CreateEnum
CREATE TYPE "BrainCycleStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'INTERRUPTED');

-- AlterTable
ALTER TABLE "AiRun" ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "latencyMs" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER;

-- AlterTable
ALTER TABLE "ToddState" ADD COLUMN     "lastBrainTickAt" TIMESTAMP(3),
ADD COLUMN     "lastObservationAt" TIMESTAMP(3),
ADD COLUMN     "lastReflectionAt" TIMESTAMP(3),
ADD COLUMN     "lastSocialAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BrainCycle" (
    "id" TEXT NOT NULL,
    "jobType" "BrainJobType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "BrainCycleStatus" NOT NULL DEFAULT 'PENDING',
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerLease" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToddActivity" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "thoughtId" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'ACTIVE',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToddActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLedger" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainCycle_idempotencyKey_key" ON "BrainCycle"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BrainCycle_jobType_createdAt_idx" ON "BrainCycle"("jobType", "createdAt");

-- CreateIndex
CREATE INDEX "BrainCycle_status_createdAt_idx" ON "BrainCycle"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ToddActivity_status_startAt_idx" ON "ToddActivity"("status", "startAt");

-- CreateIndex
CREATE INDEX "ToddActivity_createdAt_idx" ON "ToddActivity"("createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_type_createdAt_idx" ON "OutboxEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLedger_aiRunId_key" ON "UsageLedger"("aiRunId");

-- CreateIndex
CREATE INDEX "UsageLedger_createdAt_idx" ON "UsageLedger"("createdAt");

-- CreateIndex
CREATE INDEX "UsageLedger_provider_createdAt_idx" ON "UsageLedger"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "DailyJournal_createdAt_idx" ON "DailyJournal"("createdAt");

-- CreateIndex
CREATE INDEX "Memory_importance_createdAt_idx" ON "Memory"("importance", "createdAt");

-- CreateIndex
CREATE INDEX "Suggestion_status_supportCount_idx" ON "Suggestion"("status", "supportCount");

-- AddForeignKey
ALTER TABLE "UsageLedger" ADD CONSTRAINT "UsageLedger_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
