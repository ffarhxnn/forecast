# Forecast

Prediction-market discovery platform built on Polymarket's public API.

## Data collector

An hourly job snapshots active markets into Postgres so the app can compute
trends, probability moves, and volume growth over time.

### Setup

```bash
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r collector/requirements.txt
cp .env.example .env                 # then paste your DATABASE_URL
```

1. Run `db/schema.sql` in the Supabase SQL Editor.
2. Check the API fields: `python collector/peek.py`
3. Collect once: `python -m collector.collector`
4. Run tests: `pytest`

In production, `.github/workflows/collect.yml` runs the collector hourly using
the `DATABASE_URL` repository secret.
