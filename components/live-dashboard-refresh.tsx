"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_EVENTS = [
  "suggestion.created",
  "suggestion.supported",
  "suggestion.considering",
  "decision.made",
  "thought.created",
  "config.updated",
  "config.rolled_back",
  "social.posted",
] as const;

/**
 * Refreshes server-rendered dashboard data when Todd's public state changes.
 * This preserves scroll and client state; it is not a full browser reload.
 */
export function LiveDashboardRefresh() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/events");
    const seen = new Set<string>();
    let refreshTimer: number | undefined;

    const refresh = (event: Event) => {
      const id = (event as MessageEvent).lastEventId;
      if (id && seen.has(id)) return;
      if (id) seen.add(id);

      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => router.refresh(), 250);
    };

    for (const eventName of REFRESH_EVENTS) {
      source.addEventListener(eventName, refresh);
    }

    return () => {
      window.clearTimeout(refreshTimer);
      for (const eventName of REFRESH_EVENTS) {
        source.removeEventListener(eventName, refresh);
      }
      source.close();
    };
  }, [router]);

  return null;
}
