import { getMarkets } from "@/lib/markets";
import { Discover, type LiteMarket } from "./discover";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let markets: LiteMarket[] = [];
  let failed = false;
  try {
    const all = await getMarkets();
    // Send only what the list needs, to keep the page light.
    markets = all.map((m) => ({
      id: m.id,
      question: m.question,
      eventTitle: m.eventTitle,
      category: m.category,
      price: m.price,
      priceThen: m.priceThen,
      move: m.move,
      volume24h: m.volume24h,
      score: m.score,
    }));
  } catch (error) {
    console.error("Failed to load markets", error);
    failed = true;
  }

  if (failed) {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <h2>Markets couldn&apos;t load</h2>
        <p>The database didn&apos;t respond. Check that DATABASE_URL is set, then refresh.</p>
      </div>
    );
  }

  return <Discover markets={markets} />;
}
