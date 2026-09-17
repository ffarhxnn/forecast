from datetime import datetime, timezone

from collector.collector import build_rows, first_outcome_price, to_float


def test_to_float():
    assert to_float("0.53") == 0.53
    assert to_float(None) is None
    assert to_float("abc") is None


def test_first_outcome_price():
    assert first_outcome_price({"outcomePrices": '["0.62", "0.38"]'}) == 0.62
    assert first_outcome_price({}) is None
    assert first_outcome_price({"outcomePrices": "not json"}) is None


def test_build_rows_filters_small_markets():
    now = datetime.now(timezone.utc)
    markets = [
        {"id": "1", "volume24hr": 5000, "outcomePrices": '["0.5", "0.5"]'},
        {"id": "2", "volume24hr": 10},
        {"id": "3"},
    ]
    market_rows, snapshot_rows = build_rows(markets, now)
    assert [row[0] for row in market_rows] == ["1"]
    assert snapshot_rows[0][2] == 0.5
