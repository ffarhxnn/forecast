"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const RANGES = ["1H", "1D", "1W", "ALL"] as const;
type Range = (typeof RANGES)[number];
type Point = { t: number; p: number };

export function PriceChart({ tokenId, outcome }: { tokenId: string | null; outcome: string }) {
  const [range, setRange] = useState<Range>("1W");
  const [points, setPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    setPoints(null);
    setError(false);
    fetch(`/api/history?token=${tokenId}&range=${range}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { history: Point[] }) => !cancelled && setPoints(data.history))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [tokenId, range]);

  const short = range === "1H" || range === "1D";
  const formatTime = (t: number) =>
    new Date(t * 1000).toLocaleString("en-US", short
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" });

  return (
    <>
      <div className="panel-head">
        <h2>{outcome} odds</h2>
        <div className="range" role="toolbar" aria-label="Chart range">
          {RANGES.map((r) => (
            <button key={r} className="tab" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="chart">
        {!tokenId || error ? (
          <p className="chart-note">Price history isn&apos;t available for this market.</p>
        ) : points == null ? (
          <p className="chart-note">Loading price history</p>
        ) : points.length < 2 ? (
          <p className="chart-note">Not enough trades in this range. Try a longer one.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTime}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                stroke="var(--line)"
                minTickGap={40}
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                stroke="var(--line)"
                width={48}
              />
              <Tooltip
                labelFormatter={(t) => formatTime(Number(t))}
                formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, outcome]}
                contentStyle={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  color: "var(--ink)",
                }}
              />
              <Area
                type="monotone"
                dataKey="p"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
