"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUp, 
  ArrowDown, 
  Trophy, 
  X, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { AssetIcon } from "@/app/components/asset-icon";

export type BetNotificationType = "placed" | "settling" | "won" | "lost" | "refunded" | "info";

export interface BetNotificationData {
  id: string;
  type: BetNotificationType;
  symbol: string;
  direction?: "up" | "down";
  stake?: number;
  entryPrice?: number;
  exitPrice?: number;
  profit?: number;
  pnlPct?: number;
  durationMs?: number;
  message?: string;
  timestamp: number;
}

interface TerminalNotificationProps {
  notification: BetNotificationData | null;
  onDismiss: () => void;
}

function formatPrice(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return "—";
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TerminalNotification({ notification, onDismiss }: TerminalNotificationProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);

  // Auto-dismiss countdown for result and info notifications
  useEffect(() => {
    if (!notification) return;

    if (notification.type === "won" || notification.type === "lost" || notification.type === "refunded" || notification.type === "info") {
      const autoTimer = setTimeout(() => {
        onDismiss();
      }, notification.type === "won" ? 5000 : 3800);
      return () => clearTimeout(autoTimer);
    }

    if (notification.type === "placed") {
      setSecondsRemaining(10);
      const interval = setInterval(() => {
        setSecondsRemaining((s) => {
          if (s <= 1) {
            clearInterval(interval);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isUp = notification.direction === "up";
  const isWon = notification.type === "won";
  const isLost = notification.type === "lost";
  const isSettling = notification.type === "settling";
  const isPlaced = notification.type === "placed";

  // Theme border and glow colors
  let accentColor = "var(--color-neon-orange)";
  let accentBg = "rgba(255, 95, 31, 0.12)";
  let borderColor = "rgba(255, 95, 31, 0.4)";
  let glowShadow = "0 8px 32px -4px rgba(255, 95, 31, 0.25)";

  if (isWon) {
    accentColor = "#00f076";
    accentBg = "rgba(0, 240, 118, 0.14)";
    borderColor = "rgba(0, 240, 118, 0.5)";
    glowShadow = "0 8px 36px -4px rgba(0, 240, 118, 0.35), 0 0 20px rgba(0, 240, 118, 0.2)";
  } else if (isLost) {
    accentColor = "#ff3358";
    accentBg = "rgba(255, 51, 88, 0.14)";
    borderColor = "rgba(255, 51, 88, 0.5)";
    glowShadow = "0 8px 36px -4px rgba(255, 51, 88, 0.35), 0 0 20px rgba(255, 51, 88, 0.2)";
  } else if (isSettling) {
    accentColor = "#fbbf24";
    accentBg = "rgba(251, 191, 36, 0.12)";
    borderColor = "rgba(251, 191, 36, 0.5)";
    glowShadow = "0 8px 32px -4px rgba(251, 191, 36, 0.28)";
  } else if (isPlaced) {
    accentColor = isUp ? "#00f076" : "#ff3358";
    accentBg = isUp ? "rgba(0, 240, 118, 0.12)" : "rgba(255, 51, 88, 0.12)";
    borderColor = isUp ? "rgba(0, 240, 118, 0.45)" : "rgba(255, 51, 88, 0.45)";
    glowShadow = isUp ? "0 8px 32px -4px rgba(0, 240, 118, 0.25)" : "0 8px 32px -4px rgba(255, 51, 88, 0.25)";
  }

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 w-full max-w-[460px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={notification.id + notification.type}
          initial={{ opacity: 0, y: -24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 440, damping: 28 }}
          style={{
            borderColor,
            boxShadow: glowShadow,
          }}
          className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-[#0b0e14]/95 backdrop-blur-2xl p-3.5 sm:p-4 text-[var(--ink)] shadow-2xl transition-all"
        >
          {/* Animated top shimmer beam for high impact */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />

          <div className="flex items-start gap-3">
            {/* Status Icon Badge */}
            <div
              className="flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-xl border relative"
              style={{
                backgroundColor: accentBg,
                borderColor,
              }}
            >
              {isWon ? (
                <Trophy className="h-5 w-5 text-[#00f076] animate-bounce" />
              ) : isLost ? (
                <X className="h-5 w-5 text-[#ff3358]" />
              ) : isSettling ? (
                <>
                  <span className="absolute h-full w-full rounded-xl bg-amber-400/20 animate-ping" />
                  <Radio className="h-5 w-5 text-amber-400 animate-pulse" />
                </>
              ) : isPlaced ? (
                isUp ? (
                  <ArrowUp className="h-5 w-5 text-[#00f076]" />
                ) : (
                  <ArrowDown className="h-5 w-5 text-[#ff3358]" />
                )
              ) : (
                <Sparkles className="h-5 w-5 text-[var(--color-neon-orange)]" />
              )}
            </div>

            {/* Notification Body Content */}
            <div className="flex-1 min-w-0">
              {/* Header Line: Category Tag, Asset, Close button */}
              <div className="flex items-center justify-between gap-1.5 pb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border"
                    style={{
                      color: accentColor,
                      borderColor,
                      backgroundColor: accentBg,
                    }}
                  >
                    {isPlaced
                      ? `TICKET CREATED · ${isUp ? "UP" : "DOWN"}`
                      : isSettling
                      ? "ROUND SETTLING"
                      : isWon
                      ? "TRADE WON · PAYOUT"
                      : isLost
                      ? "ROUND CLOSED"
                      : notification.type.toUpperCase()}
                  </span>

                  {notification.symbol && (
                    <div className="flex items-center gap-1">
                      <AssetIcon symbol={notification.symbol} size={14} />
                      <span className="font-mono text-xs font-bold text-[var(--ink)]">
                        {notification.symbol}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={onDismiss}
                  aria-label="Dismiss notification"
                  className="rounded-lg p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Main Headline / Value */}
              <div className="mt-0.5">
                {isWon && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#00f076] tracking-tight">
                      +${(notification.profit ?? 0).toFixed(2)}
                    </span>
                    {notification.pnlPct !== undefined && (
                      <span className="text-xs font-mono font-bold text-[#00f076]/90">
                        (+{notification.pnlPct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}

                {isLost && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#ff3358] tracking-tight">
                      -${(notification.stake ?? 0).toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-[var(--ink-muted)]">
                      Capital deducted
                    </span>
                  </div>
                )}

                {isPlaced && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-base sm:text-lg font-black text-[var(--ink)]">
                      ${notification.stake?.toFixed(2)} Stake
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--ink-muted)]">
                      @ ${formatPrice(notification.entryPrice)}
                    </span>
                  </div>
                )}

                {isSettling && (
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span>Awaiting Hyperliquid exit price…</span>
                  </div>
                )}

                {notification.message && !isWon && !isLost && !isPlaced && !isSettling && (
                  <p className="text-xs text-[var(--ink)] font-semibold">{notification.message}</p>
                )}
              </div>

              {/* Footnote Details / Price Movement */}
              <div className="mt-1 text-[11px] font-mono text-[var(--ink-muted)] flex items-center justify-between gap-2">
                {isPlaced && (
                  <>
                    <span>1000x Sensitivity · 10s Round</span>
                    <span className="text-[var(--color-neon-orange)] font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {secondsRemaining}s remaining
                    </span>
                  </>
                )}

                {isSettling && (
                  <span>Locked strike: ${formatPrice(notification.entryPrice)}</span>
                )}

                {(isWon || isLost) && (
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <span>Entry: ${formatPrice(notification.entryPrice)}</span>
                    <span>→</span>
                    <span className={isWon ? "text-[#00f076] font-bold" : "text-[#ff3358] font-bold"}>
                      Exit: ${formatPrice(notification.exitPrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Animated Progress Drain Bar for Bet Placement Countdown */}
          {isPlaced && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 10, ease: "linear" }}
                className="h-full"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
