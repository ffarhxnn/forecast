# Architecture and decisions

This is the "how it works and why" document. Each section ends with questions an
interviewer is likely to ask and short answers.

## 1. Data collection (`collector/collector.py`)

Every hour, GitHub Actions runs a Python script that:

1. Pages through open markets from Polymarket's Gamma API (`/markets/keyset`), 100 at a
   time, following the `next_cursor` it returns.
2. Asks the API to skip markets under $1K total volume (`volume_num_min`), then keeps
   only markets with at least $1K traded in the last 24 hours.
3. Writes to Postgres in one transaction:
   - `markets`: one row per market, overwritten each run (question, end date, token IDs,
     full raw JSON).
   - `market_snapshots`: one new row per market per run (price, bid, ask, volume,
     liquidity). This is the time series everything else is built on.

Failed requests retry with exponential backoff (1s, then 2s).

> **Why store snapshots?** The API only tells you the current state. To know whether
> trading is speeding up, I need past readings, so I record them myself.
>
> **Why the $1K filter?** About 178,000 markets are open, but most have no activity.
> Storing all of them hourly would fill the free database quickly, and fetching them all
> took 12 minutes.
>
> **Why `on conflict do update`?** It's an upsert: new markets get inserted, known ones get
> refreshed, and a rerun never creates duplicates.

## 2. Database (`db/schema.sql`)

- `market_snapshots` has primary key `(market_id, captured_at)`, which also serves as the
  index for "latest snapshot for this market" lookups.
- A separate index on `captured_at` speeds up "everything from the last few hours".
- Row Level Security is on, so Supabase's public API can't read the tables. The app and
  collector connect directly with the database password, which RLS doesn't restrict.

> **Why Postgres?** The data is relational (markets and their snapshots), I need
> time-range queries and joins, and Supabase hosts it for free.

## 3. Ranking (`web/lib/markets.ts`)

One SQL query loads, for every active market, its latest snapshot and its earliest
snapshot from the last 24 hours (a `lateral` join). The difference gives the price move
and the change in trading.

Trending score:

```
score = 0.40 × percentile(24h volume)
      + 0.35 × percentile(|price move|)
      + 0.25 × percentile(volume now ÷ volume at earlier snapshot)
```

> **Why percentiles?** Volume ranges from $1K to millions, while moves are between 0
> and 1. Raw values would let volume dominate regardless of weights. Percentiles put every
> feature on a 0–1 scale and aren't thrown off by a few huge markets.
>
> **Why absolute move?** A market dropping 20 points is as newsworthy as one rising 20.
>
> **Why these weights?** They're a starting hypothesis: current activity matters most,
> then big moves, then acceleration. In production I'd tune them with click-through data.

"Biggest moves" requires at least $10K daily volume, so a thinly traded market jumping on
one small trade doesn't top the list.

Results are cached for 5 minutes (`unstable_cache`), since the data only changes hourly.

## 4. Categories (`web/lib/categories.ts`)

Each market gets a category by matching keywords in its question and event title (for
example "vs", "NFL", "Premier League" for Sports). Word boundaries stop "ai" from matching
inside "Spain".

> **Why keywords?** Transparent, fast, and easy to fix. The tradeoff is occasional
> mislabels; Polymarket's own tags would be more accurate and are the next improvement.

## 5. Personalization (`web/app/discover.tsx`)

Users pick topics, and the choice is saved in the browser's localStorage. "For you" shows
markets in those topics, ordered by trending score. The watchlist works the same way.
Returning visitors with saved topics land on "For you".

> **Why no accounts?** Sign-up is friction before the user sees any value. Local storage
> gets personalization working on the first visit. Accounts would come with alerts, which
> need a way to contact the user.

## 6. Market page (`web/app/market/[id]/`)

- **Price chart:** Polymarket's CLOB `prices-history` endpoint, fetched through my
  `/api/history` route. Range buttons map to an interval and point spacing.
- **Order book:** `/api/book` fetches the CLOB `book` endpoint. The page refreshes it every
  10 seconds and pauses while the tab is hidden.
- **What changed:** `web/lib/summary.ts` turns the numbers into sentences with fixed rules
  (move size, volume change, spread width).
- **Related markets:** other markets in the same event first, then the same category.

> **Why proxy through API routes?** It validates input (token IDs must be numeric), keeps
> third-party calls on the server, and lets the server cache responses.
>
> **Why polling instead of WebSockets?** Vercel's serverless functions can't hold
> long-lived connections, and a 10-second refresh is enough for browsing. The next step
> would be connecting the browser straight to Polymarket's market WebSocket.
>
> **Why rule-based summaries instead of AI?** Every sentence is guaranteed to match the
> data. An AI summary could invent a reason for a move.

## 7. Analytics (`web/components/analytics.tsx`)

If a PostHog key is set, the app records `market_clicked`, `recommendation_clicked`,
`tab_selected`, `category_selected`, `search_performed`, `interests_saved`,
`watch_added`, and `watch_removed`, plus page views.

The funnel to watch: visit, then opened a market, then watched a market, then returned
within 7 days.

## 8. Deployment

- Collector: GitHub Actions cron (`.github/workflows/collect.yml`), with `DATABASE_URL`
  stored as a repository secret.
- Tests: `.github/workflows/tests.yml` runs `pytest` on every push.
- Web: Vercel with root directory `web`. `DATABASE_URL` uses Supabase's transaction
  pooler (port 6543), which suits serverless functions that open short-lived connections.

## Known limitations

- Price moves need at least 30 minutes of history, so a fresh deployment shows none.
- Categories are keyword-based and sometimes wrong.
- Multi-outcome events show each outcome as its own market.
- GitHub's scheduled jobs can start a few minutes late.

## What I'd build next

1. Price-move alerts by email for watched markets.
2. Polymarket's own tags for categories.
3. Live prices over WebSocket on the market page.
4. An A/B test of For you vs. Trending as the default tab.
