"use client";

import { useEffect, useRef, useState } from "react";
import { AssetIcon } from "@/app/components/asset-icon";
import { Activity, ArrowDownRight, ArrowUpRight, Radio, Shield, TrendingUp, Zap } from "lucide-react";
import type { MarketInfo } from "@/app/lib/markets";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";

interface MarketOverviewProps {
  asset: MarketInfo;
  currentPrice: number | null;
  priceHistory: { t: number; p: number }[];
  latencyMs?: number;
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MarketOverview({
  asset,
  currentPrice,
  priceHistory,
  latencyMs = 22,
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
  const prices = priceHistory.map((h) => h.p);
  const high = prices.length > 0 ? Math.max(...prices, currentPrice ?? 0) : currentPrice ?? 0;
  const low = prices.length > 0 ? Math.min(...prices, currentPrice ?? 0) : currentPrice ?? 0;
  const startPrice = prices[0] ?? currentPrice ?? 0;
  const diff = currentPrice && startPrice ? currentPrice - startPrice : 0;
  const pctChange = startPrice > 0 ? ((diff / startPrice) * 100).toFixed(2) : "0.00";
  const isPositive = diff >= 0;

  // Volatility metric
  const range = high - low;
  const volPct = startPrice > 0 ? ((range / startPrice) * 100).toFixed(2) : "0.08";

  // Sentiment ratio (calculated based on recent ticks momentum)
  const upTicks = prices.reduce((acc, p, i) => (i > 0 && p >= prices[i - 1] ? acc + 1 : acc), 0);
  const totalTicks = Math.max(1, prices.length - 1);
  const bullRatio = Math.min(88, Math.max(15, Math.round((upTicks / totalTicks) * 100)));
  const bearRatio = 100 - bullRatio;

  // Mock institutional market stats
  const volume24h = "$148.2M";
  const openInterest = "$42.9M";
  const fundingRate = isPositive ? "+0.0042%/h" : "-0.0018%/h";

  return (
    <div className="terminal-card flex flex-col gap-4 p-4 lg:p-5 h-full bg-[#121620]">
      {/* Header: Asset Identification & Source */}
      <div className="flex items-start justify-between border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <AssetIcon symbol={asset.symbol} category={asset.category} size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-white">
                {asset.symbol}
              </h2>
              <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                {asset.category.toUpperCase()}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-400">
              {asset.label} · Hyperliquid {asset.dex ? asset.dex.toUpperCase() : "MAIN"}
            </div>
          </div>
        </div>

        {/* Network connection badge */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00f076]">
            <span className="live-pulse-dot" />
            <span>Hyperliquid</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 mt-0.5">
            {latencyMs}ms · 1s ticks
          </span>
        </div>
      </div>

        {/* Main Quote & Typewriter Price */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Mark Price (USD)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <TypewriterNumber
              value={currentPrice ?? 0}
              prefix="$"
              decimals={2}
              className="text-3xl font-extrabold tracking-tight text-white"
            />
          </div>

          {/* Delta change */}
          <div
            className={`flex items-center gap-1 text-xs font-extrabold mt-1 font-mono ${
              isPositive ? "text-[#00f076]" : "text-[#ff3358]"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {diff.toFixed(2)} ({isPositive ? "+" : ""}
              {pctChange}%)
            </span>
            <span className="text-[10px] font-normal text-slate-400 ml-1">Live Delta</span>
          </div>
        </div>

        {/* High / Low Range Bar with Kinetic Position Marker */}
        {(() => {
          const curVal = currentPrice ?? low;
          const rangeSpan = high - low || 1;
          const rangePct = Math.min(100, Math.max(0, ((curVal - low) / rangeSpan) * 100));

          return (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2.5">
              <div className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">24h Low</span>
                  <span className="font-mono font-bold text-slate-300">${formatPrice(low)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">24h High</span>
                  <span className="font-mono font-bold text-slate-300">${formatPrice(high)}</span>
                </div>
              </div>

              {/* Range Track with Moving Notch */}
              <div className="relative h-2.5 w-full rounded-full bg-[#090a0f] p-0.5 border border-white/[0.08] overflow-visible">
                {/* Gradient Fill with Scanline Energy Effect */}
                <div className="relative h-full w-full rounded-full overflow-hidden bg-gradient-to-r from-[#ff3358] via-amber-400 to-[#00f076] opacity-85">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[energy-sweep-up_2.5s_infinite_linear]" />
                </div>

                {/* Animated Indicator Notch positioned at exact current price percentage */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-300 ease-out"
                  style={{ left: `${rangePct}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="h-4 w-2 rounded-full bg-white shadow-[0_0_10px_#00f076] border border-black/60 block" />
                    <span className="absolute -top-6 whitespace-nowrap rounded bg-[#141824] px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-[#00f076] border border-[#00f076]/40 shadow-lg">
                      {rangePct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                <span>Range Spread: ${(high - low).toFixed(2)}</span>
                <span className="text-[#00f076] font-bold">● Current Track</span>
              </div>
            </div>
          );
        })()}

        {/* Institutional Market Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              24h Volume
            </span>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">{volume24h}</div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Open Interest
            </span>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">{openInterest}</div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Funding (1h)
            </span>
            <div
              className={`font-mono text-xs font-bold mt-0.5 ${
                isPositive ? "text-[#00f076]" : "text-[#ff3358]"
              }`}
            >
              {fundingRate}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Volatility Index
            </span>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">{volPct}%</div>
          </div>
        </div>

        {/* Market Sentiment (Bulls vs Bears with Animated Plasma Bar) */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2 mt-auto">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#00f076]">
              <span>Bulls</span>
              <TypewriterNumber value={bullRatio} suffix="%" decimals={0} className="font-mono text-xs font-extrabold" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Order Sentiment
            </span>
            <div className="flex items-center gap-1.5 font-bold text-[#ff3358]">
              <TypewriterNumber value={bearRatio} suffix="%" decimals={0} className="font-mono text-xs font-extrabold" />
              <span>Bears</span>
            </div>
          </div>

          {/* Animated Liquid Bar */}
          <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-[#090a0f] p-0.5 border border-white/[0.08]">
            <div
              className="relative h-full rounded-l-full bg-[#00f076] transition-all duration-700 ease-out overflow-hidden shadow-[0_0_8px_rgba(0,240,118,0.4)]"
              style={{ width: `${bullRatio}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[energy-sweep-up_2s_infinite_linear]" />
            </div>
            <div
              className="relative h-full rounded-r-full bg-[#ff3358] transition-all duration-700 ease-out overflow-hidden shadow-[0_0_8px_rgba(255,51,88,0.4)]"
              style={{ width: `${bearRatio}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[energy-sweep-down_2s_infinite_linear]" />
            </div>
            {/* Center Split Laser Divider */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_6px_#ffffff] z-10 transition-all duration-700 ease-out"
              style={{ left: `${bullRatio}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
