"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Award, Flame, Zap } from "lucide-react";

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
          {/* Subtle backdrop vignette */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#090a0f]/40 backdrop-blur-[2px]"
          />

          {/* Core Victory Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="relative overflow-hidden rounded-2xl border border-[#00f076]/40 bg-[#121620]/95 p-6 shadow-[0_0_40px_rgba(0,240,118,0.25)] text-center max-w-sm w-full mx-4 backdrop-blur-xl"
          >
            {/* Luminous Light Sweep Across Card */}
            <span className="energy-beam-up" />

            {/* Victory Badge */}
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00f076]/15 border border-[#00f076]/40 text-[#00f076]">
              {isMega ? <Flame className="h-6 w-6 animate-pulse" /> : <Award className="h-6 w-6" />}
            </div>

            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00f076]">
              {isMega ? "★ MEGA WIN (5x CAPPED) ★" : "TRADE SETTLED · WIN"}
            </span>

            {/* Animated P&L Number */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="my-2 font-mono text-4xl font-black tracking-tight text-[#00f076] drop-shadow-[0_0_16px_rgba(0,240,118,0.4)]"
            >
              +{formatUsd(profit)}
            </motion.div>

            <p className="text-xs text-slate-300 font-medium">
              1000x Price Sensitivity Payout Materialized
            </p>

            {streak && streak >= 2 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-extrabold text-amber-400">
                <Flame className="h-3.5 w-3.5 fill-amber-400" />
                <span>{streak}x WIN STREAK ON FIRE</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
