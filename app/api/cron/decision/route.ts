import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runBrainTick } from "@/lib/worker/tick";

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
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runBrainTick(`cron_${Date.now()}`));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Brain tick failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
