import { prisma } from "@/lib/prisma";

const DEFAULT_LEASE_MS = 55_000;

export async function withWorkerLease<T>(
  leaseId: string,
  owner: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_LEASE_MS,
): Promise<{ acquired: false } | { acquired: true; result: T }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const existing = await prisma.workerLease.findUnique({
    where: { id: leaseId },
  });

  if (existing && existing.expiresAt > now && existing.owner !== owner) {
    return { acquired: false };
  }

  await prisma.workerLease.upsert({
    where: { id: leaseId },
    create: { id: leaseId, owner, expiresAt },
    update: { owner, expiresAt },
  });

  try {
    const result = await fn();
    return { acquired: true, result };
  } finally {
    const current = await prisma.workerLease.findUnique({
      where: { id: leaseId },
    });
    if (current?.owner === owner) {
      await prisma.workerLease.update({
        where: { id: leaseId },
        data: { expiresAt: new Date() },
      });
    }
  }
}

export async function beginBrainCycle(input: {
  jobType:
    | "TICK"
    | "SUGGESTION_REVIEW"
    | "OBSERVATION"
    | "SOCIAL"
    | "DAILY_REFLECTION"
    | "MEMORY_MAINTENANCE"
    | "ROOM_TRANSITION";
  idempotencyKey: string;
  owner: string;
}) {
  const existing = await prisma.brainCycle.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing?.status === "COMPLETED") return null;
  if (
    existing &&
    existing.status === "RUNNING" &&
    existing.leaseExpiresAt &&
    existing.leaseExpiresAt > new Date()
  ) {
    return null;
  }
  if (existing) {
    return prisma.brainCycle.update({
      where: { id: existing.id },
      data: {
        status: "RUNNING",
        leaseOwner: input.owner,
        leaseExpiresAt: new Date(Date.now() + DEFAULT_LEASE_MS),
        startedAt: new Date(),
        attempt: { increment: 1 },
        error: null,
      },
    });
  }

  try {
    return await prisma.brainCycle.create({
      data: {
        jobType: input.jobType,
        idempotencyKey: input.idempotencyKey,
        status: "RUNNING",
        leaseOwner: input.owner,
        leaseExpiresAt: new Date(Date.now() + DEFAULT_LEASE_MS),
        startedAt: new Date(),
        attempt: 1,
      },
    });
  } catch {
    // Race with another worker creating the same key.
    return null;
  }
}

export async function completeBrainCycle(
  id: string,
  result: unknown,
) {
  return prisma.brainCycle.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      result: result as object,
      leaseExpiresAt: new Date(),
    },
  });
}

export async function failBrainCycle(id: string, error: string) {
  const cycle = await prisma.brainCycle.findUniqueOrThrow({ where: { id } });
  const dead = cycle.attempt >= 5;
  return prisma.brainCycle.update({
    where: { id },
    data: {
      status: dead ? "DEAD" : "FAILED",
      completedAt: new Date(),
      error,
      leaseExpiresAt: new Date(),
    },
  });
}
