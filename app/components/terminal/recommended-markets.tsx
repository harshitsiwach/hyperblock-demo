"use client";

import { AssetIcon } from "@/app/components/asset-icon";
import { Flame, Sparkles } from "lucide-react";
import { MARKETS, BASE_PRICES } from "@/app/lib/markets";

interface RecommendedMarketsProps {
  selectedMarketId: number;
  onSelect: (marketId: number) => void;
  prices?: Map<string, { price: number; change24h?: number }>;
}

const RECOMMENDED_SYMBOLS = ["BTC", "ETH", "SOL", "GOLD", "NVDA", "HYPE", "SILVER", "DOGE"];

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RecommendedMarkets({
  selectedMarketId,
  onSelect,
  prices,
}: RecommendedMarketsProps) {
  const recommended = MARKETS.filter((m) => RECOMMENDED_SYMBOLS.includes(m.symbol));

  return (
    <div className="terminal-card flex flex-col p-3.5 space-y-2.5 flex-shrink-0">
      <div className="flex items-center justify-between border-b border-[var(--glass-panel-border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Recommended Markets
          </h3>
        </div>
        <span className="rounded-full bg-[var(--glass-card-bg)] px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--ink-muted)] border border-[var(--glass-card-border)]">
          Quick Switch
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {recommended.map((m) => {
          const isCurrent = m.marketId === selectedMarketId;
          const liveP = prices?.get(m.symbol)?.price ?? BASE_PRICES[m.symbol] ?? 100;
          const change = prices?.get(m.symbol)?.change24h ?? 0.85;

          return (
            <button
              key={m.marketId}
              type="button"
              onClick={() => onSelect(m.marketId)}
              className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all ${
                isCurrent
                  ? "bg-[var(--ui-tint-bg)] border border-[var(--ui-tint-border)] shadow-[0_0_12px_var(--ui-tint-glow)]"
                  : "bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] hover:bg-[var(--glass-card-hover-bg)] hover:border-[var(--glass-card-hover-border)] hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--glass-input-bg)] border border-[var(--glass-card-border)]">
                  <AssetIcon symbol={m.symbol} category={m.category} size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[var(--ink)] truncate">
                      {m.symbol}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-cyan-500/20 px-1 py-px text-[7px] font-black text-cyan-400 border border-cyan-400/30 uppercase">
                        LIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--ink-muted)] truncate block">
                    {m.name}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0 pl-2">
                <div className="font-mono text-xs font-bold text-[var(--ink)]">
                  ${formatPrice(liveP)}
                </div>
                <div
                  className={`font-mono text-[10px] font-semibold ${
                    change >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
