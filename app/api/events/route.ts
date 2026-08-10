import { NextResponse } from "next/server";
import {
  getActiveToddActivity,
  listRecentOutbox,
  publishOutboxBatch,
} from "@/lib/activity";
import { hasDatabase } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL required for live events" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lastEventId =
    request.headers.get("last-event-id") ??
    searchParams.get("lastEventId") ??
    undefined;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let cursorId = lastEventId;

      const send = (event: string, data: unknown, id?: string) => {
        const payload =
          `${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        await publishOutboxBatch();
        const activity = await getActiveToddActivity();
        send("hello", {
          ok: true,
          activity: activity
            ? {
                id: activity.id,
                activityId: activity.activityId,
                room: activity.room,
                label: activity.label,
                reason: activity.reason,
                startAt: activity.startAt,
                endAt: activity.endAt,
              }
            : null,
        });

        if (cursorId) {
          const missed = await listRecentOutbox(cursorId, 30);
          for (const item of missed) {
            send(item.type, item.payload, item.id);
            cursorId = item.id;
          }
        } else {
          // New viewers hydrate from "hello"; historical events should not
          // trigger a burst of stale dashboard refreshes.
          const latest = await listRecentOutbox(undefined, 1);
          cursorId = latest[0]?.id;
        }

        const timer = setInterval(async () => {
          try {
            await publishOutboxBatch();
            const events = cursorId
              ? await listRecentOutbox(cursorId, 50)
              : await listRecentOutbox(undefined, 1);
            for (const event of events) {
              send(event.type, event.payload, event.id);
              cursorId = event.id;
            }
            const current = await getActiveToddActivity();
            if (current) {
              send("activity.heartbeat", {
                activityId: current.activityId,
                endAt: current.endAt,
              });
            }
          } catch {
            send("error", { message: "event poll failed" });
          }
        }, 5000);

        const close = () => {
          clearInterval(timer);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        };
        request.signal.addEventListener("abort", close);
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "SSE failed",
        });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
