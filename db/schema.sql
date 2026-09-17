-- Run this once in the Supabase SQL Editor.

create table if not exists markets (
  id text primary key,
  slug text,
  question text,
  end_date timestamptz,
  clob_token_ids jsonb,
  raw jsonb,                                   -- full API response, latest only
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null
);

create table if not exists market_snapshots (
  market_id text not null references markets(id),
  captured_at timestamptz not null,
  price_yes numeric,       -- price of the first outcome
  best_bid numeric,
  best_ask numeric,
  volume_total numeric,
  volume_24h numeric,
  liquidity numeric,
  primary key (market_id, captured_at)
);

create index if not exists market_snapshots_captured_at_idx
  on market_snapshots (captured_at);

-- Block access through Supabase's public API; the collector connects directly.
alter table markets enable row level security;
alter table market_snapshots enable row level security;
