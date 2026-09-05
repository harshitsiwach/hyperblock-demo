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
  { id: "commodities", label: "Commodities" },
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Stocks" },
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
  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId) ?? SUPPORTED_ASSETS[8];
  const [activeCategory, setActiveCategory] = useState<AssetCategory>(selectedAsset.category);
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
    <div className="terminal-card flex flex-col p-3.5 space-y-2.5 flex-1 min-h-0">
      {/* Header & Search */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Market Asset Browser
          </h3>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            {visibleAssets.length} Available
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
          <input
            type="text"
            placeholder="Search markets (GOLD, BTC, NVDA…)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--glass-input-border)] bg-[var(--glass-input-bg)] py-2 pl-9 pr-8 text-xs font-medium text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--ui-tint-border)] outline-none transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide transition-all ${
                  isSelected
                    ? "bg-[var(--ink)] text-[var(--bg)] shadow-md font-extrabold"
                    : "border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-muted)] hover:bg-[var(--glass-card-hover-bg)] hover:text-[var(--ink)]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Cards Grid (2 columns on desktop) */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {visibleAssets.map((asset) => {
          const isSelected = asset.marketId === selectedMarketId;
          const hlPrice = prices.get(asset.symbol)?.price;

          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.marketId)}
              className={`group flex flex-col justify-between rounded-xl p-2.5 text-left transition-all border ${
                isSelected
                  ? "shadow-sm"
                  : "border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] hover:border-[var(--glass-card-hover-border)] hover:bg-[var(--glass-card-hover-bg)]"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: activeTintConfig.borderColor,
                      backgroundColor: activeTintConfig.subtleBg,
                      boxShadow: `0 0 16px ${activeTintConfig.glowColor}`,
                    }
                  : undefined
              }
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
                        <Check className="h-3 w-3" style={{ color: activeTintConfig.color }} />
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--ink-muted)] truncate max-w-[85px]">
                      {asset.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Price Tag */}
              <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-[var(--glass-card-border)]">
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
