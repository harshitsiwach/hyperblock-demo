"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrandMark } from "@/app/components/brand-mark";
import { WalletButton } from "@/app/components/wallet-button";
import { ModeToggle } from "@/app/components/mode-toggle";
import {
  Bell,
  Flame,
  Settings,
  Zap,
  ShieldCheck,
  Volume2,
  VolumeX,
  Smartphone,
  Trash2,
  X,
  Radio,
  Sliders,
  Sparkles,
  Palette,
} from "lucide-react";
import type { MarketSnapshot } from "@/app/lib/domain";
import { ThemePopover } from "@/app/components/terminal/theme-popover";
import { useTheme } from "@/app/providers/theme-provider";

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
  isReal?: boolean;
  claimLabel?: string;
  claimBusy?: boolean;
  level?: number;
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
  isReal = false,
  claimLabel,
  claimBusy = false,
  level = 1,
}: TerminalNavProps) {
  const { activeTintConfig } = useTheme();

  // Dropdown states (mutually exclusive)
  const [activeDropdown, setActiveDropdown] = useState<"notifications" | "settings" | "theme" | null>(null);

  // Settings states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [highFreqTicks, setHighFreqTicks] = useState(true);

  // Notification items state
  const [alerts, setAlerts] = useState([
    {
      id: "a1",
      title: "Hyperliquid Live Connected",
      desc: "Streaming real-time 1s ticks for Crypto, Stocks, Commodities & Forex.",
      time: "Just now",
      read: false,
      icon: "ws",
    },
    {
      id: "a2",
      title: "1000x Sensitivity Active",
      desc: "Max profit capped at 5x before 10% protocol fee. 10-second automatic settlements.",
      time: "1m ago",
      read: false,
      icon: "speed",
    },
    {
      id: "a3",
      title: "Zero-MEV Shield Active",
      desc: "Direct block execution without frontrunning or sandwich bots.",
      time: "5m ago",
      read: true,
      icon: "shield",
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdown]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const clearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="sticky top-0 z-40 w-full px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pointer-events-none">
      <header className="mx-auto flex h-14 max-w-[1720px] items-center justify-between px-4 lg:px-5 rounded-2xl border border-[var(--glass-panel-border)] terminal-card shadow-xl !backdrop-blur-2xl pointer-events-auto">
        {/* Left Section: Brand & Nav Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="hidden items-center gap-1.5 rounded-full border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2.5 py-1 sm:flex">
              <span className="live-pulse-dot" />
              <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isReal ? "text-amber-400" : "text-[var(--ink-secondary)]"}`}>
                {isReal ? "Real Terminal" : "Demo Terminal"}
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
                    isActive ? "text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-lg bg-[var(--glass-card-hover-bg)] border border-[var(--glass-card-hover-border)] shadow-sm"
                      style={{
                        borderColor: activeTintConfig.borderColor,
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Stats, Wallet, Claim, Actions */}
        <div ref={dropdownRef} className="relative flex items-center gap-2.5 sm:gap-3">
          {/* Balance Display */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-3 py-1.5 transition-transform duration-200 ${
              balanceBump ? "scale-[1.04] border-[var(--glass-card-hover-border)] bg-[var(--glass-card-hover-bg)]" : ""
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">Balance</span>
            <span className="font-mono text-xs font-extrabold text-[var(--ink)] sm:text-sm">
              {formatUsd(balance)}
            </span>

            <div className="h-3 w-[1px] bg-[var(--glass-card-border)]" />

            {/* Active Position Count Pill */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ink-secondary)]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  activePositionsCount > 0 ? "bg-emerald-400 shadow-[0_0_6px_#22c55e]" : "bg-slate-400"
                }`}
              />
              <span>
                {activePositionsCount}/{maxPositions}
              </span>
              <span className="hidden text-[10px] text-[var(--ink-muted)] xl:inline">Live</span>
            </div>

            {/* Streak Flame Pill */}
            {streak > 0 && (
              <>
                <div className="h-3 w-[1px] bg-[var(--glass-card-border)]" />
                <div
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-400"
                  title={`Current streak: ${streak} | Best: ${bestStreak}`}
                >
                  <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                  <span>{streak}x</span>
                </div>
              </>
            )}

            <div className="h-3 w-[1px] bg-[var(--glass-card-border)]" />

            {/* Elevated User Level Pill */}
            <div
              className="flex items-center gap-1 text-[11px] font-black text-amber-400"
              title={`Trader Level ${level} · Level Up with more bets and winning streaks`}
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 text-[8px] font-black">
                ★
              </span>
              <span>LVL {level}</span>
            </div>
          </div>

          {/* + Claim Button */}
          <button
            onClick={onClaim}
            disabled={!canClaim || claimBusy}
            className={`relative overflow-hidden rounded-xl px-3.5 py-1.5 text-xs font-bold tracking-wide transition-all border ${
              canClaim && !claimBusy
                ? "bg-[var(--glass-card-bg)] hover:bg-[var(--glass-card-hover-bg)] text-[var(--ink)] border-[var(--glass-card-border)] shadow-sm active:scale-95"
                : "bg-[var(--glass-card-bg)] opacity-40 text-[var(--ink-muted)] cursor-not-allowed border-[var(--glass-card-border)]"
            } ${claimPulse ? "scale-105" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>{claimBusy ? "Claiming…" : claimLabel ?? (canClaim ? "+ Claim $10k" : `${cooldownSec}s`)}</span>
            </div>
          </button>

          {/* Solana Wallet Button */}
          <WalletButton showStats={false} snapshot={snapshot} />

          {/* Mode Toggle (Demo / Real Devnet) */}
          <div className="hidden lg:block">
            <ModeToggle mode={isReal ? "real" : "demo"} />
          </div>

          {/* Notifications Trigger Button */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "notifications" ? null : "notifications"))
            }
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              activeDropdown === "notifications"
                ? "bg-[var(--glass-card-hover-bg)] text-[var(--ink)] shadow-sm border-[var(--glass-card-hover-border)]"
                : "border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-muted)] hover:border-[var(--glass-card-hover-border)] hover:text-[var(--ink)]"
            }`}
            style={{
              borderColor: activeDropdown === "notifications" ? activeTintConfig.borderColor : undefined,
            }}
            aria-label="Terminal Notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: activeTintConfig.color }}
              />
            )}
          </button>

          {/* Settings Trigger Button */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "settings" ? null : "settings"))
            }
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              activeDropdown === "settings"
                ? "bg-[var(--glass-card-hover-bg)] text-[var(--ink)] shadow-sm border-[var(--glass-card-hover-border)]"
                : "border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-muted)] hover:border-[var(--glass-card-hover-border)] hover:text-[var(--ink)]"
            }`}
            style={{
              borderColor: activeDropdown === "settings" ? activeTintConfig.borderColor : undefined,
            }}
            aria-label="Terminal Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* Theme & Appearance Customization Trigger Button */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "theme" ? null : "theme"))
            }
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              activeDropdown === "theme"
                ? "bg-[var(--glass-card-hover-bg)] text-[var(--ink)] shadow-sm border-[var(--glass-card-hover-border)]"
                : "border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-muted)] hover:border-[var(--glass-card-hover-border)] hover:text-[var(--ink)]"
            }`}
            style={{
              borderColor: activeDropdown === "theme" ? activeTintConfig.borderColor : undefined,
              boxShadow: activeDropdown === "theme" ? `0 0 12px ${activeTintConfig.glowColor}` : undefined,
            }}
            aria-label="Terminal Appearance & Theme"
            title="Appearance & Theme"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>

          {/* ========================================================================= */}
          {/* Notifications Flyout Dropdown */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {activeDropdown === "notifications" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-white/[0.12] bg-[#131722]/98 p-4 shadow-2xl backdrop-blur-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00f076] animate-ping" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      System Alerts
                    </h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[#00f076]/15 border border-[#00f076]/30 px-2 py-0.5 text-[10px] font-extrabold text-[#00f076]">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-slate-400 hover:text-[#00f076] transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="text-slate-400 hover:text-white text-xs p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Alerts List */}
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 font-mono">
                      No unread system alerts
                    </div>
                  ) : (
                    alerts.map((item) => (
                      <div
                        key={item.id}
                        className={`group relative rounded-xl border p-3 transition-all ${
                          item.read
                            ? "bg-white/[0.02] border-white/[0.05] opacity-75"
                            : "bg-white/[0.04] border-[#00f076]/20 shadow-[0_0_12px_rgba(0,240,118,0.06)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.icon === "ws" ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-[#00f076] flex-shrink-0" />
                            ) : item.icon === "speed" ? (
                              <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                            )}
                            <span className="text-xs font-bold text-white">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                            {item.time}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-400 text-[11px] leading-relaxed">
                          {item.desc}
                        </p>
                        <button
                          onClick={() => clearAlert(item.id)}
                          className="absolute right-2 bottom-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Dismiss"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-[#00f076]">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    WS Stream: 22ms
                  </span>
                  <span>Hyperliquid L1</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* Settings Flyout Dropdown */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {activeDropdown === "settings" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-white/[0.12] bg-[#131722]/98 p-4 shadow-2xl backdrop-blur-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-[#00f076]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Terminal Preferences
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveDropdown(null)}
                    className="text-slate-400 hover:text-white text-xs p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Interactive Options */}
                <div className="mt-3 space-y-3 text-xs">
                  {/* Sound FX Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-slate-300">
                      {soundEnabled ? (
                        <Volume2 className="h-3.5 w-3.5 text-[#00f076]" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      <span>Audio & Sound FX</span>
                    </div>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        soundEnabled ? "bg-[#00f076]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          soundEnabled ? "left-4 bg-slate-950" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Haptics Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Smartphone className="h-3.5 w-3.5 text-[#00f076]" />
                      <span>Haptic Vibration</span>
                    </div>
                    <button
                      onClick={() => setHapticsEnabled(!hapticsEnabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        hapticsEnabled ? "bg-[#00f076]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          hapticsEnabled ? "left-4 bg-slate-950" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* High Frequency Ticks */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span>1s High-Freq Ticks</span>
                    </div>
                    <button
                      onClick={() => setHighFreqTicks(!highFreqTicks)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        highFreqTicks ? "bg-[#00f076]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          highFreqTicks ? "left-4 bg-slate-950" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Latency & Diagnostics */}
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Order Router</span>
                      <span className="text-[#00f076]">Direct Mainnet WS</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Oracle Latency</span>
                      <span className="text-white font-bold">22ms (Verified)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Settlement Engine</span>
                      <span className="text-white">10.0s Capped Window</span>
                    </div>
                  </div>

                  {/* Danger Zone: Reset storage */}
                  <div className="pt-2 border-t border-white/[0.08]">
                    <button
                      onClick={() => {
                        if (confirm("Reset terminal balance and clear stored history?")) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="w-full rounded-xl bg-red-500/10 border border-red-500/20 py-2 text-center text-xs font-semibold text-red-400 hover:bg-red-500/20 active:scale-98 transition-all"
                    >
                      Reset Account Balance & Cache
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Theme Customization Floating Panel */}
          <AnimatePresence>
            {activeDropdown === "theme" && (
              <ThemePopover onClose={() => setActiveDropdown(null)} />
            )}
          </AnimatePresence>
        </div>
      </header>
    </div>
  );
}
