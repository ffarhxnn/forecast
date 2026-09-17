import { NextResponse, type NextRequest } from "next/server";

// Maps the chart's range buttons to Polymarket CLOB parameters.
// fidelity = minutes between points.
const RANGES: Record<string, { interval: string; fidelity: number }> = {
  "1H": { interval: "1h", fidelity: 1 },
  "1D": { interval: "1d", fidelity: 10 },
  "1W": { interval: "1w", fidelity: 60 },
  ALL: { interval: "max", fidelity: 720 },
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const range = RANGES[request.nextUrl.searchParams.get("range") ?? "1W"] ?? RANGES["1W"];
  if (!/^\d+$/.test(token)) {
    return NextResponse.json({ error: "Invalid token id" }, { status: 400 });
  }

  const url = `https://clob.polymarket.com/prices-history?market=${token}&interval=${range.interval}&fidelity=${range.fidelity}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`CLOB responded ${res.status}`);
    const data = (await res.json()) as { history?: { t: number; p: number }[] };
    return NextResponse.json({ history: data.history ?? [] });
  } catch (error) {
    console.error("price history failed", error);
    return NextResponse.json({ error: "Price history is unavailable" }, { status: 502 });
  }
}
