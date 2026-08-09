import { NextResponse } from "next/server";

import { getRuntimeConfig } from "@/lib/brain/runtime";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getRuntimeConfig();
    if (!config.databaseUrl) throw new Error("Database is not configured.");
    const [state, personality, activeConfig] = await Promise.all([
      prisma.toddState.findUnique({ where: { id: "todd" }, select: { id: true } }),
      prisma.personality.findUnique({
        where: { id: "personality" },
        select: { id: true },
      }),
      prisma.siteConfig.findFirst({
        where: { isActive: true },
        select: { id: true },
      }),
      // This query proves the durable-brain migration has been applied.
      prisma.decisionRun.findFirst({ select: { id: true } }),
    ]);
    if (!state || !personality || !activeConfig) {
      throw new Error("Brain genesis records are missing.");
    }
    return NextResponse.json({
      ok: true,
      status: "ready",
      mode: config.mode,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "unavailable",
        mode: process.env.TODD_RUNTIME_MODE ?? "unconfigured",
      },
      { status: 503 },
    );
  }
}
