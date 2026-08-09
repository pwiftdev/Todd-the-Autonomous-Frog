import { NextRequest, NextResponse } from "next/server";

import { enqueueDecisionCycle } from "@/lib/autonomy";
import { cronIdempotencyKey } from "@/lib/brain/scheduler";
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
    const result = await enqueueDecisionCycle({
      idempotencyKey: cronIdempotencyKey(),
      trigger: "CRON",
    });
    return NextResponse.json(
      { ok: true, ...result },
      {
        status: ["queued", "running", "retrying"].includes(result.status)
          ? 202
          : 200,
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Decision queue is unavailable." },
      { status: 503 },
    );
  }
}

export const GET = handler;
export const POST = handler;
