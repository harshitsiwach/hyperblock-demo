"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, CheckCircle, Clock, Radio, Zap, X, ExternalLink, ArrowUp, ArrowDown, Receipt } from "lucide-react";

/** Structured per-bet data powering the stream rows + detail popup. */
export interface BetDetail {
  symbol: string;
  direction: "up" | "down";
  stakeTokens: number;
  entryPrice: number;
  exitPrice?: number;
  payoutTokens?: number;
  profitTokens?: number;
  feeTokens?: number;
  status: "settling" | "won" | "lost" | "breakeven" | "refunded";
  stakeSignature?: string;
  payoutSignature?: string;
  openedAt: number;
  settledAt?: number;
}

export interface ActivityItem {
  id: string;
  type: "system" | "trade" | "settlement" | "switch";
  title: string;
  subtitle: string;
  timestamp: number;
  highlight?: "green" | "red" | "neutral";
  detail?: BetDetail;
}

interface RecentActivityProps {
  items: ActivityItem[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatPrice(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v < 1) return v.toFixed(4);
  if (v < 10) return v.toFixed(3);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** P&L as % of stake. Null while the round hasn't settled. */
export function betPnlPct(d: BetDetail): number | null {
  if (d.status === "settling" || !Number.isFinite(d.profitTokens ?? NaN)) return null;
  if (d.stakeTokens <= 0) return null;
  return ((d.profitTokens ?? 0) / d.stakeTokens) * 100;
}

/** Directed price move % (positive = direction was right). */
export function betMovePct(d: BetDetail): number | null {
  if (!Number.isFinite(d.entryPrice) || !Number.isFinite(d.exitPrice ?? NaN)) return null;
  if (d.entryPrice <= 0) return null;
  const move = ((d.exitPrice! - d.entryPrice) / d.entryPrice) * 100;
  return d.direction === "up" ? move : -move;
}

function explorerTxUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

function BetDetailModal({ detail, onClose }: { detail: BetDetail; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isUp = detail.direction === "up";
  const settled = detail.status !== "settling";
  const pnl = detail.profitTokens ?? 0;
  const pct = betPnlPct(detail);
  const move = betMovePct(detail);
  const good = !settled ? true : pnl >= 0;
  const durationSec =
    detail.settledAt && detail.openedAt ? Math.max(0, Math.round((detail.settledAt - detail.openedAt) / 1000)) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={onClose}
      role="presentation"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label="Bet details"
        className="w-full max-w-sm rounded-2xl border border-[var(--glass-card-border)] bg-[#121620] p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black uppercase ${
                isUp ? "bg-[#00f076]/20 text-[#00f076]" : "bg-[#ff3358]/20 text-[#ff3358]"
              }`}
            >
              {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {detail.direction} · {detail.symbol}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                !settled
                  ? "bg-amber-400/20 text-amber-300"
                  : good
                    ? "bg-[#00f076]/20 text-[#00f076]"
                    : "bg-[#ff3358]/20 text-[#ff3358]"
              }`}
            >
              {detail.status}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:text-white hover:bg-white/[0.08]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hero P&L */}
        <div className="py-3 text-center">
          {settled && pct !== null ? (
            <>
              <div className={`font-mono text-3xl font-black ${good ? "text-[#00f076]" : "text-[#ff3358]"}`}>
                {pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toFixed(2)}
              </div>
              <div className={`mt-0.5 font-mono text-sm font-bold ${good ? "text-[#00f076]/80" : "text-[#ff3358]/80"}`}>
                {pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(2)}% of stake
              </div>
            </>
          ) : (
            <div className="font-mono text-lg font-bold text-amber-300 animate-pulse">Awaiting settlement…</div>
          )}
        </div>

        {/* Detail grid */}
        <dl className="space-y-1.5 rounded-xl border border-white/[0.06] bg-black/30 p-3 font-mono text-[11px]">
          <div className="flex justify-between"><dt className="text-slate-500">Stake</dt><dd className="text-white font-bold">{detail.stakeTokens} tUSD</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Bet price (entry)</dt><dd className="text-white">${formatPrice(detail.entryPrice)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Closing price</dt><dd className="text-white">{detail.exitPrice !== undefined ? `$${formatPrice(detail.exitPrice)}` : "…"}</dd></div>
          {move !== null && (
            <div className="flex justify-between"><dt className="text-slate-500">Directed move</dt><dd className={move >= 0 ? "text-[#00f076]" : "text-[#ff3358]"}>{move >= 0 ? "+" : "−"}{Math.abs(move).toFixed(3)}%</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-slate-500">Payout</dt><dd className="text-white">{detail.payoutTokens !== undefined ? `${detail.payoutTokens.toFixed(2)} tUSD` : "…"}</dd></div>
          {detail.feeTokens !== undefined && detail.feeTokens > 0 && (
            <div className="flex justify-between"><dt className="text-slate-500">Protocol fee</dt><dd className="text-slate-300">{detail.feeTokens.toFixed(4)} tUSD</dd></div>
          )}
          {durationSec !== null && (
            <div className="flex justify-between"><dt className="text-slate-500">Round time</dt><dd className="text-slate-300">~{durationSec}s</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-slate-500">Opened</dt><dd className="text-slate-300">{formatTime(detail.openedAt)}</dd></div>
          {detail.settledAt && (
            <div className="flex justify-between"><dt className="text-slate-500">Settled</dt><dd className="text-slate-300">{formatTime(detail.settledAt)}</dd></div>
          )}
        </dl>

        {/* Tx links */}
        {(detail.stakeSignature || detail.payoutSignature) && (
          <div className="mt-2.5 flex gap-2">
            {detail.stakeSignature && (
              <a
                href={explorerTxUrl(detail.stakeSignature)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/[0.1]"
              >
                Stake tx <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {detail.payoutSignature && (
              <a
                href={explorerTxUrl(detail.payoutSignature)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/[0.1]"
              >
                Payout tx <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </motion.section>
    </div>
  );
}

export function RecentActivity({ items }: RecentActivityProps) {
  const [openDetail, setOpenDetail] = useState<BetDetail | null>(null);

  return (
    <div className="terminal-card flex flex-col p-4 lg:p-5 h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--glass-panel-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Recent Terminal Stream
          </h3>
        </div>
        <span className="live-pulse-dot" />
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {items.slice(0, 10).map((item, index) => {
            const isFresh = index === 0;
            const d = item.detail;
            const pct = d ? betPnlPct(d) : null;
            const clickable = !!d;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: isFresh ? 1 : 0.8, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex items-start gap-2.5 rounded-lg border p-2 text-xs transition-colors ${
                  isFresh
                    ? "border-[var(--glass-card-hover-border)] bg-[var(--glass-card-hover-bg)]"
                    : "border-[var(--glass-card-border)] bg-[var(--glass-card-bg)]"
                }`}
              >
                {/* Indicator dot */}
                <div className="mt-1 flex-shrink-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      item.highlight === "green"
                        ? "bg-[#00f076] shadow-[0_0_6px_#00f076]"
                        : item.highlight === "red"
                        ? "bg-[#ff3358] shadow-[0_0_6px_#ff3358]"
                        : "bg-[var(--ink-muted)]"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span
                      className={`font-semibold truncate ${
                        item.highlight === "green"
                          ? "text-[#00f076]"
                          : item.highlight === "red"
                          ? "text-[#ff3358]"
                          : "text-[var(--ink)]"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-muted)] flex-shrink-0">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                    {item.subtitle}
                  </p>
                  {d && (
                    <div className="mt-1 space-y-0.5 font-mono text-[10px] leading-relaxed">
                      <div className="flex justify-between gap-2 text-[var(--ink-muted)]">
                        <span>Bet <span className="text-[var(--ink)]">${formatPrice(d.entryPrice)}</span></span>
                        <span>
                          Close{" "}
                          <span className="text-[var(--ink)]">
                            {d.exitPrice !== undefined ? `$${formatPrice(d.exitPrice)}` : "…"}
                          </span>
                        </span>
                      </div>
                      {pct !== null && d.profitTokens !== undefined && (
                        <div className={`flex justify-between gap-2 font-bold ${d.profitTokens >= 0 ? "text-[#00f076]" : "text-[#ff3358]"}`}>
                          <span>P&L {d.profitTokens >= 0 ? "+" : "−"}${Math.abs(d.profitTokens).toFixed(2)}</span>
                          <span>({pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(1)}%)</span>
                        </div>
                      )}
                      {d.status === "settling" && (
                        <div className="text-amber-300/90">Settling…</div>
                      )}
                    </div>
                  )}
                </div>
                {clickable && (
                  <button
                    onClick={() => setOpenDetail(d!)}
                    className="mt-0.5 flex flex-shrink-0 items-center gap-1 rounded-md border border-white/[0.12] bg-white/[0.05] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-200 hover:bg-white/[0.12] hover:text-white active:scale-95"
                    title="Open bet slip"
                  >
                    <Receipt className="h-3 w-3" />
                    Bet Slip
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bet detail popup */}
      <AnimatePresence>
        {openDetail && <BetDetailModal detail={openDetail} onClose={() => setOpenDetail(null)} />}
      </AnimatePresence>
    </div>
  );
}
