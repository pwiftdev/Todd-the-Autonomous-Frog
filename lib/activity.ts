import { prisma } from "@/lib/prisma";
import { worldActivities } from "@/lib/todd-world";

export async function enqueueOutbox(type: string, payload: unknown) {
  return prisma.outboxEvent.create({
    data: {
      type,
      payload: payload as object,
    },
  });
}

export async function publishOutboxBatch(limit = 50) {
  const events = await prisma.outboxEvent.findMany({
    where: {
      publishedAt: null,
      NOT: { type: { in: ["social.consider"] } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const now = new Date();
  for (const event of events) {
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        publishedAt: now,
        attempts: { increment: 1 },
      },
    });
  }
  return events;
}

export async function listRecentOutbox(sinceId?: string, limit = 40) {
  const publicTypes = {
    notIn: ["social.consider"],
  };
  if (sinceId) {
    const since = await prisma.outboxEvent.findUnique({ where: { id: sinceId } });
    if (since) {
      return prisma.outboxEvent.findMany({
        where: {
          type: publicTypes,
          publishedAt: { not: null },
          createdAt: { gt: since.createdAt },
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
    }
  }
  return prisma.outboxEvent.findMany({
    where: {
      type: publicTypes,
      publishedAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function resolveWorldActivity(activityId?: string | null) {
  if (!activityId) return null;
  return worldActivities.find((item) => item.id === activityId) ?? null;
}

export async function setToddActivity(input: {
  activityId: string;
  reason: string;
  thoughtId?: string | null;
  durationSeconds?: number;
}) {
  const activity = resolveWorldActivity(input.activityId);
  if (!activity) return null;
  const duration =
    input.durationSeconds ??
    Math.round((activity.minimumDuration + activity.maximumDuration) / 2);
  const endAt = new Date(Date.now() + duration * 1000);

  await prisma.toddActivity.updateMany({
    where: { status: "ACTIVE" },
    data: { status: "INTERRUPTED", endAt: new Date() },
  });

  const record = await prisma.toddActivity.create({
    data: {
      activityId: activity.id,
      room: activity.room,
      label: activity.label,
      reason: input.reason,
      thoughtId: input.thoughtId ?? null,
      status: "ACTIVE",
      endAt,
    },
  });

  await prisma.toddState.update({
    where: { id: "todd" },
    data: { currentStatus: activity.label },
  });

  await enqueueOutbox("activity.updated", {
    id: record.id,
    activityId: record.activityId,
    room: record.room,
    label: record.label,
    reason: record.reason,
    startAt: record.startAt,
    endAt: record.endAt,
  });

  return record;
}

export async function getActiveToddActivity() {
  const active = await prisma.toddActivity.findFirst({
    where: { status: "ACTIVE", endAt: { gt: new Date() } },
    orderBy: { startAt: "desc" },
  });
  if (active) return active;
  await prisma.toddActivity.updateMany({
    where: { status: "ACTIVE", endAt: { lte: new Date() } },
    data: { status: "COMPLETED" },
  });
  return null;
}
