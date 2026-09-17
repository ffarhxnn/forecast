import { unstable_cache } from "next/cache";
import { categorize, type Category } from "./categories";
import { getSql } from "./db";

export type Market = {
  id: string;
  question: string;
  slug: string | null;
  eventId: string | null;
  eventTitle: string | null;
  outcome: string;
  category: Category;
  price: number | null;
  priceThen: number | null;
  move: number | null;          // price change since `since`, in probability units
  since: string | null;         // time of the comparison snapshot
  volume24h: number;
  volume24hThen: number | null;
  liquidity: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  endDate: string | null;
  score: number;                // trending score, 0–1
};

type Row = {
  id: string;
  question: string | null;
  slug: string | null;
  end_date: Date | null;
  event_id: string | null;
  event_title: string | null;
  outcomes: string | null;
  price: number | null;
  best_bid: number | null;
  best_ask: number | null;
  volume_24h: number | null;
  liquidity: number | null;
  price_then: number | null;
  volume_24h_then: number | null;
  since: Date | null;
};

function firstOutcome(outcomes: string | null): string {
  try {
    const list = JSON.parse(outcomes ?? "[]");
    return typeof list[0] === "string" ? list[0] : "Yes";
  } catch {
    return "Yes";
  }
}

// Percentile rank (0–1) of each value. Puts features with very different
// scales and heavy tails (dollars vs. probability points) on equal footing.
function percentileRanks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(values.length);
  const denom = Math.max(values.length - 1, 1);
  order.forEach(([, i], position) => (ranks[i] = position / denom));
  return ranks;
}

// Trending = where attention is right now:
//   40% how much is being traded today
//   35% how far the probability moved
//   25% whether trading is accelerating versus earlier snapshots
const WEIGHTS = { activity: 0.4, move: 0.35, acceleration: 0.25 };

function scoreMarkets(markets: Market[]): Market[] {
  const activity = percentileRanks(markets.map((m) => m.volume24h));
  const move = percentileRanks(markets.map((m) => Math.abs(m.move ?? 0)));
  const acceleration = percentileRanks(
    markets.map((m) => (m.volume24hThen ? m.volume24h / Math.max(m.volume24hThen, 1) : 1)),
  );
  return markets.map((m, i) => ({
    ...m,
    score:
      WEIGHTS.activity * activity[i] +
      WEIGHTS.move * move[i] +
      WEIGHTS.acceleration * acceleration[i],
  }));
}

async function loadMarkets(): Promise<Market[]> {
  const sql = getSql();
  const rows = await sql<Row[]>`
    with latest as (
      select distinct on (market_id)
        market_id, price_yes, best_bid, best_ask, volume_24h, liquidity
      from market_snapshots
      where captured_at > now() - interval '6 hours'
      order by market_id, captured_at desc
    )
    select
      l.market_id as id,
      m.question,
      m.slug,
      m.end_date,
      m.raw -> 'events' -> 0 ->> 'id'    as event_id,
      m.raw -> 'events' -> 0 ->> 'title' as event_title,
      m.raw ->> 'outcomes'               as outcomes,
      l.price_yes::float8  as price,
      l.best_bid::float8   as best_bid,
      l.best_ask::float8   as best_ask,
      l.volume_24h::float8 as volume_24h,
      l.liquidity::float8  as liquidity,
      p.price_yes::float8  as price_then,
      p.volume_24h::float8 as volume_24h_then,
      p.captured_at        as since
    from latest l
    join markets m on m.id = l.market_id
    left join lateral (
      select price_yes, volume_24h, captured_at
      from market_snapshots s
      where s.market_id = l.market_id
        and s.captured_at >= now() - interval '24 hours'
      order by s.captured_at asc
      limit 1
    ) p on true
    where (m.end_date is null or m.end_date > now())
      and coalesce(m.raw ->> 'closed', 'false') <> 'true'
  `;

  const markets: Market[] = rows.map((r) => {
    const hasHistory = r.since != null && Date.now() - r.since.getTime() > 30 * 60 * 1000;
    const move = hasHistory && r.price != null && r.price_then != null ? r.price - r.price_then : null;
    return {
      id: r.id,
      question: r.question ?? "Untitled market",
      slug: r.slug,
      eventId: r.event_id,
      eventTitle: r.event_title,
      outcome: firstOutcome(r.outcomes),
      category: categorize(r.question, r.event_title),
      price: r.price,
      priceThen: hasHistory ? r.price_then : null,
      move,
      since: hasHistory && r.since ? r.since.toISOString() : null,
      volume24h: r.volume_24h ?? 0,
      volume24hThen: hasHistory ? r.volume_24h_then : null,
      liquidity: r.liquidity,
      bestBid: r.best_bid,
      bestAsk: r.best_ask,
      endDate: r.end_date ? r.end_date.toISOString() : null,
      score: 0,
    };
  });

  return scoreMarkets(markets).sort((a, b) => b.score - a.score);
}

// Cached for 5 minutes; the collector only adds data once an hour.
export const getMarkets = unstable_cache(loadMarkets, ["markets"], { revalidate: 300 });

export type MarketDetail = {
  market: Market;
  tokenIds: string[];
  outcomes: string[];
  description: string | null;
  snapshots: { t: string; price: number | null; volume24h: number | null }[];
};

export async function getMarketDetail(id: string): Promise<MarketDetail | null> {
  const markets = await getMarkets();
  const market = markets.find((m) => m.id === id);
  if (!market) return null;

  const sql = getSql();
  const [meta] = await sql<{ clob_token_ids: unknown; outcomes: string | null; description: string | null }[]>`
    select clob_token_ids, raw ->> 'outcomes' as outcomes, raw ->> 'description' as description
    from markets where id = ${id}
  `;
  const snapshots = await sql<{ t: Date; price: number | null; volume24h: number | null }[]>`
    select captured_at as t, price_yes::float8 as price, volume_24h::float8 as "volume24h"
    from market_snapshots
    where market_id = ${id} and captured_at > now() - interval '7 days'
    order by captured_at
  `;

  return {
    market,
    tokenIds: parseList(meta?.clob_token_ids),
    outcomes: parseList(meta?.outcomes),
    description: meta?.description ?? null,
    snapshots: snapshots.map((s) => ({ ...s, t: s.t.toISOString() })),
  };
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function relatedMarkets(all: Market[], market: Market, limit = 6): Market[] {
  const sameEvent = market.eventId
    ? all.filter((m) => m.eventId === market.eventId && m.id !== market.id)
    : [];
  const sameCategory = all.filter(
    (m) => m.category === market.category && m.id !== market.id && m.eventId !== market.eventId,
  );
  return [...sameEvent, ...sameCategory].slice(0, limit);
}
