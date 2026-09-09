"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  CheckCircle,
  Clock,
  Radio,
  Zap,
  X,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Receipt,
  Maximize2,
  Minimize2,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  defaultExpanded?: boolean;
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

export function RecentActivity({ items, defaultExpanded = false }: RecentActivityProps) {
  const [openDetail, setOpenDetail] = useState<BetDetail | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // In rest mode (collapsed): show exactly 5 events. In expanded mode: show all available events with scrolling.
  const displayItems = isExpanded ? items : items.slice(0, 5);

  return (
    <>
      {/* Backdrop overlay when expanded so user can click outside to collapse */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Docked Bottom Notch (0 space to the bottom, overlaps on expand with physics spring animation) */}
      <div className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[1680px] z-40 px-2 sm:px-4 pointer-events-none">
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? 520 : 210,
            borderColor: isExpanded ? "rgba(255, 95, 31, 0.45)" : "var(--hair)",
            boxShadow: isExpanded
              ? "0 -16px 50px -10px rgba(255, 95, 31, 0.3), 0 0 0 1px rgba(255, 95, 31, 0.4)"
              : "0 -4px 20px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--hair)",
          }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 26,
            mass: 0.9,
          }}
          className="pointer-events-auto w-full rounded-t-xl sm:rounded-t-2xl border-t border-x bg-[var(--card)]/95 backdrop-blur-xl flex flex-col overflow-hidden relative"
        >
          {/* Glowing Top Laser Beam Sweep across notch border when expanded */}
          {isExpanded && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
              className="absolute top-0 left-0 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-neon-orange)] to-transparent pointer-events-none z-20"
            />
          )}

          {/* Sleek Center Grab Bar with Pulse Glow on Expand */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex justify-center pt-2 pb-0.5 cursor-pointer select-none"
          >
            <motion.div
              animate={{
                width: isExpanded ? 56 : 36,
                backgroundColor: isExpanded ? "var(--color-neon-orange)" : "var(--hair)",
                boxShadow: isExpanded ? "0 0 10px rgba(255, 95, 31, 0.85)" : "none",
              }}
              transition={{ duration: 0.25 }}
              className="h-1 rounded-full"
            />
          </div>

          {/* Notch Header Bar */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center justify-between border-b border-[var(--hair)] px-3 sm:px-4 py-2 cursor-pointer select-none hover:bg-[var(--card)]/60 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--card)] border border-[var(--hair)]">
                <Terminal className="h-3 w-3 text-[var(--color-neon-orange)]" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-2">
                <span>Recent Terminal Stream</span>
                <span className="live-pulse-dot" />
              </h3>
              <span className="hidden sm:inline-flex items-center rounded bg-[var(--card)] border border-[var(--hair)] px-2 py-0.5 text-[9px] font-mono font-bold text-[var(--ink-secondary)]">
                {isExpanded ? `${items.length} logs · scroll all` : `Rest Mode (${displayItems.length}/5)`}
              </span>
            </div>

            {/* Top-Right Expand / Collapse Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              id="terminal-expand-button"
              aria-label={isExpanded ? "Collapse terminal stream" : "Expand terminal stream"}
              className="flex items-center gap-1.5 rounded-md border border-[var(--hair)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink)] hover:text-[var(--color-neon-orange)] hover:border-[var(--color-neon-orange)] transition-colors shadow-sm cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-3 w-3 text-[var(--ink-secondary)]" />
                  <span>Collapse</span>
                  <ChevronDown className="h-3 w-3 text-[var(--ink-muted)]" />
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3 text-[var(--color-neon-orange)]" />
                  <span>Expand</span>
                  <ChevronUp className="h-3 w-3 text-[var(--ink-muted)]" />
                </>
              )}
            </button>
          </div>

          {/* Activity Log Items Container */}
          <div
            className={`flex-1 space-y-1.5 p-2.5 pr-3 ${
              isExpanded ? "overflow-y-auto" : "overflow-hidden"
            }`}
          >
            <AnimatePresence initial={false}>
              {displayItems.map((item, index) => {
                const isFresh = index === 0;
                const d = item.detail;
                const pct = d ? betPnlPct(d) : null;
                const clickable = !!d;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      duration: 0.22,
                      delay: isExpanded ? Math.min(index * 0.025, 0.28) : 0,
                      ease: "easeOut",
                    }}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      isFresh
                        ? "border-[var(--hair)] bg-[var(--card)] shadow-sm"
                        : "border-[var(--hair)] bg-[var(--card)]/60 hover:bg-[var(--card)]"
                    }`}
                  >
                    {/* Indicator dot */}
                    <div className="flex-shrink-0">
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
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-semibold text-xs truncate ${
                            item.highlight === "green"
                              ? "text-emerald-600 dark:text-[#00f076]"
                              : item.highlight === "red"
                              ? "text-rose-600 dark:text-[#ff3358]"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDetail(d!);
                        }}
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

            {displayItems.length === 0 && (
              <div className="p-3 text-center text-xs text-[var(--ink-muted)]">
                No activity logged yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bet detail popup */}
      <AnimatePresence>
        {openDetail && <BetDetailModal detail={openDetail} onClose={() => setOpenDetail(null)} />}
      </AnimatePresence>
    </>
  );
}
