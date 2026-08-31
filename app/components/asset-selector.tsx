"use client";

import { useState } from "react";
import { useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { MARKETS as SUPPORTED_ASSETS } from "@/app/lib/markets";
import type { AssetCategory, MarketInfo as AssetOption } from "@/app/lib/markets";
import { AssetIcon } from "@/app/components/asset-icon";

export { SUPPORTED_ASSETS };
export type { AssetCategory, AssetOption };

const CATEGORY_TABS: { id: AssetCategory; label: string; icon: string }[] = [
  { id: "crypto", label: "Crypto", icon: "₿" },
  { id: "stocks", label: "Stocks", icon: "📈" },
  { id: "commodities", label: "Commodities", icon: "🪙" },
  { id: "forex", label: "Forex", icon: "💱" },
];

export function AssetSelector({
  selectedMarketId,
  onSelect,
  disabled,
}: {
  selectedMarketId: number;
  onSelect: (marketId: number) => void;
  disabled?: boolean;
}) {
  const allSymbols = SUPPORTED_ASSETS.map((a) => a.symbol);
  const prices = useHyperliquidPrices(allSymbols);

  // Determine the active category from the currently selected market
  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId);
  const [activeCategory, setActiveCategory] = useState<AssetCategory>(
    selectedAsset?.category ?? "crypto",
  );
  const [query, setQuery] = useState("");

  const visibleAssets = SUPPORTED_ASSETS.filter((a) => {
    if (a.category !== activeCategory) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.label.toLowerCase().includes(q);
  });

  return (
    <div className="asset-selector-container">
      {/* Category tabs */}
      <div className="category-tabs" role="tablist" aria-label="Asset category">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={cat.id === activeCategory}
            className={`category-tab ${cat.id === activeCategory ? "is-active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
            type="button"
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search — assets (125) */}
      <div style={{ position: "relative", marginTop: 2 }}>
        <input
          type="search"
          placeholder={`Search ${activeCategory} — ${SUPPORTED_ASSETS.filter((a) => a.category === activeCategory).length} symbols…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search assets"
          style={{
            width: "100%",
            padding: "10px 36px 10px 12px",
            borderRadius: 10,
            border: "1px solid var(--hair)",
            background: "var(--card)",
            fontSize: 13,
            fontWeight: 500,
            outline: "none",
          }}
        />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mut)", fontSize: 12 }}>⌕</span>
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            style={{ position: "absolute", right: 28, top: "50%", transform: "translateY(-50%)", color: "var(--mut)", fontSize: 12, padding: 4 }}
            type="button"
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 6 }}>{visibleAssets.length} of {SUPPORTED_ASSETS.filter((a) => a.category === activeCategory).length} · {query ? `"${query}"` : "all"}</div>

      {/* Beautiful asset list with icons */}
      <div className="asset-list" role="tablist" aria-label="Select asset">
        {visibleAssets.map((asset) => {
          const hl = prices.get(asset.symbol);
          const isSelected = asset.marketId === selectedMarketId;
          const stale = hl ? Date.now() - hl.updatedAt > 5000 : true;
          return (
            <button
              key={asset.symbol}
              role="tab"
              aria-selected={isSelected}
              className={`asset-row ${isSelected ? "is-selected" : ""} ${stale ? "is-stale" : ""}`}
              onClick={() => onSelect(asset.marketId)}
              disabled={disabled}
              type="button"
              title={`Hyperliquid · ${hl ? `updated ${((Date.now() - hl.updatedAt) / 1000).toFixed(1)}s ago` : "connecting…"}`}
            >
              <AssetIcon symbol={asset.symbol} category={asset.category} size={38} />
              <div className="asset-row-main">
                <div className="asset-row-top">
                  <span className="asset-row-symbol num">{asset.symbol}</span>
                  <span className={`asset-row-price num ${stale ? "" : "is-live"}`}>
                    {hl ? `$${hl.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
                <div className="asset-row-bottom">
                  <span className="asset-row-name">{asset.name}</span>
                  <span className={`asset-row-feed ${stale ? "is-stale" : "is-live"}`}>
                    <i /> {stale ? "connecting…" : "live"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
