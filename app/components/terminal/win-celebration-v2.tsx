"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getRandomCelebratingPepe, type PepeEmote } from "@/app/lib/pepe-emotes";
import { ArrowUp, ArrowDown, Receipt, X, Flame } from "lucide-react";

export interface WinCelebrationProps {
  profit: number;
  show: boolean;
  streak?: number;
  isMega?: boolean;
  symbol?: string;
  direction?: "up" | "down";
  stake?: number;
  entryPrice?: number;
  exitPrice?: number;
  pnlPct?: number;
  onDone?: () => void;
  seed?: string;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function WinCelebrationV2({
  profit,
  show,
  streak,
  symbol = "SOL",
  direction = "up",
  stake = 10,
  entryPrice,
  pnlPct,
  onDone,
  seed,
}: WinCelebrationProps) {
  const [currentPepe, setCurrentPepe] = useState<PepeEmote>(() => getRandomCelebratingPepe());

  useEffect(() => {
    if (!show) return;
    // Pick a new random enjoying Pepe every time
    setCurrentPepe(getRandomCelebratingPepe(seed));

    const duration = 3800;
    const timer = setTimeout(() => {
      onDone?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, seed, onDone]);

  const returnPct = pnlPct ?? (stake > 0 ? (profit / stake) * 100 : 0);

  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => onDone?.()}
        >
          {/* Big Victory Bet Slip Card in Center of Screen */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="group relative w-full max-w-sm overflow-hidden rounded-2xl p-5 text-center shadow-2xl glass-card-win border border-[#00f076]/40"
          >
            {/* Glass Shining Effect Overlays */}
            <div className="glass-reflection-overlay" />
            <div className="glass-shine-beam" />

            {/* Ticket Notches for Authentic Bet Slip Feel */}
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[var(--background)] border-r border-[#00f076]/40" />
            <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[var(--background)] border-l border-[#00f076]/40" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--hair)] pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#00f076]" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                  Official Bet Slip · Settled Win
                </span>
              </div>
              <button
                onClick={() => onDone?.()}
                className="rounded-lg p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--hair)] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pepe Enjoying Animation + Direction Badge + Big Won Amount */}
            <div className="py-4 relative z-10">
              {/* Random Enjoying Pepe */}
              <div className="flex justify-center mb-2.5">
                <img
                  src={currentPepe.src}
                  alt={currentPepe.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain drop-shadow-[0_4px_16px_rgba(0,240,118,0.5)] select-none"
                />
              </div>

              {/* Direction & Asset Badge */}
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase mb-1.5 border border-[#00f076]/40 bg-[#00f076]/15 text-[#00f076]"
              >
                {direction === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                <span>{direction.toUpperCase()} · {symbol}</span>
              </div>

              {/* Big Font P&L Number */}
              <motion.div
                initial={{ scale: 0.94 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="my-1 font-mono text-4xl sm:text-5xl font-black tracking-tight text-[#00f076] drop-shadow-[0_0_20px_rgba(0,240,118,0.35)]"
              >
                +{formatUsd(profit)}
              </motion.div>

              <div className="text-xs font-mono font-bold text-[var(--ink-muted)]">
                +{returnPct.toFixed(1)}% Return · Trade Settled
              </div>
            </div>

            {/* Few Values Breakdown */}
            <div className="space-y-2 rounded-xl bg-[var(--panel)] border border-[var(--hair)] p-3 text-xs font-mono text-left relative z-10">
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Stake Amount:</span>
                <span className="font-bold text-[var(--ink)]">${stake.toFixed(2)} tUSD</span>
              </div>
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Payout Total:</span>
                <span className="font-bold text-[#00f076]">${(stake + profit).toFixed(2)} tUSD</span>
              </div>
              {entryPrice && (
                <div className="flex justify-between text-[var(--ink-muted)]">
                  <span>Strike Entry:</span>
                  <span className="font-bold text-[var(--ink)]">${formatPrice(entryPrice)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Settlement:</span>
                <span className="text-[var(--color-neon-orange)] font-bold">10-Sec Fast Round</span>
              </div>
            </div>

            {/* Win Streak Pill if streak >= 2 */}
            {streak && streak >= 2 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)] px-3 py-1 text-xs font-extrabold text-[var(--color-neon-orange)] relative z-10">
                <Flame className="h-3.5 w-3.5 fill-[var(--color-neon-orange)]" />
                <span>{streak}x WIN STREAK</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
