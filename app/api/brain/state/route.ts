import { NextResponse } from "next/server";

import { getBrainState } from "@/lib/autonomy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...(await getBrainState()) });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mode: process.env.TODD_RUNTIME_MODE ?? "unconfigured",
        status: "unavailable",
      },
      { status: 503 },
    );
  }
}
