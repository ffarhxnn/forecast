import { durationLabel, hoursAgo, pct, usd } from "./format";
import type { Market } from "./markets";

// Plain-language, rule-based summary of what happened in a market.
// Deterministic on purpose: every sentence comes straight from the data.
export function whatChanged(m: Market): string[] {
  const lines: string[] = [];
  const hours = hoursAgo(m.since);

  if (m.move == null || hours == null || m.priceThen == null) {
    lines.push("Tracking started recently. A summary appears after a few hourly snapshots.");
  } else {
    const pts = Math.round(Math.abs(m.move) * 100);
    const window = durationLabel(hours);
    if (pts < 2) {
      lines.push(`The odds held steady at about ${pct(m.price)} over ${window}.`);
    } else {
      const direction = m.move > 0 ? "rose" : "fell";
      lines.push(
        `${m.outcome} ${direction} from ${pct(m.priceThen)} to ${pct(m.price)} over ${window}, a ${pts}-point move.`,
      );
    }
  }

  if (m.volume24hThen && m.volume24hThen > 0 && m.since) {
    const change = m.volume24h / m.volume24hThen - 1;
    if (Math.abs(change) >= 0.25) {
      lines.push(
        `Trading is ${change > 0 ? "picking up" : "slowing down"}: ${usd(m.volume24h)} in the last 24 hours, ${
          change > 0 ? "up" : "down"
        } ${Math.round(Math.abs(change) * 100)}% from the earlier reading.`,
      );
    } else {
      lines.push(`${usd(m.volume24h)} traded in the last 24 hours, in line with earlier today.`);
    }
  } else {
    lines.push(`${usd(m.volume24h)} traded in the last 24 hours.`);
  }

  if (m.bestBid != null && m.bestAsk != null) {
    const spread = Math.round((m.bestAsk - m.bestBid) * 1000) / 10;
    if (spread <= 1) {
      lines.push(`Buyers and sellers are ${spread}¢ apart, so the price is well supported.`);
    } else if (spread >= 5) {
      lines.push(`Buyers and sellers are ${spread}¢ apart, so small trades can move the price.`);
    }
  }

  return lines;
}
