import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getActiveToddActivity } from "@/lib/activity";
import { hasDatabase } from "@/lib/config";
import { prisma } from "@/lib/prisma";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!expected) return process.env.NODE_ENV === "development";
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "No database" }, { status: 503 });
  }

  const [state, activity, pending, latestCycle, usage] = await Promise.all([
    prisma.toddState.findUnique({ where: { id: "todd" } }),
    getActiveToddActivity(),
    prisma.suggestion.count({ where: { status: "PENDING" } }),
    prisma.brainCycle.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.usageLedger.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    state,
    activity,
    pending,
    latestCycle,
    usage,
  });
}
