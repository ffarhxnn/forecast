"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/components/analytics";
import { MoveTrack } from "@/components/move-track";
import { INTERESTS_KEY, WATCHLIST_KEY, useStoredList } from "@/components/storage";
import { CATEGORIES, type Category } from "@/lib/categories";
import { pct, pointChange, usd } from "@/lib/format";

export type LiteMarket = {
  id: string;
  question: string;
  eventTitle: string | null;
  category: Category;
  price: number | null;
  priceThen: number | null;
  move: number | null;
  volume24h: number;
  score: number;
};

type Tab = "trending" | "movers" | "volume" | "foryou" | "watchlist";

const TABS: { id: Tab; label: string }[] = [
  { id: "foryou", label: "For you" },
  { id: "trending", label: "Trending" },
  { id: "movers", label: "Biggest moves" },
  { id: "volume", label: "Most traded" },
  { id: "watchlist", label: "Watchlist" },
];

const PAGE = 40;
// Markets need some real trading before a price move counts as news.
const MIN_VOLUME_FOR_MOVERS = 10_000;

export function Discover({ markets }: { markets: LiteMarket[] }) {
  const interests = useStoredList(INTERESTS_KEY);
  const watchlist = useStoredList(WATCHLIST_KEY);
  const [tab, setTab] = useState<Tab>("trending");
  const [category, setCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [editingInterests, setEditingInterests] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  // Returning visitors with saved interests land on their feed.
  useEffect(() => {
    if (interests.loaded && interests.items.length > 0) setTab("foryou");
  }, [interests.loaded, interests.items.length]);

  useEffect(() => setShown(PAGE), [tab, category, query]);

  // Record searches once typing pauses, not on every keystroke.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => track("search_performed", { query: query.trim() }), 800);
    return () => clearTimeout(t);
  }, [query]);

  const topMover = useMemo(
    () =>
      markets
        .filter((m) => m.move != null && m.volume24h >= MIN_VOLUME_FOR_MOVERS)
        .sort((a, b) => Math.abs(b.move!) - Math.abs(a.move!))[0],
    [markets],
  );

  const list = useMemo(() => {
    let rows = markets;
    if (category !== "All") rows = rows.filter((m) => m.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          (m.eventTitle ?? "").toLowerCase().includes(q),
      );
    }
    switch (tab) {
      case "movers":
        return rows
          .filter((m) => m.move != null && m.volume24h >= MIN_VOLUME_FOR_MOVERS)
          .sort((a, b) => Math.abs(b.move!) - Math.abs(a.move!));
      case "volume":
        return [...rows].sort((a, b) => b.volume24h - a.volume24h);
      case "watchlist": {
        const ids = new Set(watchlist.items);
        return rows.filter((m) => ids.has(m.id));
      }
      case "foryou": {
        // Personal ranking: markets in chosen categories first, then by trending score.
        const chosen = new Set(interests.items);
        return rows
          .filter((m) => chosen.has(m.category))
          .sort((a, b) => b.score - a.score);
      }
      default:
        return rows; // already sorted by trending score on the server
    }
  }, [markets, tab, category, query, interests.items, watchlist.items]);

  function openInterests() {
    setDraft(interests.items);
    setEditingInterests(true);
  }

  function saveInterests() {
    interests.save(draft);
    setEditingInterests(false);
    setTab("foryou");
    track("interests_saved", { interests: draft, count: draft.length });
  }

  function selectTab(next: Tab) {
    setTab(next);
    track("tab_selected", { tab: next });
  }

  const needsInterests = tab === "foryou" && interests.loaded && interests.items.length === 0;

  if (markets.length === 0) {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <h2>No market data yet</h2>
        <p>
          The collector hasn&apos;t saved a snapshot in the last 6 hours. Run it once, or check
          that the hourly GitHub Action is enabled.
        </p>
      </div>
    );
  }

  return (
    <>
      {topMover ? (
        <section className="hero" aria-labelledby="hero-title">
          <p className="hero-kicker">Biggest move in the last 24 hours</p>
          <h1 id="hero-title">
            <Link
              href={`/market/${topMover.id}`}
              onClick={() => track("market_clicked", { id: topMover.id, source: "hero" })}
            >
              {topMover.question}
            </Link>
          </h1>
          <div className="hero-odds">
            <div className="hero-price">{pct(topMover.price)}</div>
            <div className={`hero-delta ${topMover.move! > 0 ? "up-text" : "down-text"}`}>
              {pointChange(topMover.move)} from {pct(topMover.priceThen)}
            </div>
          </div>
          <div className="hero-track">
            <MoveTrack from={topMover.priceThen} to={topMover.price} size="hero" />
            <div className="track-scale" aria-hidden>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          <p className="hero-meta">{usd(topMover.volume24h)} traded in the last 24 hours</p>
        </section>
      ) : (
        <section className="hero">
          <h1>What the world is betting on right now</h1>
          <p className="hero-meta">
            Price moves appear once a few hours of snapshots have been collected.
          </p>
        </section>
      )}

      <div className="controls">
        <div className="tabs" role="toolbar" aria-label="Sort markets">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="tab"
              aria-pressed={tab === t.id}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
              {t.id === "watchlist" && watchlist.items.length > 0 && ` (${watchlist.items.length})`}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <div className="chips" role="toolbar" aria-label="Filter by category">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                className="chip"
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  track("category_selected", { category: c });
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            placeholder="Search markets"
            aria-label="Search markets"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {(needsInterests || editingInterests) && (
        <section className="interests" aria-labelledby="interests-title">
          <h2 id="interests-title">What do you follow?</h2>
          <p>Pick a few topics and your feed will lead with them.</p>
          <div className="chips">
            {CATEGORIES.map((c) => {
              const on = (editingInterests ? draft : []).includes(c);
              return (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={on}
                  onClick={() => {
                    if (!editingInterests) {
                      setEditingInterests(true);
                      setDraft([c]);
                      return;
                    }
                    setDraft(on ? draft.filter((d) => d !== c) : [...draft, c]);
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <button className="button" disabled={draft.length === 0} onClick={saveInterests}>
            Save topics
          </button>
          {editingInterests && interests.items.length > 0 && (
            <button
              className="button secondary"
              style={{ marginLeft: 8 }}
              onClick={() => setEditingInterests(false)}
            >
              Cancel
            </button>
          )}
        </section>
      )}

      {tab === "foryou" && interests.items.length > 0 && !editingInterests && (
        <p className="muted" style={{ margin: "0 0 12px" }}>
          Showing {interests.items.join(", ")}.{" "}
          <button className="tab" style={{ padding: 0 }} onClick={openInterests}>
            Edit topics
          </button>
        </p>
      )}

      {!needsInterests &&
        (list.length === 0 ? (
          <div className="empty">
            <h2>{tab === "watchlist" ? "Your watchlist is empty" : "No markets match"}</h2>
            <p>
              {tab === "watchlist"
                ? "Open any market and choose Watch to keep it here."
                : "Try a different category or search term."}
            </p>
          </div>
        ) : (
          <div className="list">
            <div className="list-head" aria-hidden>
              <span>#</span>
              <span>Market</span>
              <span>Odds, 24h</span>
              <span>Now</span>
              <span>Change</span>
              <span>24h vol.</span>
            </div>
            {list.slice(0, shown).map((m, i) => (
              <Link
                key={m.id}
                href={`/market/${m.id}`}
                className="row"
                onClick={() =>
                  track(tab === "foryou" ? "recommendation_clicked" : "market_clicked", {
                    id: m.id,
                    tab,
                    position: i + 1,
                    category: m.category,
                  })
                }
              >
                <span className="rank">{i + 1}</span>
                <div className="title-cell">
                  <div className="row-title">{m.question}</div>
                  <div className="row-sub">
                    {m.category}
                    {m.eventTitle && m.eventTitle !== m.question ? `, ${m.eventTitle}` : ""}
                  </div>
                </div>
                <MoveTrack from={m.priceThen} to={m.price} />
                <span className="num price">{pct(m.price)}</span>
                <span
                  className={`num change ${
                    m.move == null ? "muted" : m.move > 0 ? "up-text" : m.move < 0 ? "down-text" : "muted"
                  }`}
                >
                  {pointChange(m.move)}
                </span>
                <span className="num vol muted">{usd(m.volume24h)}</span>
              </Link>
            ))}
            {list.length > shown && (
              <button className="more" onClick={() => setShown(shown + PAGE)}>
                Show {Math.min(PAGE, list.length - shown)} more
              </button>
            )}
          </div>
        ))}
    </>
  );
}
