import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsProvider } from "@/components/analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forecast: find the prediction markets worth watching",
  description:
    "Discover prediction markets by momentum, big moves, and your interests. Built on Polymarket's public data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider />
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                <span />
              </span>
              Forecast
            </Link>
            <span className="header-note">Prediction markets, sorted by what&apos;s moving</span>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer wrap">
          <p>
            Independent project built on Polymarket&apos;s public API. Not affiliated with
            Polymarket. Odds are market prices, not advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
