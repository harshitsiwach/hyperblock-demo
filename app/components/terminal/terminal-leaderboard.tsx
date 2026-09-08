"use client";

import { useState } from "react";
import { Search, Trophy, TrendingUp, Award, Zap, RefreshCw, X } from "lucide-react";
import { useGameWallet } from "@/app/hooks/use-game-wallet";
import { useLeaderboard } from "@/app/hooks/use-leaderboard";
import { formatLeaderboardUsdc } from "@/app/lib/leaderboard";

function compactAddress(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : address;
}

export function TerminalLeaderboard({ onBackToDemo }: { onBackToDemo?: () => void }) {
  const wallet = useGameWallet();
  const leaderboard = useLeaderboard(wallet.address);
  const [search, setSearch] = useState("");

  const filteredEntries = leaderboard.entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return e.user.toLowerCase().includes(q);
  });

  const userStats = leaderboard.userStats;
  const currentWallet = wallet.address;
  const isLoading = leaderboard.status === "loading";

  const statusLabel = {
    disabled: "Indexer standby",
    loading: "Loading",
    ready: "Live",
    stale: "Updating",
    unavailable: "Unavailable",
  }[leaderboard.status];

  return (
    <div className="w-full flex flex-col gap-4 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="terminal-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)]/40 px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--color-neon-orange)]">
              <Trophy className="h-3 w-3" />
              GLOBAL LEADERBOARD
            </span>
            <span className="text-[10px] font-mono text-[var(--ink-muted)]">
              All-Time Settled Trades
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)] mt-1.5">
            Institutional Arena Rankings
          </h1>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            Top traders ranked by high-frequency settled performance and volume on Hyperliquid feeds.
          </p>
        </div>

        {/* Total Volume Metric Card */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--hair)] bg-[var(--card)] p-3 flex-shrink-0 self-stretch sm:self-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)]/30 text-[var(--color-neon-orange)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Total Settled Volume
            </div>
            <div className="text-base sm:text-lg font-mono font-black text-[var(--ink)]">
              {isLoading ? "…" : leaderboard.totalVolume === null ? "—" : `${formatLeaderboardUsdc(leaderboard.totalVolume)} USDC`}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
              <span className="live-pulse-dot" />
              <span>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User's Performance Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="terminal-card p-3 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Your Rank
          </div>
          <div className="text-xl font-mono font-extrabold text-[var(--color-neon-orange)] mt-1">
            {currentWallet && userStats?.rank ? `#${userStats.rank}` : "—"}
          </div>
          <div className="text-[10px] text-[var(--ink-muted)] truncate">
            {currentWallet ? compactAddress(currentWallet) : "Connect wallet"}
          </div>
        </div>

        <div className="terminal-card p-3 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Your Volume
          </div>
          <div className="text-xl font-mono font-extrabold text-[var(--ink)] mt-1">
            {currentWallet && userStats ? `${formatLeaderboardUsdc(userStats.volume)} USDC` : "—"}
          </div>
          <div className="text-[10px] text-[var(--ink-muted)]">Settled stake</div>
        </div>

        <div className="terminal-card p-3 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Total Trades
          </div>
          <div className="text-xl font-mono font-extrabold text-[var(--ink)] mt-1">
            {currentWallet && userStats ? userStats.trades : "—"}
          </div>
          <div className="text-[10px] text-[var(--ink-muted)]">10-sec rounds</div>
        </div>

        <div className="terminal-card p-3 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Wins / Losses
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-400 mt-1">
            {currentWallet && userStats ? (
              <span>
                {userStats.wins} <span className="text-xs text-[var(--ink-muted)] font-normal">/</span>{" "}
                <span className="text-rose-400">{userStats.losses}</span>
              </span>
            ) : (
              "—"
            )}
          </div>
          <div className="text-[10px] text-[var(--ink-muted)]">
            {currentWallet && userStats && userStats.trades > 0
              ? `${Math.round((userStats.wins / userStats.trades) * 100)}% Win Rate`
              : "0% Win Rate"}
          </div>
        </div>
      </div>

      {/* Rankings Table Card */}
      <div className="terminal-card flex flex-col p-4 sm:p-5 gap-3.5">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[var(--hair)] pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[var(--color-neon-orange)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink)]">
              Rankings Table
            </h2>
            <span className="rounded bg-[var(--card)] px-2 py-0.5 text-[10px] font-mono text-[var(--ink-muted)] border border-[var(--hair)]">
              {filteredEntries.length} Ranked
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <input
              type="text"
              placeholder="Search trader address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--hair)] bg-[var(--card)] py-1.5 pl-8 pr-8 text-xs font-medium text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--color-neon-orange)] outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--hair)] text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-muted)]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Trader</th>
                <th className="py-2.5 px-3">Volume</th>
                <th className="py-2.5 px-3">Trades</th>
                <th className="py-2.5 px-3">Wins</th>
                <th className="py-2.5 px-3">Losses</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hair)]">
              {filteredEntries.map((entry) => {
                const isYou = entry.user === currentWallet;
                const winRate = entry.trades > 0 ? Math.round((entry.wins / entry.trades) * 100) : 0;

                return (
                  <tr
                    key={entry.user}
                    className={`transition-colors ${
                      isYou
                        ? "bg-[var(--color-neon-orange-soft)]/60 font-bold"
                        : "hover:bg-[var(--card-hover)]"
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-extrabold">
                      {entry.rank === 1 && <span className="text-amber-400 mr-1">🥇</span>}
                      {entry.rank === 2 && <span className="text-slate-300 mr-1">🥈</span>}
                      {entry.rank === 3 && <span className="text-amber-700 mr-1">🥉</span>}
                      #{entry.rank}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[var(--ink)] flex items-center gap-1.5">
                        {compactAddress(entry.user)}
                        {isYou && (
                          <span className="rounded bg-[var(--color-neon-orange)] text-white px-1.5 py-0.2 text-[9px] font-bold">
                            You
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--ink)]">
                      ${formatLeaderboardUsdc(entry.volume)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--ink)]">{entry.trades}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{entry.wins}</td>
                    <td className="py-3 px-3 font-mono text-rose-400 font-bold">{entry.losses}</td>
                    <td className="py-3 px-3 font-mono text-right text-[var(--ink)]">
                      {winRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredEntries.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--card)] border border-[var(--hair)] text-[var(--ink-muted)] mb-2">
                <Trophy className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-[var(--ink)]">
                {isLoading ? "Loading rankings…" : "No indexed trades yet"}
              </p>
              <p className="text-xs text-[var(--ink-muted)] max-w-sm mt-1">
                {leaderboard.status === "disabled"
                  ? "Rankings will appear here when the historical indexer is connected."
                  : leaderboard.status === "unavailable"
                    ? "Live trading is unaffected. Try refreshing the historical indexer."
                    : isLoading
                      ? "Reading settled trades from the indexer."
                      : "Settled trades will appear here as the indexer processes them."}
              </p>
              {leaderboard.status === "unavailable" && (
                <button
                  onClick={leaderboard.retry}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-neon-orange)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-neon-orange-pressed)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
