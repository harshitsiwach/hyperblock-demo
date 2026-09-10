"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AssetIcon } from "@/app/components/asset-icon";
import { MARKETS as SUPPORTED_ASSETS } from "@/app/lib/markets";
import { ArrowDown, ArrowUp, Compass, ExternalLink, RefreshCw, Receipt, X, Copy, Check } from "lucide-react";
import type { Play } from "@/app/lib/domain";
import { explorerTxUrl, type HistoryRecord, type OnchainBetRecord } from "@/app/lib/hyperblock-api/history";
import { getWaitingPepe, getRandomCelebratingPepe } from "@/app/lib/pepe-emotes";

interface LivePositionsProps {
  activePlays: Play[];
  historyPlays: Play[];
  now: number;
  /** Chain-verified bet + claim record (no API dependency). */
  records?: HistoryRecord[];
  historyLoading?: boolean;
  walletConnected?: boolean;
  onRefreshHistory?: () => void;
  /** Reserved for backward compatibility */
  showBetRecord?: boolean;
  settling?: boolean;
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
  settling = false,
}: LivePositionsProps) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [selectedSlip, setSelectedSlip] = useState<EnrichedBet | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 750);
    onRefreshHistory?.();
  };

  // Auto-switch to active tab when an order is placed
  useEffect(() => {
    if (activePlays.length > 0) {
      setTab("active");
    }
  }, [activePlays.length]);

  const settledCount = useMemo(
    () =>
      records.filter(
        (r): r is OnchainBetRecord => r.kind === "bet" && r.status === "settled",
      ).length,
    [records],
  );

  // Enriched bets from on-chain history
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

  return (
    <div className="terminal-card flex flex-col p-3.5 space-y-2.5 flex-1 min-h-0 overflow-hidden">
      {/* Header with Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--hair)] pb-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
              tab === "active"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)]"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink)] border border-transparent"
            }`}
          >
            <span>Active Orders</span>
            <span className="rounded-full bg-[var(--card)] px-1.5 py-0.2 text-[10px] font-mono border border-[var(--hair)]">
              {activePlays.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("history")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
              tab === "history"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)]"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink)] border border-transparent"
            }`}
          >
            <span>Bet Record</span>
            <span className="rounded-full bg-[var(--card)] px-1.5 py-0.2 text-[10px] font-mono border border-[var(--hair)]">
              {records.length > 0 ? settledCount : historyPlays.length}
            </span>
          </button>
        </div>

        {tab === "history" && onRefreshHistory ? (
          <button
            onClick={handleRefresh}
            disabled={historyLoading || !walletConnected}
            className="group flex items-center gap-1.5 rounded-md border border-[var(--hair)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-bold text-[var(--ink-secondary)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)] hover:shadow-[0_0_10px_rgba(255,95,31,0.25)] active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            title="Reload bet record from devnet"
          >
            <RefreshCw className={`h-3 w-3 transition-transform duration-500 ${historyLoading || isRefreshing ? "animate-refresh-spin text-[var(--color-neon-orange)]" : "group-hover:rotate-180"}`} />
            <span>{historyLoading || isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        ) : (
          <span className="text-[10px] font-mono text-[var(--ink-muted)]">
            {activePlays.length > 0 ? "10s Settlement" : "Hyperliquid 1s"}
          </span>
        )}
      </div>

      {/* Bet Settling Notification Banner inside LivePositions */}
      <AnimatePresence>
        {settling && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 flex items-center gap-2 backdrop-blur-md shadow-[0_2px_12px_-2px_rgba(245,158,11,0.15)]">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide truncate">
                Settling onchain… waiting ~10s for exit price
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {tab === "active" ? (
        <div className={`flex-1 min-h-0 overflow-y-auto ${activePlays.length > 1 ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 space-y-0" : "space-y-2.5"} pr-1`}>
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
              const waitingPepe = getWaitingPepe(play.id);

              return (
                <motion.div
                  key={play.id}
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="relative pt-3"
                >
                  {/* Random Pepe Waiting / Praying animation perched above top right of card */}
                  <div
                    className="absolute top-0 right-3 z-30 flex items-center pointer-events-none select-none"
                    title={waitingPepe.label}
                  >
                    <img
                      src={waitingPepe.src}
                      alt={waitingPepe.name}
                      width={30}
                      height={30}
                      className="h-7 w-7 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                    />
                  </div>

                  <div
                    className={`group relative overflow-hidden rounded-xl p-2.5 transition-all ${
                      isProfit ? "glass-card-win" : "glass-card-lose"
                    }`}
                  >
                    {/* Glass Shining Effect Overlays */}
                    <div className="glass-reflection-overlay" />
                    <div className="glass-shine-beam" />

                    {/* Countdown Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.06] z-10">
                      <div
                        className={`h-full transition-all duration-100 ${
                          isUrgent ? "bg-amber-400" : isProfit ? "bg-[#00f076]" : "bg-[#ff3358]"
                        }`}
                        style={{ width: `${(1 - progress) * 100}%` }}
                      />
                    </div>

                    <div className="relative z-10 flex items-start justify-between mt-1">
                      {/* Left: Asset, Direction & Stake */}
                      <div className="flex items-center gap-2.5">
                        {asset && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card)] border border-[var(--hair)]">
                            <AssetIcon symbol={asset.symbol} category={asset.category} size={20} />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-[var(--ink)]">
                              {asset?.symbol ?? "XAU"}
                            </span>
                            <span
                              className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider ${
                                isUp
                                  ? "bg-[#00f076]/15 text-[#00f076] border border-[#00f076]/30"
                                  : "bg-[#ff3358]/15 text-[#ff3358] border border-[#ff3358]/30"
                              }`}
                            >
                              {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {play.direction.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
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

                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
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
                                : "text-[var(--ink-secondary)]"
                            }`}
                          >
                            {isSettling ? "SETTLING…" : `${remainingSec}s`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Entry Price Footnote */}
                    <div className="relative z-10 mt-2 flex items-center justify-between border-t border-[var(--hair)] pt-1.5 text-[10.5px] font-mono text-[var(--ink-muted)]">
                      <span>Entry: ${formatPrice(play.entryPrice)}</span>
                      <span className="text-[var(--ink-muted)]/80">10-sec settlement</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty State */}
          {activePlays.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] py-6 px-4 text-center h-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] mb-2 border border-[var(--hair)]">
                <Compass className="h-5 w-5 animate-pulse" />
              </div>
              <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                No Open Positions
              </h4>
              <p className="mt-1 max-w-[280px] text-[11px] text-[var(--ink-muted)]">
                Pick an asset, select UP or DOWN on the ticket, and let the 10-second Hyperliquid ticks decide.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Bet Record History View */
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {!walletConnected ? (
            <p className="rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] px-3 py-6 text-center text-[11px] text-[var(--ink-muted)]">
              Connect a wallet to load your verified on-chain bet record.
            </p>
          ) : enriched.length === 0 && claims.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] px-3 py-6 text-center text-[11px] text-[var(--ink-muted)]">
              {historyLoading ? "Scanning devnet transfers…" : "No bets yet — your settled rounds will appear here with tx links."}
            </p>
          ) : (
            <>
              {claims.length > 0 && (
                <div className="rounded-lg border border-[var(--hair)] bg-[var(--card)] px-2.5 py-1.5 text-[10px] font-mono text-[var(--ink-muted)]">
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
                    onClick={() => setSelectedSlip(b)}
                    className={`group relative overflow-hidden rounded-xl p-2.5 text-[11px] transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                      isSettling
                        ? "border border-amber-400/30 bg-amber-500/10 text-amber-500 dark:text-amber-300"
                        : profit
                        ? "glass-card-win"
                        : "glass-card-lose"
                    }`}
                  >
                    {!isSettling && (
                      <>
                        <div className="glass-reflection-overlay" />
                        <div className="glass-shine-beam" />
                      </>
                    )}

                    <div className="relative z-10 flex items-center justify-between gap-2">
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
                        <span className="truncate font-bold text-[var(--ink)]">
                          {b.symbol ? `${b.symbol} ${b.direction?.toUpperCase() ?? ""}` : "tUSD round"}
                        </span>
                        <span className="font-mono text-[var(--ink-muted)]">{timeAgo(t, now)}</span>
                      </div>
                      <span
                        className={`font-mono font-extrabold ${
                          isSettling ? "text-amber-300" : profit ? "text-[#00f076]" : "text-[#ff3358]"
                        }`}
                      >
                        {isSettling ? `−${b.stakeTokens} tUSD` : `${b.pnlTokens >= 0 ? "+" : "−"}${Math.abs(b.pnlTokens).toFixed(2)} tUSD`}
                      </span>
                    </div>

                    <div className="relative z-10 mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--ink-muted)]">
                      <span>
                        stake {b.stakeTokens} → payout {isSettling ? "…" : b.payoutTokens.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[var(--color-neon-orange)] group-hover:underline">
                          <Receipt className="h-3 w-3" /> slip
                        </span>
                        <a
                          href={explorerTxUrl(b.stakeSignature)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-0.5 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                          title="Stake transaction"
                        >
                          stake <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                        {b.payoutSignature && (
                          <a
                            href={explorerTxUrl(b.payoutSignature)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-0.5 text-[var(--ink-muted)] hover:text-[var(--ink)]"
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
            </>
          )}
        </div>
      )}

      {/* Official Bet Slip Modal Popup */}
      <AnimatePresence>
        {selectedSlip && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setSelectedSlip(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm overflow-hidden rounded-2xl p-5 shadow-2xl ${
                selectedSlip.status === "settling"
                  ? "border border-amber-400/30 bg-[#0e121a]"
                  : selectedSlip.pnlTokens >= 0
                  ? "glass-card-win"
                  : "glass-card-lose"
              }`}
            >
              {/* Glass Shining Effect Overlays */}
              {selectedSlip.status !== "settling" && (
                <>
                  <div className="glass-reflection-overlay" />
                  <div className="glass-shine-beam" />
                </>
              )}

              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--hair)] pb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[var(--color-neon-orange)]" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                    Official Bet Slip
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="rounded-lg p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--hair)] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Round Overview Badge, Random Pepe Emote & Hero P&L */}
              <div className="py-4 text-center relative z-10">
                {(() => {
                  const slipPepe =
                    selectedSlip.pnlTokens >= 0
                      ? getRandomCelebratingPepe(selectedSlip.stakeSignature || String(selectedSlip.stakeTime))
                      : getWaitingPepe(selectedSlip.stakeSignature || String(selectedSlip.stakeTime));

                  return (
                    <div className="flex justify-center mb-2.5">
                      <img
                        src={slipPepe.src}
                        alt={slipPepe.name}
                        width={52}
                        height={52}
                        className="h-13 w-13 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] select-none"
                      />
                    </div>
                  );
                })()}

                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase mb-2 border"
                  style={{
                    borderColor: selectedSlip.pnlTokens >= 0 ? "rgba(0,240,118,0.4)" : "rgba(255,51,88,0.4)",
                    backgroundColor: selectedSlip.pnlTokens >= 0 ? "rgba(0,240,118,0.12)" : "rgba(255,51,88,0.12)",
                    color: selectedSlip.pnlTokens >= 0 ? "#00f076" : "#ff3358",
                  }}
                >
                  {selectedSlip.direction === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {selectedSlip.direction?.toUpperCase() ?? "ROUND"} · {selectedSlip.symbol ?? "SOL"}
                </div>

                <div
                  className={`font-mono text-3xl font-black tracking-tight ${
                    selectedSlip.pnlTokens >= 0 ? "text-[#00f076]" : "text-[#ff3358]"
                  }`}
                >
                  {selectedSlip.pnlTokens >= 0 ? "+" : "−"}${Math.abs(selectedSlip.pnlTokens).toFixed(2)}
                </div>
                <div className="text-xs font-mono font-bold text-[var(--ink-muted)] mt-0.5">
                  {selectedSlip.pnlTokens >= 0
                    ? `+${((selectedSlip.pnlTokens / (selectedSlip.stakeTokens || 1)) * 100).toFixed(1)}% Return`
                    : "Capital Deducted"}
                </div>
              </div>

              {/* Breakdown details */}
              <div className="space-y-2 rounded-xl bg-[var(--panel)] border border-[var(--hair)] p-3 text-xs font-mono relative z-10">
                <div className="flex justify-between text-[var(--ink-muted)]">
                  <span>Stake Amount:</span>
                  <span className="font-bold text-[var(--ink)]">${selectedSlip.stakeTokens.toFixed(2)} tUSD</span>
                </div>
                <div className="flex justify-between text-[var(--ink-muted)]">
                  <span>Payout Total:</span>
                  <span className="font-bold text-[var(--ink)]">${selectedSlip.payoutTokens.toFixed(2)} tUSD</span>
                </div>
                {selectedSlip.entryPrice && (
                  <div className="flex justify-between text-[var(--ink-muted)]">
                    <span>Strike Entry:</span>
                    <span className="font-bold text-[var(--ink)]">${formatPrice(selectedSlip.entryPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--ink-muted)]">
                  <span>Settlement:</span>
                  <span className="text-[var(--color-neon-orange)] font-bold">10-Sec Fast Round</span>
                </div>
              </div>

              {/* On-Chain Proof Links */}
              <div className="mt-3 space-y-1.5 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Verified On-Chain Signatures
                </div>
                <a
                  href={explorerTxUrl(selectedSlip.stakeSignature)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[var(--hair)] bg-[var(--card)] px-3 py-2 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--color-neon-orange)] transition-colors"
                >
                  <span>Stake Tx: {selectedSlip.stakeSignature.slice(0, 8)}…{selectedSlip.stakeSignature.slice(-6)}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                </a>

                {selectedSlip.payoutSignature && (
                  <a
                    href={explorerTxUrl(selectedSlip.payoutSignature)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-[var(--hair)] bg-[var(--card)] px-3 py-2 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--color-neon-orange)] transition-colors"
                  >
                    <span>Payout Tx: {selectedSlip.payoutSignature.slice(0, 8)}…{selectedSlip.payoutSignature.slice(-6)}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#00f076]" />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
