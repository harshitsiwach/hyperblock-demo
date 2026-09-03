"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AssetIcon } from "@/app/components/asset-icon";
import { MARKETS as SUPPORTED_ASSETS } from "@/app/lib/markets";
import { ArrowDown, ArrowUp, Clock, CheckCircle2, AlertCircle, Compass, ExternalLink, RefreshCw, Receipt } from "lucide-react";
import type { Play } from "@/app/lib/domain";
import { explorerTxUrl, type HistoryRecord, type OnchainBetRecord } from "@/app/lib/hyperblock-api/history";

interface LivePositionsProps {
  activePlays: Play[];
  historyPlays: Play[];
  now: number;
  /** Chain-verified bet + claim record (no API dependency). */
  records?: HistoryRecord[];
  historyLoading?: boolean;
  walletConnected?: boolean;
  onRefreshHistory?: () => void;
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUsd(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface EnrichedBet extends OnchainBetRecord {
  symbol?: string;
  direction?: "up" | "down";
  entryPrice?: number;
}

export function LivePositions({
  activePlays,
  historyPlays,
  now,
  records = [],
  historyLoading = false,
  walletConnected = false,
  onRefreshHistory,
}: LivePositionsProps) {
  // Attach direction/symbol/entry from local mirrored plays (matched by stake + time).
  const enriched = useMemo<EnrichedBet[]>(() => {
    const bets = records.filter((r): r is OnchainBetRecord => r.kind === "bet");
    return bets.map((b) => {
      const local = historyPlays.find(
        (p) =>
          Math.abs(p.collateralUsd - b.stakeTokens) < 1e-6 &&
          Math.abs(p.openedAt - b.stakeTime) < 180_000,
      );
      if (!local) return b;
      const asset = SUPPORTED_ASSETS.find((a) => a.marketId === local.marketId);
      return { ...b, symbol: asset?.symbol, direction: local.direction, entryPrice: local.entryPrice };
    });
  }, [records, historyPlays]);

  const claims = useMemo(() => records.filter((r) => r.kind === "claim"), [records]);
  const claimedTotal = useMemo(() => claims.reduce((s, c) => s + c.amountTokens, 0), [claims]);
  const settledCount = enriched.filter((b) => b.status === "settled").length;
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
          {records.length > 0 ? settledCount : historyPlays.length} Settled
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

      {/* On-chain bet record (verified from devnet transfers) */}
      <div className="border-t border-white/[0.08] pt-3">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <Receipt className="h-3.5 w-3.5 text-slate-400" />
            <span>Bet Record</span>
            <span className="rounded-full bg-white/[0.05] border border-white/[0.08] px-1.5 py-px text-[10px] font-mono text-slate-400">
              on-chain
            </span>
          </div>
          {onRefreshHistory && (
            <button
              onClick={onRefreshHistory}
              disabled={historyLoading || !walletConnected}
              className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/[0.08] disabled:opacity-40"
              title="Reload bet record from devnet"
            >
              <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} />
              {historyLoading ? "Loading…" : "Refresh"}
            </button>
          )}
        </div>

        {!walletConnected ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01] px-3 py-3 text-center text-[11px] text-slate-500">
            Connect a wallet to load your verified on-chain bet record.
          </p>
        ) : enriched.length === 0 && claims.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01] px-3 py-3 text-center text-[11px] text-slate-500">
            {historyLoading ? "Scanning devnet transfers…" : "No bets yet — your settled rounds will appear here with tx links."}
          </p>
        ) : (
          <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
            {claims.length > 0 && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] font-mono text-slate-400">
                Faucet: +{claimedTotal.toFixed(2)} tUSD across {claims.length} claim{claims.length === 1 ? "" : "s"}
              </div>
            )}
            {enriched.map((b) => {
              const isSettling = b.status === "settling";
              const profit = isSettling ? null : b.pnlTokens >= 0;
              const t = b.payoutTime ?? b.stakeTime;
              return (
                <div
                  key={b.stakeSignature}
                  className={`rounded-xl border px-2.5 py-2 text-[11px] ${
                    isSettling
                      ? "border-amber-400/25 bg-amber-400/[0.05]"
                      : profit
                        ? "border-[#00f076]/20 bg-[#00f076]/[0.03]"
                        : "border-[#ff3358]/20 bg-[#ff3358]/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`rounded px-1.5 py-px text-[9px] font-black uppercase ${
                          isSettling
                            ? "bg-amber-400/20 text-amber-300"
                            : profit
                              ? "bg-[#00f076]/20 text-[#00f076]"
                              : "bg-[#ff3358]/20 text-[#ff3358]"
                        }`}
                      >
                        {isSettling ? "settling" : profit ? "won" : "lost"}
                      </span>
                      <span className="truncate font-bold text-white">
                        {b.symbol ? `${b.symbol} ${b.direction?.toUpperCase() ?? ""}` : "tUSD round"}
                      </span>
                      <span className="font-mono text-slate-500">{timeAgo(t, now)}</span>
                    </div>
                    <span
                      className={`font-mono font-extrabold ${
                        isSettling ? "text-amber-300" : profit ? "text-[#00f076]" : "text-[#ff3358]"
                      }`}
                    >
                      {isSettling ? `−${b.stakeTokens} tUSD` : `${b.pnlTokens >= 0 ? "+" : "−"}${Math.abs(b.pnlTokens).toFixed(2)} tUSD`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
                    <span>
                      stake {b.stakeTokens} → payout {isSettling ? "…" : b.payoutTokens.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-2">
                      <a
                        href={explorerTxUrl(b.stakeSignature)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-0.5 text-slate-400 hover:text-white"
                        title="Stake transaction"
                      >
                        stake <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      {b.payoutSignature && (
                        <a
                          href={explorerTxUrl(b.payoutSignature)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-slate-400 hover:text-white"
                          title="Payout transaction"
                        >
                          payout <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
