import { NextRequest, NextResponse } from "next/server";

import { runDecisionWorker } from "@/lib/autonomy";
import { cronAuthorization } from "@/lib/security/request";

export const dynamic = "force-dynamic";

async function handler(request: NextRequest) {
  const auth = cronAuthorization(
    process.env.CRON_SECRET,
    request.headers.get("authorization"),
  );
  if (auth === "misconfigured") {
    return NextResponse.json(
      { ok: false, error: "Cron authentication is not configured." },
      { status: 503 },
    );
  }
  if (auth === "unauthorized") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  try {
    const result = await runDecisionWorker(
      `cron:${process.env.VERCEL_REGION ?? "local"}`,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Decision worker is unavailable." },
      { status: 503 },
    );
  }
}

export const GET = handler;
export const POST = handler;
