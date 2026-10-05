import { test } from "node:test";
import assert from "node:assert/strict";
import { whatChanged } from "../lib/summary";
import type { Market } from "../lib/markets";

const market: Market = {
  id: "fixture", question: "Example market", slug: null, eventId: null, eventTitle: null,
  outcome: "Yes", category: "Other", price: 0.5, priceThen: null, move: null, since: null,
  volume24h: 1000, volume24hThen: null, liquidity: null, bestBid: 0.499, bestAsk: 0.5,
  endDate: null, score: 0,
};

test("a narrow spread states observed quotes without implying depth or support", () => {
  const lines = whatChanged(market);
  assert.ok(lines.includes("The best bid and ask are 0.1¢ apart."));
  assert.ok(lines.every(line => !/supported|small trades can move/i.test(line)));
});

test("a wide spread does not invent a market-impact conclusion", () => {
  const lines = whatChanged({ ...market, bestBid: 0.4, bestAsk: 0.5 });
  assert.ok(lines.includes("The best bid and ask are 10¢ apart."));
  assert.ok(lines.every(line => !/small trades can move/i.test(line)));
});

test("missing, nonfinite, crossed and out-of-range quotes produce no spread statement", () => {
  for (const [bestBid, bestAsk] of [[null, 0.5], [0.5, null], [NaN, 0.5], [0.5, Infinity],
      [0.6, 0.5], [-0.1, 0.5], [0.5, 1.1]] as [number | null, number | null][]) {
    assert.ok(whatChanged({ ...market, bestBid, bestAsk }).every(line => !line.includes("bid and ask")));
  }
});
