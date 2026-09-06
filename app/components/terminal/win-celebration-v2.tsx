"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Award, Flame } from "lucide-react";

interface WinCelebrationProps {
  profit: number;
  show: boolean;
  streak?: number;
  isMega?: boolean;
  onDone?: () => void;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WinCelebrationV2({
  profit,
  show,
  streak,
  isMega,
  onDone,
}: WinCelebrationProps) {
  useEffect(() => {
    if (!show) return;
    const duration = isMega ? 2200 : 1600;
    const timer = setTimeout(() => {
      onDone?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, isMega, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
          />

          {/* Core Victory Modal Card (flat, no glow/blur) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="relative overflow-hidden rounded-lg border border-[var(--hair)] bg-[var(--card)] p-6 text-center max-w-sm w-full mx-4"
          >
            {/* Victory Badge */}
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--up-tint)] border border-[var(--up)] text-[var(--up)]">
              {isMega ? <Flame className="h-6 w-6" /> : <Award className="h-6 w-6" />}
            </div>

            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--up)]">
              {isMega ? "★ MEGA WIN (5x CAPPED) ★" : "TRADE SETTLED · WIN"}
            </span>

            {/* P&L Number */}
            <motion.div
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="my-2 font-mono text-4xl font-black tracking-tight text-[var(--up)]"
            >
              +{formatUsd(profit)}
            </motion.div>

            <p className="text-xs text-[var(--ink-secondary)] font-medium">
              1000x Price Sensitivity Payout Materialized
            </p>

            {streak && streak >= 2 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)] px-3 py-1 text-xs font-extrabold text-[var(--color-neon-orange)]">
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
