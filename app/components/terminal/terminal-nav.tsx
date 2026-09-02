"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { BrandMark } from "@/app/components/brand-mark";
import { WalletButton } from "@/app/components/wallet-button";
import { ModeToggle } from "@/app/components/mode-toggle";
import { Bell, Flame, Settings, Zap, ShieldCheck, ChevronRight } from "lucide-react";
import type { MarketSnapshot } from "@/app/lib/domain";

interface TerminalNavProps {
  balance: number;
  balanceBump?: boolean;
  activePositionsCount: number;
  maxPositions?: number;
  streak: number;
  bestStreak: number;
  canClaim: boolean;
  cooldownSec: number;
  onClaim: () => void;
  claimPulse: boolean;
  activeNavTab: string;
  onNavTabChange: (tab: string) => void;
  snapshot?: MarketSnapshot;
}

const NAV_TABS = [
  { id: "trade", label: "Trade" },
  { id: "portfolio", label: "Portfolio" },
  { id: "vaults", label: "Vaults" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "referrals", label: "Referrals" },
];

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TerminalNav({
  balance,
  balanceBump,
  activePositionsCount,
  maxPositions = 8,
  streak,
  bestStreak,
  canClaim,
  cooldownSec,
  onClaim,
  claimPulse,
  activeNavTab,
  onNavTabChange,
  snapshot,
}: TerminalNavProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0b0d12]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1720px] items-center justify-between px-4 lg:px-6">
        {/* Left Section: Brand & Nav Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 sm:flex">
              <span className="live-pulse-dot" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00f076]">
                Demo Terminal
              </span>
            </div>
          </div>

          {/* Sliding Navigation Tabs */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
            {NAV_TABS.map((tab) => {
              const isActive = activeNavTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavTabChange(tab.id)}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/[0.12]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Stats, Wallet, Claim, Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Demo Balance Display */}
          <div
            className={`flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#121620] px-3 py-1.5 transition-transform duration-200 ${
              balanceBump ? "scale-[1.04] border-[#00f076]/40 bg-[#00f076]/[0.06]" : ""
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</span>
            <span className="font-mono text-xs font-extrabold text-white sm:text-sm">
              {formatUsd(balance)}
            </span>

            <div className="h-3 w-[1px] bg-white/[0.08]" />

            {/* Active Position Count Pill */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  activePositionsCount > 0 ? "bg-[#00f076] shadow-[0_0_6px_#00f076]" : "bg-slate-500"
                }`}
              />
              <span>
                {activePositionsCount}/{maxPositions}
              </span>
              <span className="hidden text-[10px] text-slate-500 xl:inline">Live</span>
            </div>

            {/* Streak Flame Pill */}
            {streak > 0 && (
              <>
                <div className="h-3 w-[1px] bg-white/[0.08]" />
                <div
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-400"
                  title={`Current streak: ${streak} | Best: ${bestStreak}`}
                >
                  <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                  <span>{streak}x</span>
                </div>
              </>
            )}
          </div>

          {/* + Claim $10k Button */}
          <button
            onClick={onClaim}
            disabled={!canClaim}
            className={`relative overflow-hidden rounded-lg px-3 py-1.5 text-xs font-extrabold tracking-wide transition-all ${
              canClaim
                ? "bg-[#00f076] text-[#090a0f] shadow-[0_0_16px_rgba(0,240,118,0.25)] hover:bg-[#1cf387] active:scale-95"
                : "bg-white/[0.05] text-slate-400 cursor-not-allowed border border-white/[0.06]"
            } ${claimPulse ? "scale-105" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>{canClaim ? "+ Claim $10k" : `${cooldownSec}s`}</span>
            </div>
          </button>

          {/* Solana Wallet Button */}
          <WalletButton showStats={false} snapshot={snapshot as any} />

          {/* Mode Toggle (Demo / Real Devnet) */}
          <div className="hidden lg:block">
            <ModeToggle mode="demo" />
          </div>

          {/* Notifications Trigger */}
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#121620] text-slate-400 hover:border-white/20 hover:text-white transition-colors"
            aria-label="Terminal Notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#00f076]" />
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#121620] text-slate-400 hover:border-white/20 hover:text-white transition-colors"
            aria-label="Terminal Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Settings Dropdown Sheet */}
      {settingsOpen && (
        <div className="absolute right-4 top-16 z-50 w-72 rounded-xl border border-white/[0.12] bg-[#141824] p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Terminal Settings</h4>
            <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Hyperliquid Route</span>
              <span className="text-[#00f076] font-mono text-[11px]">Direct Mainnet WS</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Settlement Latency</span>
              <span className="text-slate-400 font-mono text-[11px]">10.0s Window</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Haptics & Audio</span>
              <span className="text-[#00f076] font-mono text-[11px]">Active</span>
            </div>
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full rounded-lg bg-red-500/10 border border-red-500/20 py-1.5 text-center text-xs font-semibold text-red-400 hover:bg-red-500/20"
              >
                Reset Demo Account & Storage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Dropdown Sheet */}
      {notificationsOpen && (
        <div className="absolute right-14 top-16 z-50 w-80 rounded-xl border border-white/[0.12] bg-[#141824] p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">System Alerts</h4>
            <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 text-[#00f076] font-bold text-[11px]">
                <ShieldCheck className="h-3 w-3" />
                Hyperliquid Live Connected
              </div>
              <p className="mt-1 text-slate-400 text-[11px]">
                Streaming real-time 1s ticks for Crypto, Stocks, Commodities & Forex.
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px]">
                ⚡ 1000x Sensitivity Active
              </div>
              <p className="mt-1 text-slate-400 text-[11px]">
                Max profit capped at 5x before 10% protocol fee. 10-second automatic settlements.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
