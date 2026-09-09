"use client";

import { useMemo, useState } from "react";
import { AssetIcon } from "@/app/components/asset-icon";
import { MARKETS as SUPPORTED_ASSETS, type AssetCategory, type MarketInfo } from "@/app/lib/markets";
import type { HyperliquidPrice } from "@/app/hooks/use-hyperliquid-prices";
import { Search, X, Check } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";

interface AssetBrowserProps {
  selectedMarketId: number;
  onSelect: (marketId: number) => void;
  prices: Map<string, HyperliquidPrice>;
}

const CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Stocks" },
  { id: "commodities", label: "Commodities" },
  { id: "forex", label: "Forex" },
];

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AssetBrowser({
  selectedMarketId,
  onSelect,
  prices,
}: AssetBrowserProps) {
  const { activeTintConfig } = useTheme();
  const [activeCategory, setActiveCategory] = useState<AssetCategory>("crypto");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SUPPORTED_ASSETS.filter((asset) => {
      if (asset.category !== activeCategory) return false;
      if (!q) return true;
      return (
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.label.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="terminal-card flex flex-col p-3.5 gap-2.5 h-full flex-1">
      {/* Header & Controls */}
      <div className="flex flex-col gap-2.5 flex-shrink-0">
        <div className="flex items-center justify-between border-b border-[var(--hair)] pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold tracking-tight text-[var(--ink)]">
              MARKET ASSET BROWSER
            </h3>
            <span className="rounded bg-[var(--card)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ink-secondary)] border border-[var(--hair)]">
              EXPLORE
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            {visibleAssets.length} Available
          </span>
        </div>

        {/* Search Input & Category Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <input
              type="text"
              placeholder="Search markets (GOLD, BTC, NVDA…)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--hair)] bg-[var(--panel)] py-1.5 pl-8 pr-8 text-xs font-medium text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--color-neon-orange)] focus:bg-[var(--card)] outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-shrink-0">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)] font-extrabold shadow-sm"
                      : "border border-[var(--hair)] bg-[var(--panel)] text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--color-neon-orange)]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Asset Cards Grid with fixed height & scrolling - maintains exact alignment across all categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[168px] overflow-y-auto pr-1">
        {visibleAssets.map((asset) => {
          const isSelected = asset.marketId === selectedMarketId;
          const hlPrice = prices.get(asset.symbol)?.price;

          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.marketId)}
              className={`group flex flex-col justify-between rounded-lg p-2.5 text-left transition-all border ${
                isSelected
                  ? "bg-[var(--color-neon-orange-soft)] border-[var(--color-neon-orange)] shadow-sm"
                  : "border-[var(--hair)] bg-[var(--card)] hover:border-[var(--color-neon-orange)] hover:bg-[var(--color-neon-orange-soft)]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className={`transition-transform duration-200 ${isSelected ? "scale-105" : "group-hover:scale-105"}`}>
                    <AssetIcon symbol={asset.symbol} category={asset.category} size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[var(--ink)] flex items-center gap-1">
                      {asset.symbol}
                      {isSelected && (
                        <Check className="h-3 w-3 text-[var(--color-neon-orange)]" />
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--ink-muted)] truncate max-w-[85px]">
                      {asset.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Price Tag */}
              <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-[var(--hair)]">
                <span className="font-mono text-xs font-bold text-[var(--ink)]">
                  ${hlPrice ? formatPrice(hlPrice) : "—"}
                </span>
                <span className="text-[9px] font-semibold text-[var(--ink-muted)]">
                  1s tick
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
