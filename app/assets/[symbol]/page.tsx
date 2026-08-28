import { HyperliquidLiveChart } from "./chart";
import Link from "next/link";

export async function generateStaticParams() {
  return [
    { symbol: "BTC" }, { symbol: "ETH" }, { symbol: "SOL" }, { symbol: "HYPE" },
    { symbol: "AAPL" }, { symbol: "NVDA" }, { symbol: "TSLA" }, { symbol: "COIN" },
    { symbol: "GOLD" }, { symbol: "SILVER" }, { symbol: "BRENTOIL" }, { symbol: "EUR" }, { symbol: "JPY" },
  ];
}

const META: Record<string, { label: string; dex: string; unit: string }> = {
  BTC: { label: "BTC / USD", dex: "main", unit: "USD" },
  ETH: { label: "ETH / USD", dex: "main", unit: "USD" },
  SOL: { label: "SOL / USD", dex: "main", unit: "USD" },
  HYPE: { label: "HYPE / USD", dex: "main", unit: "USD" },
  AAPL: { label: "AAPL / USD", dex: "xyz", unit: "USD" },
  NVDA: { label: "NVDA / USD", dex: "xyz", unit: "USD" },
  TSLA: { label: "TSLA / USD", dex: "xyz", unit: "USD" },
  COIN: { label: "COIN / USD", dex: "xyz", unit: "USD" },
  GOLD: { label: "Gold (XAU) / USD", dex: "xyz", unit: "USD" },
  SILVER: { label: "Silver (XAG) / USD", dex: "xyz", unit: "USD" },
  BRENTOIL: { label: "Brent Oil / USD", dex: "xyz", unit: "USD" },
  EUR: { label: "EUR / USD", dex: "xyz", unit: "USD" },
  JPY: { label: "JPY / USD", dex: "xyz", unit: "USD" },
};

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
