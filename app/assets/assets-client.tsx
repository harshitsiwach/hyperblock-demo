"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/app/components/brand-mark";
import { RouteNav } from "@/app/components/route-nav";
import { SUPPORTED_ASSETS, type AssetCategory, type AssetOption } from "@/app/components/asset-selector";
import { useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { AssetIcon } from "@/app/components/asset-icon";

const FOCUS_CATEGORIES: AssetCategory[] = ["commodities", "forex"];

const CATEGORY_META: Record<AssetCategory, { title: string; desc: string; accent: string }> = {
  crypto: { title: "Crypto", desc: "Main Hyperliquid perp DEX", accent: "var(--up)" },
  stocks: { title: "Stocks", desc: "xyz builder DEX — equities", accent: "var(--ink)" },
  commodities: { title: "Commodities", desc: "xyz builder DEX — GOLD, SILVER, BRENTOIL", accent: "var(--wait)" },
  forex: { title: "Forex", desc: "xyz builder DEX — EUR, JPY", accent: "var(--down)" },
};

function AssetCard({ asset, price, stale }: { asset: AssetOption; price?: { price: number; updatedAt: number }; stale: boolean }) {
  const meta = CATEGORY_META[asset.category];
  return (
    <div className={`hl-card ${stale ? "is-stale" : "is-live"} cat-${asset.category}`}>
      <div className="hl-card-top">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AssetIcon symbol={asset.symbol} category={asset.category} size={32} />
          <span className="hl-symbol num">{asset.symbol}</span>
        </div>
        <span className="hl-feed" style={{ color: stale ? "var(--mut)" : "var(--up)" }}>
          <i /> {stale ? "connecting…" : "live"}
        </span>
      </div>
      <div className="hl-label">{asset.label}</div>
      <div className="hl-price num">{price ? `$${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div>
      <div className="hl-meta">
        <span className="hl-dex">dex: {asset.dex || "main"}</span>
        <span className="hl-dot" style={{ background: meta.accent }} />
        <span className="hl-cat">{meta.title}</span>
      </div>
      <div className="hl-spark" aria-hidden>
        <span className={`hl-pulse ${stale ? "" : "is-live"}`} />
      </div>
    </div>
  );
}

export function HyperliquidAssetsClient() {
  const allSymbols = useMemo(() => SUPPORTED_ASSETS.map((a) => a.symbol), []);
  const prices = useHyperliquidPrices(allSymbols);
  const [active, setActive] = useState<AssetCategory>("commodities");

  const visible = useMemo(
    () => SUPPORTED_ASSETS.filter((a) => a.category === active),
    [active],
  );

  const focusAssets = useMemo(
    () => SUPPORTED_ASSETS.filter((a) => FOCUS_CATEGORIES.includes(a.category)),
    [],
  );

  const liveCount = useMemo(() => {
    let n = 0;
    for (const a of focusAssets) {
      const p = prices.get(a.symbol);
      if (p && Date.now() - p.updatedAt <= 5000) n += 1;
    }
    return n;
  }, [prices, focusAssets]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <BrandMark />
          <RouteNav active="trade" />
        </div>
        <div className="topbar-actions">
          <span className="quiet-button" style={{ borderColor: "var(--up)", color: "var(--up)" }}>
            Hyperliquid · {liveCount}/{focusAssets.length} live
          </span>
        </div>
      </header>

      <div className="hl-page">
        <div className="hl-hero">
          <div>
            <span className="eyebrow">Hyperliquid Builder DEX — xyz</span>
            <h1>Commodities & Forex</h1>
            <p>Live prices streamed directly from Hyperliquid testnet. No Solana, no MagicBlock — pure <code>wss://api.hyperliquid-testnet.xyz/ws</code> <code>allMids</code> + <code>dex: xyz</code>. Stale &gt;5s shows connecting.</p>
          </div>
          <div className="hl-hero-card">
            <span>WS</span>
            <strong>wss://api.hyperliquid-testnet.xyz/ws</strong>
            <small>subscribe {"{"} type: "allMids" {"}"} + {"{"} type: "allMids", dex: "xyz" {"}"}</small>
          </div>
        </div>

        <div className="category-tabs" role="tablist" aria-label="Asset category">
          {(["commodities", "forex", "stocks", "crypto"] as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={cat === active}
              className={`category-tab ${cat === active ? "is-active" : ""}`}
              onClick={() => setActive(cat)}
              type="button"
            >
              <span className="cat-label">{CATEGORY_META[cat].title}</span>
            </button>
          ))}
        </div>

        <div className="hl-grid">
          {visible.map((asset) => {
            const p = prices.get(asset.symbol);
            const stale = !p || Date.now() - p.updatedAt > 5000;
            return (
              <Link key={asset.symbol} href={`/assets/${asset.symbol}`} style={{ textDecoration: "none", color: "inherit" }}>
                <AssetCard asset={asset} price={p} stale={stale} />
              </Link>
            );
          })}
        </div>

        <div className="hl-foot">
          <span>Source: Hyperliquid string mids <code>{'{"BTC":"67432.5"}'}</code> ignores keys starting with <code>@</code>, strips <code>xyz:</code> prefix. Fallback REST <code>POST /info {"{"}type:"allMids"{"}"}</code>.</span>
          <span className="hl-foot-live">{prices.size} symbols cached</span>
        </div>
      </div>
    </div>
  );
}
