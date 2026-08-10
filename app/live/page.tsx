import type { Metadata } from "next";
import { LiveDashboardRefresh } from "@/components/live-dashboard-refresh";
import { ToddRoom } from "@/components/todd-room";
import { WatcherRail } from "@/components/watcher-rail";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todd Live",
  description: "Fullscreen live view of Todd’s world and watcher rail.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LiveStreamPage() {
  const data = await getToddData();
  const { config } = data;
  const latestThought = data.thoughts[0];

  return (
    <main
      className={`theme-${config.theme} accent-${config.accent} fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[var(--deep)] text-[var(--ink)]`}
    >
      <LiveDashboardRefresh />
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)]">
        <section className="relative h-full min-h-0 overflow-hidden bg-[#101f18]">
          <ToddRoom
            embed
            flush
            thought={latestThought?.content ?? "yo i exist. pond is mine fr"}
            requestedActivityId={data.currentActivity?.activityId}
            liveSync={data.mode === "live" || Boolean(data.currentActivity)}
          />
        </section>
        <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l border-black/10 bg-[var(--paper)]">
          <div className="flex items-end justify-between gap-3 border-b border-black/10 px-4 py-3">
            <div>
              <p className="eyebrow text-[var(--muted)]">todd live</p>
              <h1 className="display mt-1 text-3xl uppercase leading-none">
                right now
              </h1>
            </div>
            <p className="eyebrow text-[var(--muted)]">day {data.dayNumber}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
            <WatcherRail data={data} variant="stream" />
          </div>
        </aside>
      </div>
    </main>
  );
}
