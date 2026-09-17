"use client";

import { track } from "@/components/analytics";
import { WATCHLIST_KEY, useStoredList } from "@/components/storage";

export function WatchButton({ id }: { id: string }) {
  const { items, save, loaded } = useStoredList(WATCHLIST_KEY);
  const watching = items.includes(id);

  return (
    <button
      className={watching ? "button secondary" : "button"}
      disabled={!loaded}
      aria-pressed={watching}
      onClick={() => {
        if (watching) {
          save(items.filter((x) => x !== id));
          track("watch_removed", { id });
        } else {
          save([...items, id]);
          track("watch_added", { id });
        }
      }}
    >
      {watching ? "Watching" : "Watch"}
    </button>
  );
}
