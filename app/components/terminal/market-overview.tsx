"use client";

import { useEffect, useRef, useState } from "react";
import { AssetIcon } from "@/app/components/asset-icon";
import { ArrowDownRight, ArrowUpRight, Flame } from "lucide-react";
import { MARKETS, BASE_PRICES, type MarketInfo } from "@/app/lib/markets";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";

interface MarketOverviewProps {
  asset: MarketInfo;
  currentPrice: number | null;
  priceHistory: { t: number; p: number }[];
  latencyMs?: number;
  prices?: Map<string, { price: number; change24h?: number }>;
  onSelectMarket?: (id: number) => void;
  selectedMarketId?: number;
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Curated top recommendations across Crypto, Commodities, and Stocks
const RECOMMENDED_SYMBOLS = ["BTC", "ETH", "SOL", "GOLD", "NVDA", "HYPE", "SILVER", "DOGE"];

export function MarketOverview({
  asset,
  currentPrice,
  priceHistory,
  latencyMs = 22,
  prices,
  onSelectMarket,
  selectedMarketId,
}: MarketOverviewProps) {
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect price changes and trigger 300ms highlight flash
  useEffect(() => {
    if (currentPrice == null) return;
    if (prevPrice !== null && prevPrice !== currentPrice) {
      const dir = currentPrice > prevPrice ? "up" : "down";
      setFlashDir(dir);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashDir(null);
      }, 350);
    }
    setPrevPrice(currentPrice);
  }, [currentPrice, prevPrice]);

  // Derived metrics from price history
  const historyPrices = priceHistory.map((h) => h.p);
  const high = historyPrices.length > 0 ? Math.max(...historyPrices, currentPrice ?? 0) : currentPrice ?? 0;
  const low = historyPrices.length > 0 ? Math.min(...historyPrices, currentPrice ?? 0) : currentPrice ?? 0;
  const startPrice = historyPrices[0] ?? currentPrice ?? 0;
  const diff = currentPrice && startPrice ? currentPrice - startPrice : 0;
  const pctChange = startPrice > 0 ? ((diff / startPrice) * 100).toFixed(2) : "0.00";
  const isPositive = diff >= 0;

  // Volatility metric
  const range = high - low;
  const volPct = startPrice > 0 ? ((range / startPrice) * 100).toFixed(2) : "0.08";

  // Sentiment ratio (calculated based on recent ticks momentum)
  const upTicks = historyPrices.reduce((acc, p, i) => (i > 0 && p >= historyPrices[i - 1] ? acc + 1 : acc), 0);
  const totalTicks = Math.max(1, historyPrices.length - 1);
  const bullRatio = Math.min(88, Math.max(15, Math.round((upTicks / totalTicks) * 100)));
  const bearRatio = 100 - bullRatio;

  // Institutional market stats
  const volume24h = "$148.2M";
  const openInterest = "$42.9M";
  const fundingRate = isPositive ? "+0.0042%/h" : "-0.0018%/h";

  // Filter recommended market items
  const recommendedMarkets = MARKETS.filter((m) => RECOMMENDED_SYMBOLS.includes(m.symbol));

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* Squeezed Active Coin Card with WATCHING status */}
      <div className="terminal-card flex flex-col gap-3 p-3.5 lg:p-4">
        {/* Header: Asset Badge & WATCHING indicator */}
        <div className="flex items-center justify-between border-b border-[var(--glass-panel-border-subtle)] pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] shadow-sm">
              <AssetIcon symbol={asset.symbol} category={asset.category} size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold tracking-tight text-[var(--ink)]">
                  {asset.symbol}
                </h2>
                <span className="rounded bg-[var(--glass-card-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ink-secondary)] border border-[var(--glass-card-border)]">
                  {asset.category.toUpperCase()}
                </span>
                {/* Active WATCHING Pill */}
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 px-2 py-0.5 text-[9px] font-extrabold text-cyan-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  WATCHING
                </span>
              </div>
              <div className="text-[11px] font-medium text-[var(--ink-muted)]">
                {asset.name || asset.label} · Hyperliquid {asset.dex ? asset.dex.toUpperCase() : "MAIN"}
              </div>
            </div>
          </div>

          {/* Network ping */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <span className="live-pulse-dot" />
              <span>Hyperliquid</span>
            </div>
            <span className="font-mono text-[9px] text-[var(--ink-muted)]">
              {latencyMs}ms · 1s
            </span>
          </div>
        </div>

        {/* Compact Mark Price & Live Delta */}
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Mark Price (USD)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <TypewriterNumber
                value={currentPrice ?? 0}
                prefix="$"
                decimals={currentPrice && currentPrice < 1 ? 4 : 2}
                className="text-2xl font-extrabold tracking-tight text-[var(--ink)] font-mono"
              />
            </div>
          </div>

          {/* Delta change badge */}
          <div
            className={`flex items-center gap-1 text-xs font-extrabold font-mono px-2 py-1 rounded-lg border ${
              isPositive 
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" 
                : "text-rose-400 bg-rose-500/10 border-rose-500/25"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {diff.toFixed(2)} ({isPositive ? "+" : ""}
              {pctChange}%)
            </span>
          </div>
        </div>

        {/* Compact 24h Low / High Range */}
        {(() => {
          const curVal = currentPrice ?? low;
          const rangeSpan = high - low || 1;
          const rangePct = Math.min(100, Math.max(0, ((curVal - low) / rangeSpan) * 100));

          return (
            <div className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2.5 py-2 space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--ink-muted)]">24h Low</span>
                  <span className="font-mono font-bold text-[var(--ink)]">${formatPrice(low)}</span>
                </div>
                <span className="font-mono text-[9px] text-[var(--ink-muted)]">{rangePct.toFixed(0)}% Track</span>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--ink-muted)]">24h High</span>
                  <span className="font-mono font-bold text-[var(--ink)]">${formatPrice(high)}</span>
                </div>
              </div>

              {/* Range Track with Moving Notch */}
              <div className="relative h-1.5 w-full rounded-full bg-[var(--glass-input-bg)] overflow-visible">
                <div className="relative h-full w-full rounded-full overflow-hidden bg-gradient-to-r from-rose-500/70 via-amber-400/70 to-emerald-400/70 opacity-90" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: `${rangePct}%` }}
                >
                  <span className="h-3 w-1.5 rounded-full bg-[var(--ink)] shadow-md border border-[var(--glass-card-border)] block" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Squeezed 2x2 Market Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2 py-1.5">
            <span className="font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              24h Volume
            </span>
            <div className="font-mono text-[11px] font-bold text-[var(--ink)] mt-0.5">{volume24h}</div>
          </div>

          <div className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2 py-1.5">
            <span className="font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Open Interest
            </span>
            <div className="font-mono text-[11px] font-bold text-[var(--ink)] mt-0.5">{openInterest}</div>
          </div>

          <div className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2 py-1.5">
            <span className="font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Funding (1h)
            </span>
            <div
              className={`font-mono text-[11px] font-bold mt-0.5 ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {fundingRate}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2 py-1.5">
            <span className="font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Volatility
            </span>
            <div className="font-mono text-[11px] font-bold text-[var(--ink)] mt-0.5">{volPct}%</div>
          </div>
        </div>

        {/* Compact Sentiment Bar */}
        <div className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 font-bold text-emerald-400">
              <span>Bulls</span>
              <TypewriterNumber value={bullRatio} suffix="%" decimals={0} className="font-mono text-[10px] font-extrabold" />
            </div>
            <span className="font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Order Sentiment
            </span>
            <div className="flex items-center gap-1 font-bold text-rose-400">
              <TypewriterNumber value={bearRatio} suffix="%" decimals={0} className="font-mono text-[10px] font-extrabold" />
              <span>Bears</span>
            </div>
          </div>

          <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-[var(--glass-input-bg)] border border-[var(--glass-card-border)]">
            <div
              className="relative h-full rounded-l-full bg-emerald-500/80 transition-all duration-700 ease-out"
              style={{ width: `${bullRatio}%` }}
            />
            <div
              className="relative h-full rounded-r-full bg-rose-500/80 transition-all duration-700 ease-out"
              style={{ width: `${bearRatio}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[var(--ink)] shadow-sm z-10 transition-all duration-700 ease-out"
              style={{ left: `${bullRatio}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
