"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AssetIcon } from "@/app/components/asset-icon";
import { MARKETS as SUPPORTED_ASSETS } from "@/app/lib/markets";
import { ArrowDown, ArrowUp, Clock, CheckCircle2, AlertCircle, Compass } from "lucide-react";
import type { Play } from "@/app/lib/domain";

interface LivePositionsProps {
  activePlays: Play[];
  historyPlays: Play[];
  now: number;
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUsd(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LivePositions({ activePlays, historyPlays, now }: LivePositionsProps) {
  return (
    <div className="terminal-card flex flex-col p-4 lg:p-5 bg-[#121620] h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Active Orders & Settlement
          </h3>
          <span className="rounded-full bg-[#00f076]/10 px-2 py-0.5 text-[10px] font-bold text-[#00f076] border border-[#00f076]/20">
            {activePlays.length} Live
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {historyPlays.length} Settled
        </span>
      </div>

      {/* Main Content: Active Cards or Premium Empty State */}
      <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2.5 pr-1">
        <AnimatePresence mode="popLayout">
          {activePlays.map((play) => {
            const asset = SUPPORTED_ASSETS.find((a) => a.marketId === play.marketId);
            const isUp = play.direction === "up";
            const livePnl = play.liveProfitUsd ?? 0;
            const isProfit = livePnl >= 0;

            const remainingMs = Math.max(0, play.expiresAt - now);
            const remainingSec = (remainingMs / 1000).toFixed(1);
            const totalDuration = play.expiresAt - play.openedAt || 10000;
            const progress = Math.min(1, Math.max(0, (now - play.openedAt) / totalDuration));
            const isUrgent = remainingMs <= 3000 && remainingMs > 0;
            const isSettling = remainingMs === 0;

            return (
              <motion.div
                key={play.id}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={`relative overflow-hidden rounded-xl border p-3.5 transition-colors ${
                  isProfit
                    ? "border-[#00f076]/30 bg-[#00f076]/[0.03]"
                    : "border-[#ff3358]/30 bg-[#ff3358]/[0.03]"
                }`}
              >
                {/* Countdown Progress Bar at top of card */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/[0.06]">
                  <div
                    className={`h-full transition-all duration-100 ${
                      isUrgent ? "bg-amber-400" : isProfit ? "bg-[#00f076]" : "bg-[#ff3358]"
                    }`}
                    style={{ width: `${(1 - progress) * 100}%` }}
                  />
                </div>

                <div className="flex items-start justify-between mt-1">
                  {/* Left: Asset, Direction & Stake */}
                  <div className="flex items-center gap-2.5">
                    {asset && (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08]">
                        <AssetIcon symbol={asset.symbol} category={asset.category} size={22} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-white">
                          {asset?.symbol ?? "XAU"}
                        </span>
                        <span
                          className={`flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-black uppercase ${
                            isUp
                              ? "bg-[#00f076]/20 text-[#00f076]"
                              : "bg-[#ff3358]/20 text-[#ff3358]"
                          }`}
                        >
                          {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {play.direction.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Stake: ${play.collateralUsd} · 1000x
                      </span>
                    </div>
                  </div>

                  {/* Right: Live P&L and Timer */}
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm font-extrabold tracking-tight transition-colors duration-200 ${
                        isProfit ? "text-[#00f076]" : "text-[#ff3358]"
                      }`}
                    >
                      {isProfit ? "+" : "-"}
                      {formatUsd(livePnl)}
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          isSettling
                            ? "bg-amber-400 animate-ping"
                            : "bg-[#00f076] shadow-[0_0_6px_#00f076]"
                        }`}
                      />
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          isSettling
                            ? "text-amber-400"
                            : isUrgent
                            ? "text-amber-300 font-extrabold animate-pulse"
                            : "text-slate-300"
                        }`}
                      >
                        {isSettling ? "SETTLING…" : `${remainingSec}s`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Entry & Current Price Footnote */}
                <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] font-mono text-slate-400">
                  <span>Entry: ${formatPrice(play.entryPrice)}</span>
                  <span>10-sec settlement</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Premium Empty State */}
        {activePlays.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01] p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-slate-400 mb-2">
              <Compass className="h-5 w-5 animate-pulse text-[#00f076]" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              No Open Positions
            </h4>
            <p className="mt-1 max-w-[260px] text-[11px] text-slate-400">
              Pick an asset, select UP or DOWN on the ticket, and let the 10-second Hyperliquid ticks decide.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
