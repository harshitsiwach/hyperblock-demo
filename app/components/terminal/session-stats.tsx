"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import type { Play } from "@/app/lib/domain";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";

interface SessionStatsProps {
  plays: Play[];
  streak: number;
  bestStreak: number;
  walletConnected?: boolean;
  /** Render content without the outer card frame (for embedding in popovers). */
  bare?: boolean;
}

function formatUsd(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SessionStats({ plays, streak, bestStreak, walletConnected = true, bare = false }: SessionStatsProps) {
  const wins = useMemo(() => plays.filter((p) => p.status === "won").length, [plays]);
  const losses = useMemo(() => plays.filter((p) => p.status === "lost").length, [plays]);
  const breakevens = useMemo(
    () => plays.filter((p) => p.status === "breakeven" || p.status === "refunded").length,
    [plays]
  );
  const totalSettled = wins + losses;
  const winRate = totalSettled > 0 ? Math.round((wins / totalSettled) * 100) : 0;

  const totalPnL = useMemo(() => {
    return plays.reduce((acc, p) => acc + (p.liveProfitUsd ?? 0), 0);
  }, [plays]);

  const isPositive = totalPnL >= 0;

  return (
    <div className={bare ? "flex flex-col justify-between" : "terminal-card flex flex-col justify-between p-4 lg:p-5 h-full"}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--glass-panel-border-subtle)] pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Session Performance
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h4 className="text-sm font-extrabold text-[var(--ink)]">
              {totalSettled > 0 ? `${winRate}% win rate` : "No settled plays yet"}
            </h4>
          </div>
        </div>
      </div>

      {/* Main P&L Number with Typewriter Animation */}
      <div className="my-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          Total Net P&L
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <TypewriterNumber
            value={totalPnL}
            prefix={isPositive ? "+$" : "-$"}
            decimals={2}
            className={`text-2xl font-extrabold tracking-tight font-mono ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          />
          <span className="text-xs font-semibold text-[var(--ink-muted)]">USD</span>
        </div>
      </div>

      {/* Scorecard: Wins / Losses / Win Rate */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--glass-panel-border-subtle)]">
        <div className="rounded-xl bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] p-2 text-center">
          <span className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Wins</span>
          <div className="mt-0.5">
            <TypewriterNumber value={wins} decimals={0} className="text-base font-extrabold text-emerald-400 font-mono" />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] p-2 text-center">
          <span className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Losses</span>
          <div className="mt-0.5">
            <TypewriterNumber value={losses} decimals={0} className="text-base font-extrabold text-rose-400 font-mono" />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] p-2 text-center">
          <span className="text-[10px] font-bold text-[var(--ink-muted)] uppercase">Win Rate</span>
          <div className="font-mono text-base font-extrabold text-[var(--ink)] mt-0.5">
            {totalSettled > 0 ? `${winRate}%` : "—"}
          </div>
        </div>
      </div>

      {/* Streak Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--ink-muted)]">
        <div className="flex items-center gap-1.5 font-medium">
          <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span>Current Streak:</span>
          <b className="text-[var(--ink)] font-mono">{streak}x</b>
        </div>
        <div className="text-[11px]">
          Best: <b className="text-[var(--ink-secondary)] font-mono">{bestStreak}x</b>
        </div>
      </div>

      {/* Wallet Onboarding Notice Inside Session Performance Box */}
      {!walletConnected && (
        <div className="mt-3 rounded-xl border border-[var(--ui-tint-border)] bg-[var(--ui-tint-bg)] p-3 flex items-start gap-2.5 shadow-sm">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ui-tint-color)]/20 text-[var(--ui-tint-color)] text-[10px] font-bold mt-0.5">
            ✦
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-[var(--ink)]">Claim 100 tUSD</div>
            <p className="text-[10px] font-medium text-[var(--ink-secondary)] leading-relaxed mt-0.5">
              Connect a Solana wallet (top-right) to claim 100 tUSD and place onchain bets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
