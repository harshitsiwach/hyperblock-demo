"use client";

import { useMemo, useState } from "react";
import { AssetIcon } from "@/app/components/asset-icon";
import { MARKETS as SUPPORTED_ASSETS, type AssetCategory, type MarketInfo } from "@/app/lib/markets";
import type { HyperliquidPrice } from "@/app/hooks/use-hyperliquid-prices";
import { Search, X, Check } from "lucide-react";

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
    <div className="terminal-card flex flex-col p-4 bg-[#121620] space-y-3">
      {/* Header & Search */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Market Asset Browser
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {visibleAssets.length} Available
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search markets (GOLD, BTC, NVDA…)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0b0d12] py-2 pl-9 pr-8 text-xs font-medium text-white placeholder-slate-500 focus:border-[#00f076] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                    ? "bg-white text-[#090a0f] shadow-sm font-extrabold"
                    : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Cards Grid (2 columns on desktop) */}
      <div className="grid grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1">
        {visibleAssets.map((asset) => {
          const isSelected = asset.marketId === selectedMarketId;
          const hlPrice = prices.get(asset.symbol)?.price;

          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.marketId)}
              className={`group flex flex-col justify-between rounded-xl p-2.5 text-left transition-all ${
                isSelected
                  ? "border border-[#00f076] bg-[#00f076]/[0.08] shadow-[0_0_16px_rgba(0,240,118,0.12)]"
                  : "border border-white/[0.06] bg-[#0e1118] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className={`transition-transform duration-200 ${isSelected ? "scale-105" : "group-hover:scale-105"}`}>
                    <AssetIcon symbol={asset.symbol} category={asset.category} size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white flex items-center gap-1">
                      {asset.symbol}
                      {isSelected && <Check className="h-3 w-3 text-[#00f076]" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[85px]">
                      {asset.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Price Tag */}
              <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-white/[0.04]">
                <span className="font-mono text-xs font-bold text-slate-200">
                  ${hlPrice ? formatPrice(hlPrice) : "—"}
                </span>
                <span className="text-[9px] font-semibold text-[#00f076]">
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
