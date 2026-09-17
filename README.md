# Forecast

**A discovery app for prediction markets.** Forecast ranks live Polymarket markets by
momentum, surfaces the biggest probability moves, and builds a personal feed from the
topics you follow.

Live demo: https://forecast-ffarhxnn.vercel.app/

## Why I built it

Polymarket lists thousands of open markets at once, and most see almost no trading.
Finding the few that are moving right now is hard. Forecast tests one idea: **ranking by
momentum and personalizing by interest gets people to a market worth opening faster** than
browsing a flat list.

## Features

- **Trending ranking** built from hourly snapshots I collect, not Polymarket's own sort
- **Biggest moves** in the last 24 hours, with a visual from-to odds track
- **For you** feed based on topics you pick, stored on your device (no account needed)
- **Market pages** with price history, a live order book, liquidity and spread, related
  markets, and a plain-language summary of what changed
- **Watchlist** and search
- **Product analytics** events for the discovery funnel (PostHog, optional)

## Architecture

```
GitHub Actions (hourly) ──► collector (Python) ──► Polymarket Gamma API
                                    │
                                    ▼
                           Supabase Postgres
                     (markets, market_snapshots)
                                    │
                                    ▼
                  Next.js app on Vercel ──► Polymarket CLOB API
          (server components + API routes)   (price history, order book)
                                    │
                                    ▼
                                 Browser
```

More detail and the reasoning behind each choice: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Tech

Next.js 14, TypeScript, React, Recharts, Python, PostgreSQL (Supabase),
GitHub Actions, Vercel, PostHog

## Engineering decisions

- **Snapshots instead of live-only data.** The API gives current values, not how volume
  changed over time. An hourly job stores a time series so momentum can be measured.
- **Server-side filtering.** Of roughly 178,000 open markets, only a few thousand trade
  $1K+ a day. Filtering at the API keeps the hourly job short and the database small.
- **Percentile-ranked trending score.** Volume is in dollars and moves are in probability
  points, so each feature is converted to a percentile before weighting.
- **Rule-based summaries.** "What changed" is generated from the data with fixed rules, so
  it can never state a reason that isn't true.
- **API routes as a proxy.** The browser calls my own routes, which validate input and
  cache Polymarket responses.

## What I'd test next

- Does the For you feed raise the share of visitors who open a market, compared with
  Trending as the default?
- Which trending weights produce the most clicks per impression?
- Do price-move alerts bring people back more often than a watchlist alone?

## Run it locally

```bash
# collector
python3 -m venv .venv && source .venv/bin/activate
pip install -r collector/requirements.txt
cp .env.example .env          # add DATABASE_URL
python -m collector.collector
pytest

# web app
cd web
npm install
cp .env.example .env.local    # add DATABASE_URL
npm run dev
```

Independent project, not affiliated with Polymarket.
