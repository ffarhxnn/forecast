"use client";

import { useEffect, useState } from "react";
import { cents, usd } from "@/lib/format";

type Level = { price: number; size: number };
type Book = { bids: Level[]; asks: Level[]; fetchedAt: string };

const REFRESH_MS = 10_000;

export function OrderBook({ tokenId, outcome }: { tokenId: string | null; outcome: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;

    const load = () => {
      // Skip refreshes while the tab is hidden.
      if (document.visibilityState === "hidden") return;
      fetch(`/api/book?token=${tokenId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data: Book) => {
          if (cancelled) return;
          setBook(data);
          setError(false);
        })
        .catch(() => !cancelled && setError(true));
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tokenId]);

  const rows = book ? [...book.asks].reverse() : [];
  const maxSize = book ? Math.max(1, ...book.asks.map((l) => l.size), ...book.bids.map((l) => l.size)) : 1;
  const bestBid = book?.bids[0]?.price;
  const bestAsk = book?.asks[0]?.price;

  return (
    <>
      <h2>Order book, {outcome}</h2>
      {!tokenId || (error && !book) ? (
        <p className="muted">The order book isn&apos;t available for this market.</p>
      ) : !book ? (
        <p className="muted">Loading order book</p>
      ) : book.bids.length === 0 && book.asks.length === 0 ? (
        <p className="muted">No open orders right now.</p>
      ) : (
        <>
          <table className="book">
            <thead>
              <tr>
                <th>Price</th>
                <th>Shares</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <LevelRow key={`a${l.price}`} level={l} side="ask" maxSize={maxSize} />
              ))}
              <tr className="mid">
                <td colSpan={3}>
                  {bestBid != null && bestAsk != null
                    ? `Spread ${cents(Math.round((bestAsk - bestBid) * 1000) / 1000)}`
                    : "One side of the book is empty"}
                </td>
              </tr>
              {book.bids.map((l) => (
                <LevelRow key={`b${l.price}`} level={l} side="bid" maxSize={maxSize} />
              ))}
            </tbody>
          </table>
          <p className="book-note">
            Sell orders on top, buy orders below. Refreshes every 10 seconds.
          </p>
        </>
      )}
    </>
  );
}

function LevelRow({ level, side, maxSize }: { level: Level; side: "ask" | "bid"; maxSize: number }) {
  return (
    <tr className={side}>
      <td>{cents(level.price)}</td>
      <td>{Math.round(level.size).toLocaleString("en-US")}</td>
      <td>
        <span className="depth" style={{ width: `${(level.size / maxSize) * 100}%` }} aria-hidden />
        {usd(level.price * level.size)}
      </td>
    </tr>
  );
}
