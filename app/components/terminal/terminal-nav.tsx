"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/app/components/brand-mark";
import { WalletButton } from "@/app/components/wallet-button";
import {
  Bell,
  Settings,
  Zap,
  ShieldCheck,
  Sun,
  Moon,
  ChartLine,
  Volume2,
  VolumeX,
  Smartphone,
  Trash2,
  X,
  Radio,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { MarketSnapshot, Play } from "@/app/lib/domain";
import { SessionStats } from "@/app/components/terminal/session-stats";
import { useTheme } from "@/app/providers/theme-provider";

interface TerminalNavProps {
  balance: number;
  balanceBump?: boolean;
  walletConnected: boolean;
  canClaim: boolean;
  cooldownSec: number;
  onClaim: () => void;
  claimPulse: boolean;
  snapshot?: MarketSnapshot;
  claimLabel?: string;
  claimBusy?: boolean;
  plays: Play[];
  streak: number;
  bestStreak: number;
}

const NAV_TABS = [
  { id: "trade", label: "Trade", href: null as string | null },
  { id: "leaderboard", label: "Leaderboard", href: "/leaderboard" as string | null },
];

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TerminalNav({
  balance,
  balanceBump,
  walletConnected,
  canClaim,
  cooldownSec,
  onClaim,
  claimPulse,
  snapshot,
  claimLabel,
  claimBusy = false,
  plays,
  streak,
  bestStreak,
}: TerminalNavProps) {
  const { activeTintConfig, mode, setMode } = useTheme();
  const router = useRouter();

  const totalPnL = plays.reduce((acc, p) => acc + (p.liveProfitUsd ?? 0), 0);
  const pnlPositive = totalPnL >= 0;
  const pnlLabel = `${pnlPositive ? "+" : "−"}$${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Dropdown states (mutually exclusive)
  const [activeDropdown, setActiveDropdown] = useState<"notifications" | "settings" | "pnl" | null>(null);

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
      <header className="mx-auto flex h-14 max-w-[1720px] items-center justify-between px-4 lg:px-5 rounded-lg border border-[var(--hair)] bg-[var(--card)] pointer-events-auto">
        {/* Left Section: Brand & Nav Tabs */}
        <div className="flex items-center gap-6">
          <BrandMark />

          {/* Navigation Tabs (Trade = current view, Leaderboard navigates) */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
            {NAV_TABS.map((tab) => {
              const isActive = tab.id === "trade";
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.href) router.push(tab.href);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                    isActive ? "text-[var(--color-neon-orange)]" : "text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-lg bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Stats, Wallet, Claim, Actions */}
        <div ref={dropdownRef} className="relative flex items-center gap-2 sm:gap-2.5">
          {/* P&L Chip — opens the full performance card */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "pnl" ? null : "pnl"))
            }
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-colors ${
              activeDropdown === "pnl"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border-[var(--color-neon-orange)]"
                : "border-[var(--hair)] bg-[var(--card)] hover:border-[var(--color-neon-orange)]"
            }`}
            aria-label="Session performance"
            title="Session performance"
            type="button"
          >
            <ChartLine className={`h-3 w-3 ${pnlPositive ? "text-[var(--up)]" : "text-[var(--down)]"}`} />
            <span className={`font-mono text-[11px] font-extrabold ${pnlPositive ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
              {pnlLabel}
            </span>
          </button>

          {/* Balance Display (wallet-gated) */}
          {walletConnected ? (
          <div
            className={`flex items-center gap-2 rounded-lg border border-[var(--hair)] bg-[var(--card)] px-2.5 py-1 ${
              balanceBump ? "scale-[1.04] border-[var(--color-neon-orange)] bg-[var(--color-neon-orange-soft)]" : ""
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">Balance</span>
            <span className="font-mono text-[11px] font-extrabold text-[var(--ink)] sm:text-xs">
              {formatUsd(balance)}
            </span>
          </div>
          ) : null}

          {/* + Claim Button (always visible, disabled until wallet + cooldown) */}
          <button
            onClick={onClaim}
            disabled={!walletConnected || !canClaim || claimBusy}
            className={`relative overflow-hidden rounded-lg px-3 py-1 text-[11px] font-bold tracking-wide transition-colors border ${
              canClaim && !claimBusy
                ? "bg-[var(--color-neon-orange)] hover:bg-[var(--color-neon-orange-pressed)] text-white border-[var(--color-neon-orange)] active:scale-95"
                : "bg-[var(--card)] opacity-40 text-[var(--ink-muted)] cursor-not-allowed border-[var(--hair)]"
            } ${claimPulse ? "scale-105" : ""}`}
          >
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{claimBusy ? "Claiming…" : claimLabel ?? (canClaim ? "+ Claim $10k" : `${cooldownSec}s`)}</span>
            </div>
          </button>

          {/* Solana Wallet Button (click address for info card) */}
          <WalletButton showStats variant="compact" snapshot={snapshot} />

          {/* Notifications Trigger Button */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "notifications" ? null : "notifications"))
            }
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              activeDropdown === "notifications"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border-[var(--color-neon-orange)]"
                : "border-[var(--hair)] bg-[var(--card)] text-[var(--ink-muted)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)]"
            }`}
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
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              activeDropdown === "settings"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border-[var(--color-neon-orange)]"
                : "border-[var(--hair)] bg-[var(--card)] text-[var(--ink-muted)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)]"
            }`}
            aria-label="Terminal Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--hair)] bg-[var(--card)] text-[var(--ink-muted)] transition-colors hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)]"
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mode === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
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
                className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-lg border border-[var(--hair)] nav-dropdown p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-neon-orange)]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                      System Alerts
                    </h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--color-neon-orange)]">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] text-xs p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Alerts List */}
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--ink-muted)] font-mono">
                      No unread system alerts
                    </div>
                  ) : (
                    alerts.map((item) => (
                      <div
                        key={item.id}
                        className={`group relative rounded-lg border border-[var(--hair)] bg-[var(--card)] p-3 ${
                          item.read ? "opacity-75" : "border-[var(--color-neon-orange)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.icon === "ws" ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-neon-orange)] flex-shrink-0" />
                            ) : item.icon === "speed" ? (
                              <Zap className="h-3.5 w-3.5 text-[var(--color-neon-orange)] flex-shrink-0" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-[var(--ink-secondary)] flex-shrink-0" />
                            )}
                            <span className="text-xs font-bold text-[var(--ink)]">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--ink-muted)] whitespace-nowrap">
                            {item.time}
                          </span>
                        </div>
                        <p className="mt-1 text-[var(--ink-secondary)] text-[11px] leading-relaxed">
                          {item.desc}
                        </p>
                        <button
                          onClick={() => clearAlert(item.id)}
                          className="absolute right-2 bottom-2 text-[var(--ink-muted)] hover:text-[var(--down)] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Dismiss"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2.5 border-t border-[var(--hair)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                  <span className="flex items-center gap-1.5 text-[var(--color-neon-orange)]">
                    <Radio className="h-2.5 w-2.5" />
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
                className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-[var(--hair)] nav-dropdown p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                      Terminal Preferences
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveDropdown(null)}
                    className="text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] text-xs p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Interactive Options */}
                <div className="mt-3 space-y-3 text-xs">
                  {/* Sound FX Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--card)] border border-[var(--hair)]">
                    <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                      {soundEnabled ? (
                        <Volume2 className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      )}
                      <span>Audio & Sound FX</span>
                    </div>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        soundEnabled ? "bg-[var(--color-neon-orange)]" : "bg-[var(--hair)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          soundEnabled ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Haptics Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--card)] border border-[var(--hair)]">
                    <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                      <Smartphone className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                      <span>Haptic Vibration</span>
                    </div>
                    <button
                      onClick={() => setHapticsEnabled(!hapticsEnabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        hapticsEnabled ? "bg-[var(--color-neon-orange)]" : "bg-[var(--hair)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          hapticsEnabled ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* High Frequency Ticks */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--card)] border border-[var(--hair)]">
                    <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                      <Zap className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                      <span>1s High-Freq Ticks</span>
                    </div>
                    <button
                      onClick={() => setHighFreqTicks(!highFreqTicks)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        highFreqTicks ? "bg-[var(--color-neon-orange)]" : "bg-[var(--hair)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          highFreqTicks ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Latency & Diagnostics */}
                  <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--hair)] space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-[var(--ink-muted)]">
                      <span>Order Router</span>
                      <span className="text-[var(--color-neon-orange)]">Direct Mainnet WS</span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--ink-muted)]">
                      <span>Oracle Latency</span>
                      <span className="text-[var(--ink)] font-bold">22ms (Verified)</span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--ink-muted)]">
                      <span>Settlement Engine</span>
                      <span className="text-[var(--ink)]">10.0s Capped Window</span>
                    </div>
                  </div>

                  {/* Danger Zone: Reset storage */}
                  <div className="pt-2 border-t border-[var(--hair)]">
                    <button
                      onClick={() => {
                        if (confirm("Reset terminal balance and clear stored history?")) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="w-full rounded-lg bg-[var(--down-tint)] border border-[var(--down)] py-2 text-center text-xs font-semibold text-[var(--down)] hover:opacity-90 transition-opacity"
                    >
                      Reset Account Balance & Cache
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* Session Performance (P&L) Flyout Dropdown */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {activeDropdown === "pnl" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-[var(--hair)] nav-dropdown p-3"
              >
                <SessionStats
                  plays={plays}
                  streak={streak}
                  bestStreak={bestStreak}
                  walletConnected={walletConnected}
                  bare
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </header>
    </div>
  );
}
