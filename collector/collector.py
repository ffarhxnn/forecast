"""Snapshot active Polymarket markets into Postgres.

Run once per hour. Each run upserts the latest market metadata into `markets`
and appends one timestamped row per market to `market_snapshots`.
"""
import json
import logging
import os
import time
from datetime import datetime, timezone

import psycopg
import requests
from dotenv import load_dotenv

GAMMA_URL = "https://gamma-api.polymarket.com/markets/keyset"
PAGE_SIZE = 100
MIN_VOLUME_24H = float(os.getenv("MIN_VOLUME_24H", "1000"))  # skip tiny markets
MAX_RETRIES = 3

log = logging.getLogger("collector")


def to_float(value):
    """Convert API values like "0.53" to 0.53; return None if missing or invalid."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def first_outcome_price(market):
    """outcomePrices arrives as a JSON string like '["0.53", "0.47"]'."""
    try:
        return float(json.loads(market.get("outcomePrices") or "[]")[0])
    except (ValueError, IndexError, TypeError):
        return None


def get_page(session, params):
    """Fetch one page, retrying with exponential backoff."""
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(GAMMA_URL, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as error:
            if attempt == MAX_RETRIES - 1:
                raise
            wait = 2 ** attempt
            log.warning("Request failed (%s); retrying in %ss", error, wait)
            time.sleep(wait)


def fetch_active_markets():
    """Page through every open market using the keyset cursor."""
    markets, cursor = [], None
    with requests.Session() as session:
        while True:
            params = {"closed": "false", "limit": PAGE_SIZE}
            if cursor:
                params["after_cursor"] = cursor
            data = get_page(session, params)
            markets.extend(data.get("markets", []))
            cursor = data.get("next_cursor")
            if not cursor:
                return markets
            time.sleep(0.2)  # be polite to the API


def build_rows(markets, captured_at):
    """Turn raw API markets into rows for the two tables."""
    market_rows, snapshot_rows = [], []
    for m in markets:
        volume_24h = to_float(m.get("volume24hr"))
        if "id" not in m or volume_24h is None or volume_24h < MIN_VOLUME_24H:
            continue
        market_rows.append((
            str(m["id"]), m.get("slug"), m.get("question"), m.get("endDate"),
            m.get("clobTokenIds"), json.dumps(m), captured_at,
        ))
        snapshot_rows.append((
            str(m["id"]), captured_at, first_outcome_price(m),
            to_float(m.get("bestBid")), to_float(m.get("bestAsk")),
            to_float(m.get("volumeNum")), volume_24h,
            to_float(m.get("liquidityNum")),
        ))
    return market_rows, snapshot_rows


UPSERT_MARKET = """
insert into markets (id, slug, question, end_date, clob_token_ids, raw, last_seen)
values (%s, %s, %s, %s::timestamptz, %s::jsonb, %s::jsonb, %s)
on conflict (id) do update set
  slug = excluded.slug,
  question = excluded.question,
  end_date = excluded.end_date,
  clob_token_ids = excluded.clob_token_ids,
  raw = excluded.raw,
  last_seen = excluded.last_seen
"""

INSERT_SNAPSHOT = """
insert into market_snapshots
  (market_id, captured_at, price_yes, best_bid, best_ask,
   volume_total, volume_24h, liquidity)
values (%s, %s, %s, %s, %s, %s, %s, %s)
on conflict do nothing
"""


def save(database_url, market_rows, snapshot_rows):
    # One transaction: either both tables update or neither does
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.executemany(UPSERT_MARKET, market_rows)
            cur.executemany(INSERT_SNAPSHOT, snapshot_rows)


def main():
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    database_url = os.environ["DATABASE_URL"]

    start = time.time()
    markets = fetch_active_markets()
    market_rows, snapshot_rows = build_rows(markets, datetime.now(timezone.utc))
    save(database_url, market_rows, snapshot_rows)
    log.info("Fetched %d markets, saved %d snapshots in %.1fs",
             len(markets), len(snapshot_rows), time.time() - start)


if __name__ == "__main__":
    main()
