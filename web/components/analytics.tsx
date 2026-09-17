"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

let ready = false;

export function AnalyticsProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || ready) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: "history_change",
      persistence: "localStorage",
    });
    ready = true;
  }, []);
  return null;
}

// Product events: see README "Analytics" for the funnel these feed.
export type TrackEvent =
  | "market_clicked"
  | "tab_selected"
  | "category_selected"
  | "search_performed"
  | "interests_saved"
  | "watch_added"
  | "watch_removed"
  | "recommendation_clicked";

export function track(event: TrackEvent, properties?: Record<string, unknown>) {
  if (ready) posthog.capture(event, properties);
}
