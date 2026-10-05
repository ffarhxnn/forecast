from datetime import datetime, timezone

import pytest

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


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity", float("nan"), float("inf"), True, False])
def test_nonfinite_or_boolean_api_numbers_are_unknown(value):
    assert to_float(value) is None


@pytest.mark.parametrize("prices", ['["NaN", "0.5"]', '[1.2, 0]', '[-0.1, 1]', '[true, false]', '{"price": 0.5}'])
def test_invalid_probabilities_are_not_reported_as_odds(prices):
    assert first_outcome_price({"outcomePrices": prices}) is None


def test_nonfinite_volume_cannot_enter_snapshot_rows():
    now = datetime.now(timezone.utc)
    rows = build_rows([{"id": "bad", "volume24hr": "NaN"}], now)
    assert rows == ([], [])
