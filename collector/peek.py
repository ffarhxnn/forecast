"""Print one open market so you can see which fields the API returns."""
import json

import requests

URL = "https://gamma-api.polymarket.com/markets/keyset"

response = requests.get(URL, params={"closed": "false", "limit": 1}, timeout=30)
response.raise_for_status()
market = response.json()["markets"][0]
print(json.dumps(market, indent=2))

expected = ["volume24hr", "volumeNum", "liquidityNum", "bestBid",
            "bestAsk", "outcomePrices", "endDate", "clobTokenIds"]
missing = [field for field in expected if field not in market]
print("\nMissing fields:", missing or "none")
