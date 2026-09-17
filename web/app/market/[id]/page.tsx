import Link from "next/link";
import { notFound } from "next/navigation";
import { MoveTrack } from "@/components/move-track";
import { cents, pct, pointChange, usd } from "@/lib/format";
import { getMarketDetail, getMarkets, relatedMarkets } from "@/lib/markets";
import { whatChanged } from "@/lib/summary";
import { OrderBook } from "./order-book";
import { PriceChart } from "./price-chart";
import { WatchButton } from "./watch-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const detail = await getMarketDetail(params.id).catch(() => null);
  return { title: detail ? `${detail.market.question} | Forecast` : "Market | Forecast" };
}

export default async function MarketPage({ params }: { params: { id: string } }) {
  const detail = await getMarketDetail(params.id);
  if (!detail) notFound();

  const { market: m, tokenIds, outcomes, description } = detail;
  const related = relatedMarkets(await getMarkets(), m);
  const summary = whatChanged(m);
  const spread = m.bestBid != null && m.bestAsk != null ? m.bestAsk - m.bestBid : null;
  const polymarketUrl = m.slug ? `https://polymarket.com/market/${m.slug}` : null;

  return (
    <>
      <Link href="/" className="back">
        Back to all markets
      </Link>

      <section className="market-head">
        <div>
          <p className="event">
            {m.category}
            {m.eventTitle && m.eventTitle !== m.question ? `, ${m.eventTitle}` : ""}
          </p>
          <h1>{m.question}</h1>
        </div>
        <div className="hero-odds">
          <div className="hero-price" aria-label={`${m.outcome} ${pct(m.price)}`}>
            {pct(m.price)}
          </div>
          <div
            className={`hero-delta ${
              m.move == null ? "muted" : m.move >= 0 ? "up-text" : "down-text"
            }`}
          >
            {m.outcome}
            {m.move != null && `, ${pointChange(m.move)}`}
          </div>
        </div>
        <div className="hero-track" style={{ gridColumn: "1 / -1" }}>
          <MoveTrack from={m.priceThen} to={m.price} size="hero" />
        </div>
        <div className="head-actions">
          <WatchButton id={m.id} />
          {polymarketUrl && (
            <a className="button secondary" href={polymarketUrl} target="_blank" rel="noreferrer">
              Trade on Polymarket
            </a>
          )}
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <PriceChart tokenId={tokenIds[0] ?? null} outcome={outcomes[0] ?? m.outcome} />
        </section>
        <section className="panel">
          <h2>What changed</h2>
          <ul className="changed">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <dl className="stats">
          <div className="stat">
            <dt>24h volume</dt>
            <dd>{usd(m.volume24h)}</dd>
          </div>
          <div className="stat">
            <dt>Liquidity</dt>
            <dd>{usd(m.liquidity)}</dd>
          </div>
          <div className="stat">
            <dt>Spread</dt>
            <dd>{spread == null ? "–" : cents(Math.round(spread * 1000) / 1000)}</dd>
          </div>
          <div className="stat">
            <dt>Closes</dt>
            <dd>
              {m.endDate
                ? new Date(m.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "–"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Related markets</h2>
          {related.length === 0 ? (
            <p className="muted">No related markets are active right now.</p>
          ) : (
            <div>
              {related.map((r) => (
                <Link key={r.id} href={`/market/${r.id}`} className="row" style={{ padding: "10px 0", gridTemplateColumns: "minmax(0,1fr) 56px 64px" }}>
                  <div className="title-cell">
                    <div className="row-title">{r.question}</div>
                  </div>
                  <span className="num price">{pct(r.price)}</span>
                  <span className={`num ${r.move == null ? "muted" : r.move >= 0 ? "up-text" : "down-text"}`}>
                    {pointChange(r.move)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <OrderBook tokenId={tokenIds[0] ?? null} outcome={outcomes[0] ?? m.outcome} />
        </section>
      </div>

      {description && (
        <section className="panel">
          <h2>How this market resolves</h2>
          <p className="description">{description}</p>
        </section>
      )}
    </>
  );
}
