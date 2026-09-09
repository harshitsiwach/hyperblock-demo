"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, RefreshCw, Receipt, ArrowUp, ArrowDown, X } from "lucide-react";
import { MARKETS as SUPPORTED_ASSETS } from "@/app/lib/markets";
import type { Play } from "@/app/lib/domain";
import { explorerTxUrl, type HistoryRecord, type OnchainBetRecord } from "@/app/lib/hyperblock-api/history";

interface BetRecordCardProps {
  records?: HistoryRecord[];
  historyPlays: Play[];
  now: number;
  walletConnected?: boolean;
  historyLoading?: boolean;
  onRefreshHistory?: () => void;
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

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface EnrichedBet extends OnchainBetRecord {
  symbol?: string;
  direction?: "up" | "down";
  entryPrice?: number;
}

export function BetRecordCard({
  records = [],
  historyPlays,
  now,
  walletConnected = false,
  historyLoading = false,
  onRefreshHistory,
}: BetRecordCardProps) {
  const [selectedSlip, setSelectedSlip] = useState<EnrichedBet | null>(null);

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

  return (
    <div className="terminal-card flex flex-col p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
          <Receipt className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
          <span>Bet Record</span>
          <span className="rounded-full bg-[var(--card)] border border-[var(--hair)] px-1.5 py-px text-[10px] font-mono text-[var(--ink-muted)]">
            on-chain
          </span>
        </div>
        {onRefreshHistory && (
          <button
            onClick={onRefreshHistory}
            disabled={historyLoading || !walletConnected}
            className="flex items-center gap-1 rounded-md border border-[var(--hair)] bg-[var(--card)] px-2 py-1 text-[10px] font-bold text-[var(--ink-secondary)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)] disabled:opacity-40 cursor-pointer"
            title="Reload bet record from devnet"
          >
            <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} />
            {historyLoading ? "Loading…" : "Refresh"}
          </button>
        )}
      </div>

      {!walletConnected ? (
        <p className="rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] px-3 py-3 text-center text-[11px] text-[var(--ink-muted)]">
          Connect a wallet to load your verified on-chain bet record.
        </p>
      ) : enriched.length === 0 && claims.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] px-3 py-3 text-center text-[11px] text-[var(--ink-muted)]">
          {historyLoading ? "Scanning devnet transfers…" : "No bets yet — your settled rounds will appear here with tx links."}
        </p>
      ) : (
        <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
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
                className={`group relative overflow-hidden rounded-xl border p-2.5 text-[11px] transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                  isSettling
                    ? "border-amber-400/30 bg-[#121620]"
                    : profit
                    ? "border-[#00f076]/45 bg-[#0a1210] shadow-[0_2px_12px_-2px_rgba(0,240,118,0.15)]"
                    : "border-[#ff3358]/45 bg-[#140b10] shadow-[0_2px_12px_-2px_rgba(255,51,88,0.15)]"
                }`}
              >
                {/* Masked Border Beam strictly on 1.5px border track */}
                {!isSettling && (
                  <div className="border-beam-ring rounded-xl">
                    <span className={profit ? "rotating-glow-border-green" : "rotating-glow-border-red"} />
                  </div>
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
              className={`relative w-full max-w-sm overflow-hidden rounded-2xl border p-5 shadow-2xl ${
                selectedSlip.status === "settling"
                  ? "border-amber-400/30 bg-[#0e121a]"
                  : selectedSlip.pnlTokens >= 0
                  ? "border-[#00f076]/45 bg-[#09110d] shadow-[0_0_30px_rgba(0,240,118,0.2)]"
                  : "border-[#ff3358]/45 bg-[#12080d] shadow-[0_0_30px_rgba(255,51,88,0.2)]"
              }`}
            >
              {/* Masked Border Beam strictly on 1.5px border track */}
              {selectedSlip.status !== "settling" && (
                <div className="border-beam-ring rounded-2xl">
                  <span className={selectedSlip.pnlTokens >= 0 ? "rotating-glow-border-green" : "rotating-glow-border-red"} />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[var(--color-neon-orange)]" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    Official Bet Slip
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Round Overview Badge & Hero P&L */}
              <div className="py-4 text-center relative z-10">
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
                <div className="text-xs font-mono font-bold text-white/50 mt-0.5">
                  {selectedSlip.pnlTokens >= 0
                    ? `+${((selectedSlip.pnlTokens / (selectedSlip.stakeTokens || 1)) * 100).toFixed(1)}% Return`
                    : "Capital Deducted"}
                </div>
              </div>

              {/* Breakdown details */}
              <div className="space-y-2 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs font-mono relative z-10">
                <div className="flex justify-between text-white/60">
                  <span>Stake Amount:</span>
                  <span className="font-bold text-white">${selectedSlip.stakeTokens.toFixed(2)} tUSD</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Payout Total:</span>
                  <span className="font-bold text-white">${selectedSlip.payoutTokens.toFixed(2)} tUSD</span>
                </div>
                {selectedSlip.entryPrice && (
                  <div className="flex justify-between text-white/60">
                    <span>Strike Entry:</span>
                    <span className="font-bold text-white">${formatPrice(selectedSlip.entryPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/60">
                  <span>Settlement:</span>
                  <span className="text-[var(--color-neon-orange)] font-bold">10-Sec Fast Round</span>
                </div>
              </div>

              {/* On-Chain Proof Links */}
              <div className="mt-3 space-y-1.5 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                  Verified On-Chain Signatures
                </div>
                <a
                  href={explorerTxUrl(selectedSlip.stakeSignature)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:border-[var(--color-neon-orange)] transition-colors"
                >
                  <span>Stake Tx: {selectedSlip.stakeSignature.slice(0, 8)}…{selectedSlip.stakeSignature.slice(-6)}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                </a>

                {selectedSlip.payoutSignature && (
                  <a
                    href={explorerTxUrl(selectedSlip.payoutSignature)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:border-[var(--color-neon-orange)] transition-colors"
                  >
                    <span>Payout Tx: {selectedSlip.payoutSignature.slice(0, 8)}…{selectedSlip.payoutSignature.slice(-6)}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#00f076]" />
                  </a>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedSlip(null)}
                className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-center text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer relative z-10"
              >
                Close Slip
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
