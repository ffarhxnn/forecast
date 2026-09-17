import { NextResponse, type NextRequest } from "next/server";

type Level = { price: string; size: string };

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^\d+$/.test(token)) {
    return NextResponse.json({ error: "Invalid token id" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://clob.polymarket.com/book?token_id=${token}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CLOB responded ${res.status}`);
    const data = (await res.json()) as { bids?: Level[]; asks?: Level[] };
    const parse = (levels: Level[] = []) =>
      levels
        .map((l) => ({ price: Number(l.price), size: Number(l.size) }))
        .filter((l) => Number.isFinite(l.price) && Number.isFinite(l.size));

    // Best prices first: highest bids, lowest asks.
    const bids = parse(data.bids).sort((a, b) => b.price - a.price).slice(0, 8);
    const asks = parse(data.asks).sort((a, b) => a.price - b.price).slice(0, 8);
    return NextResponse.json({ bids, asks, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("order book failed", error);
    return NextResponse.json({ error: "Order book is unavailable" }, { status: 502 });
  }
}
