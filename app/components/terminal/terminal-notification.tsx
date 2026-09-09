"use client";

import { useEffect, useRef } from "react";
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
  // Stable ref for onDismiss to prevent frequent parent re-renders from resetting the timer
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const notifId = notification?.id;
  const notifType = notification?.type;

  // Auto-dismiss timer tied strictly to the notification ID & type
  useEffect(() => {
    if (!notifId || !notifType) return;

    const duration = 
      notifType === "won" ? 4000 :
      notifType === "placed" ? 3800 :
      notifType === "settling" ? 3500 : 3500;

    const timer = setTimeout(() => {
      onDismissRef.current();
    }, duration);

    return () => clearTimeout(timer);
  }, [notifId, notifType]);

  const isUp = notification?.direction === "up";
  const isWon = notification?.type === "won";
  const isLost = notification?.type === "lost";
  const isSettling = notification?.type === "settling";
  const isPlaced = notification?.type === "placed";

  // Refined theme accent tokens
  let accentColor = "var(--color-neon-orange)";
  let accentBg = "rgba(255, 95, 31, 0.12)";
  let borderColor = "rgba(255, 95, 31, 0.35)";
  let glowShadow = "0 10px 30px -6px rgba(255, 95, 31, 0.25)";

  if (isWon) {
    accentColor = "#00f076";
    accentBg = "rgba(0, 240, 118, 0.12)";
    borderColor = "rgba(0, 240, 118, 0.4)";
    glowShadow = "0 10px 30px -6px rgba(0, 240, 118, 0.25)";
  } else if (isLost) {
    accentColor = "#ff3358";
    accentBg = "rgba(255, 51, 88, 0.12)";
    borderColor = "rgba(255, 51, 88, 0.4)";
    glowShadow = "0 10px 30px -6px rgba(255, 51, 88, 0.25)";
  } else if (isSettling) {
    accentColor = "#fbbf24";
    accentBg = "rgba(251, 191, 36, 0.12)";
    borderColor = "rgba(251, 191, 36, 0.4)";
    glowShadow = "0 10px 30px -6px rgba(251, 191, 36, 0.25)";
  } else if (isPlaced) {
    accentColor = isUp ? "#00f076" : "#ff3358";
    accentBg = isUp ? "rgba(0, 240, 118, 0.12)" : "rgba(255, 51, 88, 0.12)";
    borderColor = isUp ? "rgba(0, 240, 118, 0.4)" : "rgba(255, 51, 88, 0.4)";
    glowShadow = isUp ? "0 10px 30px -6px rgba(0, 240, 118, 0.22)" : "0 10px 30px -6px rgba(255, 51, 88, 0.22)";
  }

  const dismissDurationSec = 
    notification?.type === "won" ? 4.0 :
    notification?.type === "placed" ? 3.8 :
    notification?.type === "settling" ? 3.5 : 3.5;

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 w-full max-w-[410px]">
      <AnimatePresence mode="wait">
        {notification && (
          <motion.div
            key={notification.id + notification.type}
            initial={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, scale: 0.92, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            style={{
              borderColor,
              boxShadow: glowShadow,
            }}
            className="pointer-events-auto relative w-full overflow-hidden rounded-xl border bg-[#0b0e14]/94 backdrop-blur-2xl p-3 sm:p-3.5 text-[var(--ink)] transition-all"
          >
          {/* Subtle top accent highlight line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1.5px]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
            }}
          />

          <div className="flex items-center gap-3">
            {/* Status Icon Badge */}
            <div
              className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg border relative"
              style={{
                backgroundColor: accentBg,
                borderColor,
              }}
            >
              {isWon ? (
                <Trophy className="h-4.5 w-4.5 text-[#00f076] animate-bounce" />
              ) : isLost ? (
                <X className="h-4.5 w-4.5 text-[#ff3358]" />
              ) : isSettling ? (
                <>
                  <span className="absolute h-full w-full rounded-lg bg-amber-400/20 animate-ping" />
                  <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
                </>
              ) : isPlaced ? (
                isUp ? (
                  <ArrowUp className="h-4.5 w-4.5 text-[#00f076]" />
                ) : (
                  <ArrowDown className="h-4.5 w-4.5 text-[#ff3358]" />
                )
              ) : (
                <Sparkles className="h-4 w-4 text-[var(--color-neon-orange)]" />
              )}
            </div>

            {/* Notification Body Content */}
            <div className="flex-1 min-w-0">
              {/* Header Line: Category Tag, Asset, Close button */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-[9.5px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded border"
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
                      ? "ROUND WON"
                      : isLost
                      ? "ROUND CLOSED"
                      : notification.type.toUpperCase()}
                  </span>

                  {notification.symbol && (
                    <div className="flex items-center gap-1 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
                      <AssetIcon symbol={notification.symbol} size={12} />
                      <span className="font-mono text-[10.5px] font-bold text-white/90">
                        {notification.symbol}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={onDismiss}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Main Headline / Value */}
              <div className="mt-1">
                {isWon && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg sm:text-xl font-black text-[#00f076] tracking-tight">
                      +${(notification.profit ?? 0).toFixed(2)}
                    </span>
                    {notification.pnlPct !== undefined && (
                      <span className="text-[11px] font-mono font-bold text-[#00f076]/90">
                        (+{notification.pnlPct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}

                {isLost && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg sm:text-xl font-black text-[#ff3358] tracking-tight">
                      -${(notification.stake ?? 0).toFixed(2)}
                    </span>
                    <span className="text-[11px] font-medium text-white/50">
                      Capital deducted
                    </span>
                  </div>
                )}

                {isPlaced && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-black text-white">
                      ${notification.stake?.toFixed(2)} Stake
                    </span>
                    <span className="text-[11px] font-mono font-bold text-white/50">
                      @ ${formatPrice(notification.entryPrice)}
                    </span>
                  </div>
                )}

                {isSettling && (
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Awaiting Hyperliquid exit price…</span>
                  </div>
                )}

                {notification.message && !isWon && !isLost && !isPlaced && !isSettling && (
                  <p className="text-xs text-white/90 font-semibold">{notification.message}</p>
                )}
              </div>

              {/* Footnote Details / Price Movement */}
              <div className="mt-0.5 text-[10.5px] font-mono text-white/50 flex items-center justify-between gap-2">
                {isPlaced && (
                  <>
                    <span>1000x Sensitivity · 10s Round</span>
                    <span className="text-white/40 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> auto-dismiss
                    </span>
                  </>
                )}

                {isSettling && (
                  <span>Locked strike: ${formatPrice(notification.entryPrice)}</span>
                )}

                {(isWon || isLost) && (
                  <div className="flex items-center gap-2 text-[10px]">
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

          {/* Animated Progress Drain Bar matching auto-dismiss duration */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06] overflow-hidden">
            <motion.div
              key={notification.id + notification.type}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: dismissDurationSec, ease: "linear" }}
              className="h-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
