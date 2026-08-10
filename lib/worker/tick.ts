import {
  ensureRoomActivity,
  runDailyReflection,
  runDecisionCycle,
  runMemoryMaintenance,
  runObservationCycle,
  runSocialCycle,
} from "@/lib/autonomy";
import { publishOutboxBatch } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import {
  beginBrainCycle,
  completeBrainCycle,
  failBrainCycle,
  withWorkerLease,
} from "@/lib/worker/lease";

function minutesSince(date?: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - date.getTime()) / 60_000;
}

function hourBucket(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

function dayBucket(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function runJob(
  jobType:
    | "SUGGESTION_REVIEW"
    | "OBSERVATION"
    | "SOCIAL"
    | "DAILY_REFLECTION"
    | "MEMORY_MAINTENANCE"
    | "ROOM_TRANSITION",
  idempotencyKey: string,
  owner: string,
  fn: () => Promise<unknown>,
) {
  const cycle = await beginBrainCycle({ jobType, idempotencyKey, owner });
  if (!cycle) return { skipped: true as const, jobType, reason: "duplicate" };
  try {
    const result = await fn();
    await completeBrainCycle(cycle.id, result ?? {});
    return { skipped: false as const, jobType, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed";
    await failBrainCycle(cycle.id, message);
    return { skipped: false as const, jobType, error: message };
  }
}

export async function runBrainTick(owner = `tick_${process.pid}`) {
  if (!process.env.DATABASE_URL) {
    return {
      acquired: false as const,
      message: "DATABASE_URL missing; brain tick skipped.",
    };
  }

  const leased = await withWorkerLease("brain-tick", owner, async () => {
    const state = await prisma.toddState.findUnique({ where: { id: "todd" } });
    if (!state) {
      return { message: "ToddState missing. Seed the database first." };
    }
    if (state.autonomyPaused) {
      await publishOutboxBatch();
      return { message: "Autonomy paused.", jobs: [] as unknown[] };
    }

    const jobs: unknown[] = [];
    const nextSuggestion = await prisma.suggestion.findFirst({
      where: { status: "PENDING" },
      orderBy: [{ supportCount: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (nextSuggestion) {
      // Key per suggestion so a new post is never blocked by an earlier
      // same-hour review that happened to leave the same pending count.
      jobs.push(
        await runJob(
          "SUGGESTION_REVIEW",
          `suggestion-review:${nextSuggestion.id}`,
          owner,
          () => runDecisionCycle(),
        ),
      );
    }

    if (minutesSince(state.lastObservationAt) >= 45) {
      jobs.push(
        await runJob(
          "OBSERVATION",
          `observation:${hourBucket()}`,
          owner,
          () => runObservationCycle(),
        ),
      );
    }

    const socialDue = await prisma.outboxEvent.findFirst({
      where: { type: "social.consider", publishedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (socialDue || minutesSince(state.lastSocialAt) >= 180) {
      const payload = socialDue?.payload as { event?: string } | null;
      jobs.push(
        await runJob(
          "SOCIAL",
          `social:${dayBucket()}:${socialDue?.id ?? "scheduled"}`,
          owner,
          () => runSocialCycle(payload?.event),
        ),
      );
      if (socialDue) {
        await prisma.outboxEvent.update({
          where: { id: socialDue.id },
          data: { publishedAt: new Date(), attempts: { increment: 1 } },
        });
      }
    }

    if (minutesSince(state.lastReflectionAt) >= 60 * 20) {
      jobs.push(
        await runJob(
          "DAILY_REFLECTION",
          `reflection:${dayBucket()}`,
          owner,
          () => runDailyReflection(),
        ),
      );
      jobs.push(
        await runJob(
          "MEMORY_MAINTENANCE",
          `memory:${dayBucket()}`,
          owner,
          () => runMemoryMaintenance(),
        ),
      );
    }

    jobs.push(
      await runJob(
        "ROOM_TRANSITION",
        `room:${hourBucket()}`,
        owner,
        () => ensureRoomActivity(),
      ),
    );

    await publishOutboxBatch();
    await prisma.toddState.update({
      where: { id: "todd" },
      data: { lastBrainTickAt: new Date() },
    });

    return { message: "Brain tick complete.", jobs };
  });

  if (!leased.acquired) {
    return {
      acquired: false as const,
      message: "Another worker holds the brain-tick lease.",
    };
  }
  return { acquired: true as const, ...leased.result };
}
