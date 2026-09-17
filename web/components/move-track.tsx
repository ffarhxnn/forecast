import { pct } from "@/lib/format";

// A 0–100% line showing where the odds were (hollow dot) and where they are now
// (solid dot). The segment between them is the move.
export function MoveTrack({
  from,
  to,
  size = "row",
}: {
  from: number | null;
  to: number | null;
  size?: "row" | "hero";
}) {
  if (to == null) return <div className={`track track-${size}`} aria-hidden />;
  const now = clamp(to);
  const then = from == null ? null : clamp(from);
  const up = then != null && now >= then;
  const left = then == null ? now : Math.min(now, then);
  const width = then == null ? 0 : Math.abs(now - then);
  const label =
    then == null ? `Now ${pct(to)}` : `Moved from ${pct(from)} to ${pct(to)}`;

  return (
    <div className={`track track-${size}`} role="img" aria-label={label}>
      <div className="track-line" />
      {then != null && (
        <>
          <div
            className={`track-seg ${up ? "up" : "down"}`}
            style={{ left: `${left * 100}%`, width: `${width * 100}%` }}
          />
          <div className="track-dot then" style={{ left: `${then * 100}%` }} />
        </>
      )}
      <div
        className={`track-dot now ${then == null ? "flat" : up ? "up" : "down"}`}
        style={{ left: `${now * 100}%` }}
      />
    </div>
  );
}

function clamp(p: number) {
  return Math.min(1, Math.max(0, p));
}
