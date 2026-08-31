import { HyperliquidLiveChart } from "./chart";
import Link from "next/link";
import { MARKETS } from "@/app/lib/markets";

export async function generateStaticParams() {
  return MARKETS.map((m) => ({ symbol: m.symbol }));
}

const META: Record<string, { label: string; dex: string; unit: string }> = Object.fromEntries(
  MARKETS.map((m) => [m.symbol, { label: m.label, dex: m.dex, unit: "USD" }]),
) as Record<string, { label: string; dex: string; unit: string }>;

export default async function AssetDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const meta = META[symbol.toUpperCase()] ?? { label: `${symbol.toUpperCase()} / USD`, dex: symbol.length > 4 ? "xyz" : "main", unit: "USD" };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <Link href="/" className="brand-mark" aria-label="Lever home">
            <svg className="brand-icon" viewBox="0 0 32 32" role="img" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9"></rect><path d="M7.5 20.5 24.5 11"></path><path d="m12.5 25 3.5-6 3.5 6Z"></path></svg>
            <span className="brand-wordmark">lever</span>
          </Link>
          <nav className="route-nav" aria-label="Primary">
            <Link href="/">Trade</Link>
            <Link href="/assets" aria-current="page">Markets</Link>
            <Link href="/liquidity">Liquidity</Link>
            <Link href="/leaderboard">Leaders</Link>
          </nav>
        </div>
        <div className="topbar-actions">
          <Link href="/assets" className="quiet-button">← All markets</Link>
        </div>
      </header>
      <div className="hl-page">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/assets" className="quiet-button">← Back</Link>
          <span className="eyebrow">{meta.dex === "xyz" ? "Hyperliquid xyz builder DEX" : "Hyperliquid main DEX"} · {meta.dex || "main"}</span>
        </div>
        <HyperliquidLiveChart symbol={symbol.toUpperCase()} label={meta.label} />
      </div>
    </div>
  );
}
