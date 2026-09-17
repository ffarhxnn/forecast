"use client";

import { useCallback, useEffect, useState } from "react";

// Small localStorage-backed state. Falls back to memory if storage is blocked.
export function useStoredList(key: string) {
  const [items, setItems] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
    setLoaded(true);
    const onChange = (e: StorageEvent) => {
      if (e.key === key) setItems(e.newValue ? JSON.parse(e.newValue) : []);
    };
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, [key]);

  const save = useCallback(
    (next: string[]) => {
      setItems(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  );

  return { items, save, loaded };
}

export const INTERESTS_KEY = "forecast:interests";
export const WATCHLIST_KEY = "forecast:watchlist";
