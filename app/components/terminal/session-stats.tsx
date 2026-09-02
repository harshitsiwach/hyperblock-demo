"use client";

import { useMemo } from "react";
import { Award, Flame, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { Play } from "@/app/lib/domain";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";

interface SessionStatsProps {
  plays: Play[];
  streak: number;
  bestStreak: number;
}

function formatUsd(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SessionStats({ plays, streak, bestStreak }: SessionStatsProps) {
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

  // Level & XP math: 3 wins per level
  const level = Math.floor(wins / 3) + 1;
  const winsInCurrentLevel = wins % 3;
  const progressRatio = winsInCurrentLevel / 3;
  const strokeDashoffset = 100 - progressRatio * 100;

  return (
    <div className="terminal-card flex flex-col justify-between p-4 lg:p-5 bg-[#121620] h-full">
      {/* Header with Level & Progress Ring */}
      <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Session Performance
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h4 className="text-sm font-extrabold text-white">LEVEL {level}</h4>
            <span className="rounded bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-bold text-slate-300">
              {3 - winsInCurrentLevel} to Lvl {level + 1}
            </span>
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative flex h-11 w-11 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              className="stroke-white/[0.08]"
              strokeWidth="3.5"
              fill="none"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              className="stroke-[#00f076] transition-all duration-700 ease-out"
              strokeWidth="3.5"
              strokeDasharray="100"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span className="absolute font-mono text-xs font-extrabold text-white">
            {level}
          </span>
        </div>
      </div>

      {/* Main P&L Number with Typewriter Animation */}
      <div className="my-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Total Net P&L
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <TypewriterNumber
            value={totalPnL}
            prefix={isPositive ? "+$" : "-$"}
            decimals={2}
            className={`text-2xl font-extrabold tracking-tight ${
              isPositive ? "text-[#00f076]" : "text-[#ff3358]"
            }`}
          />
          <span className="text-xs font-semibold text-slate-400">USD</span>
        </div>
      </div>

      {/* Scorecard: Wins / Losses / Win Rate */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2 text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Wins</span>
          <div className="mt-0.5">
            <TypewriterNumber value={wins} decimals={0} className="text-base font-extrabold text-[#00f076]" />
          </div>
        </div>

        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2 text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Losses</span>
          <div className="mt-0.5">
            <TypewriterNumber value={losses} decimals={0} className="text-base font-extrabold text-[#ff3358]" />
          </div>
        </div>

        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2 text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Win Rate</span>
          <div className="font-mono text-base font-extrabold text-slate-200 mt-0.5">
            {totalSettled > 0 ? `${winRate}%` : "—"}
          </div>
        </div>
      </div>

      {/* Streak Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span>Current Streak:</span>
          <b className="text-white font-mono">{streak}x</b>
        </div>
        <div className="text-[11px]">
          Best: <b className="text-slate-200 font-mono">{bestStreak}x</b>
        </div>
      </div>
    </div>
  );
}
