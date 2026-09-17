export function pct(p: number | null | undefined): string {
  if (p == null) return "–";
  const v = p * 100;
  if (v > 0 && v < 1) return "<1%";
  if (v < 100 && v > 99) return ">99%";
  return `${Math.round(v)}%`;
}

export function pointChange(delta: number | null | undefined): string {
  if (delta == null) return "–";
  const pts = Math.round(delta * 100);
  if (pts === 0) return "0 pts";
  return `${pts > 0 ? "+" : "−"}${Math.abs(pts)} pts`;
}

export function usd(n: number | null | undefined): string {
  if (n == null) return "–";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `$${Math.round(n)}`;
}

export function cents(p: number): string {
  const c = p * 100;
  return `${Number.isInteger(c) ? c : c.toFixed(1)}¢`;
}

export function hoursAgo(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  return (Date.now() - new Date(date).getTime()) / 3_600_000;
}

export function durationLabel(hours: number): string {
  if (hours < 1.5) return "the past hour";
  if (hours >= 23) return "the past 24 hours";
  return `the past ${Math.round(hours)} hours`;
}
