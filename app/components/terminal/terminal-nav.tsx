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
  Eye,
  EyeOff,
  User,
  ExternalLink,
  Maximize2,
  Minimize2,
  GripHorizontal,
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
  activeTab?: "demo" | "leaderboard";
  onTabChange?: (tab: "demo" | "leaderboard") => void;
}

const NAV_TABS = [
  { id: "demo" as const, label: "Demo", href: "/demo" },
  { id: "leaderboard" as const, label: "Leaderboard", href: "/leaderboard" },
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
  activeTab = "demo",
  onTabChange,
}: TerminalNavProps) {
  const { activeTintConfig, mode, setMode } = useTheme();
  const router = useRouter();

  const totalPnL = plays.reduce((acc, p) => acc + (p.liveProfitUsd ?? 0), 0);
  const pnlPositive = totalPnL >= 0;
  const pnlLabel = `${pnlPositive ? "+" : "−"}$${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Dropdown states (mutually exclusive)
  const [activeDropdown, setActiveDropdown] = useState<"notifications" | "settings" | "pnl" | null>(null);

  // Mounted flag for hydration-safe rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Balance visibility toggle
  const [hideBalance, setHideBalance] = useState(false);
  const [pnlPoppedOut, setPnlPoppedOut] = useState(false);

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
    <div className="fixed top-0 inset-x-0 mx-auto w-full max-w-[1680px] z-40 px-2 sm:px-4 pointer-events-none">
      <header className="pointer-events-auto w-full flex h-12 sm:h-13 items-center justify-between px-3.5 sm:px-4 lg:px-5 rounded-b-xl sm:rounded-b-2xl border-b border-x border-[var(--hair)] bg-[var(--card)]/95 backdrop-blur-xl shadow-md">
        {/* Left Section: Brand & Nav Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <BrandMark />

          {/* Navigation Tabs (iOS Liquid Water Segmented Control with Rotating Glowing Border) */}
          <nav className="flex items-center p-0.5 rounded-xl bg-[var(--card)] border border-[var(--hair)] shadow-inner" aria-label="Main Navigation">
            {NAV_TABS.map((tab) => {
              const isActive = (activeTab ?? "demo") === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (onTabChange) {
                      onTabChange(tab.id);
                    } else if (tab.href) {
                      router.push(tab.href);
                    }
                  }}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  className="relative px-2 sm:px-3.5 py-1 sm:py-1.5 text-[10.5px] sm:text-xs font-bold transition-colors select-none focus:outline-none flex items-center justify-center"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-water-pill"
                      className="absolute inset-0 rounded-[9px] pointer-events-none"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                        mass: 0.6,
                      }}
                    >
                      {/* Masked Border Beam strictly on 1.5px border track */}
                      <div className="border-beam-ring rounded-[9px]">
                        <span className="rotating-glow-border" />
                      </div>

                      {/* Solid inner background — no gradient bleed */}
                      <span
                        className="absolute inset-0 rounded-[9px] border border-[var(--color-neon-orange)]/40 -z-10 shadow-[0_0_12px_rgba(255,95,31,0.25)]"
                        style={{ backgroundColor: mode === "dark" ? "#0c0f17" : "#ffffff" }}
                      />
                    </motion.div>
                  )}
                  <span
                    className={`relative z-10 transition-colors duration-200 ${
                      isActive
                        ? mode === "dark"
                          ? "text-white font-black"
                          : "text-[var(--color-neon-orange)] font-black"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)] font-semibold"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Stats, Wallet, Notifications, Settings, Theme */}
        <div ref={dropdownRef} className="relative flex items-center gap-1 sm:gap-2">
          {/* P&L / Profile Button — opens full performance card, scales & glows on hover */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "pnl" ? null : "pnl"))
            }
            className={`group flex items-center gap-1 sm:gap-1.5 rounded-xl border px-1.5 sm:px-2.5 py-1 transition-all duration-200 hover:scale-105 hover:shadow-[0_0_12px_rgba(255,95,31,0.35)] hover:border-[var(--color-neon-orange)] ${
              activeDropdown === "pnl"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border-[var(--color-neon-orange)] shadow-[0_0_10px_rgba(255,95,31,0.25)]"
                : "border-[var(--hair)] bg-[var(--card)] text-[var(--ink)]"
            }`}
            aria-label="Profile and session performance"
            title="Profile & Session Performance"
            type="button"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-white group-hover:scale-110 group-hover:shadow-[0_0_8px_rgba(255,95,31,0.6)] transition-all">
              <User className="h-2.5 w-2.5" />
            </div>
            <ChartLine className={`h-3 w-3 ${pnlPositive ? "text-[var(--up)]" : "text-[var(--down)]"}`} />
            <span className={`font-mono text-[11px] font-extrabold ${pnlPositive ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
              {pnlLabel}
            </span>
          </button>

          {/* Balance Display with Anticlockwise Rotating Glow and Eye Hide Toggle */}
          {walletConnected ? (
            <div className="relative inline-flex items-center justify-center rounded-xl">
              {/* Masked Border Beam strictly on border ring — anticlockwise */}
              <div className="border-beam-ring rounded-xl">
                <span className="rotating-glow-border-anticlockwise" />
              </div>

              <div
                className={`relative z-10 flex items-center gap-1.5 rounded-xl border border-[var(--color-neon-orange)]/35 px-2.5 py-1 text-[11px] font-bold transition-transform ${
                  balanceBump ? "scale-[1.04]" : ""
                }`}
                style={{ backgroundColor: mode === "dark" ? "#0c0f17" : "#ffffff" }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Balance
                </span>
                <span className={`font-mono text-[11px] font-extrabold sm:text-xs min-w-[50px] text-center ${mode === "dark" ? "text-white" : "text-slate-900"}`}>
                  {hideBalance ? "••••••" : formatUsd(balance)}
                </span>
                <button
                  onClick={() => setHideBalance((v) => !v)}
                  type="button"
                  className="text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] p-0.5 rounded transition-colors flex items-center justify-center cursor-pointer"
                  title={hideBalance ? "Show balance" : "Hide balance"}
                  aria-label={hideBalance ? "Show balance" : "Hide balance"}
                >
                  {hideBalance ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ) : null}

          {/* Solana Wallet Button (click address for info card) */}
          <WalletButton showStats variant="compact" snapshot={snapshot} />

          {/* Notifications Trigger Button — shakes & glows on hover */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "notifications" ? null : "notifications"))
            }
            className={`hover-bell-shake relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-[0_0_12px_rgba(255,95,31,0.4)] hover:border-[var(--color-neon-orange)] ${
              activeDropdown === "notifications"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border-[var(--color-neon-orange)] shadow-[0_0_10px_rgba(255,95,31,0.25)]"
                : "border-[var(--hair)] bg-[var(--card)] text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)]"
            }`}
            aria-label="Notification Center"
            title="Notification Center"
            type="button"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,95,31,0.8)]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Settings Trigger Button — rotates gear & glows on hover (hidden on narrow screens) */}
          <button
            onClick={() =>
              setActiveDropdown((prev) => (prev === "settings" ? null : "settings"))
            }
            className={`hidden sm:flex hover-gear-spin relative h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-[0_0_12px_rgba(255,95,31,0.4)] hover:border-[var(--color-neon-orange)] ${
              activeDropdown === "settings"
                ? "bg-[var(--color-neon-orange-soft)] text-[var(--color-neon-orange)] border-[var(--color-neon-orange)] shadow-[0_0_10px_rgba(255,95,31,0.25)]"
                : "border-[var(--hair)] bg-[var(--card)] text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)]"
            }`}
            aria-label="Terminal Settings"
            title="Terminal Settings"
            type="button"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* Light / Dark Mode Toggle — rotates, scales and glows on hover & click animation */}
          <button
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--hair)] bg-[var(--card)] text-[var(--ink-muted)] transition-all duration-200 hover:scale-110 hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)] hover:shadow-[0_0_12px_rgba(255,95,31,0.4)] active:scale-90"
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mounted ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ rotate: -90, scale: 0.3, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.3, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex items-center justify-center"
                >
                  {mode === "dark" ? (
                    <Sun className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-cyan-600 drop-shadow-[0_0_6px_rgba(8,145,178,0.4)]" />
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-3.5 w-3.5" />
            )}
          </button>
          {/* ========================================================================= */}
          {/* NOTIFICATION CENTER DROPDOWN PANEL */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {activeDropdown === "notifications" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute right-0 top-11 z-50 w-[calc(100vw-20px)] max-w-sm sm:w-96 rounded-2xl border border-[var(--hair)] bg-[var(--card)] p-4 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.35),0_0_24px_-4px_rgba(255,95,31,0.15)] text-[var(--ink)]"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-orange)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-neon-orange)]" />
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                      Notification Center
                    </h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[var(--color-neon-orange)]/15 border border-[var(--color-neon-orange)]/40 px-2 py-0.5 text-[10px] font-bold text-[var(--color-neon-orange)]">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-medium text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] transition-colors cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--hair)] p-1 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Claim tUSD Card at top of Notification Center */}
                <div className="mt-3 rounded-xl border border-[var(--color-neon-orange)]/30 bg-[var(--panel)] p-3 flex items-center justify-between gap-3 shadow-[0_4px_16px_-4px_rgba(255,95,31,0.18)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-neon-orange)]/15 border border-[var(--color-neon-orange)]/40 text-[var(--color-neon-orange)] flex-shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--ink)] truncate">
                        Demo Faucet Claim
                      </div>
                      <div className="text-[10px] text-[var(--ink-muted)] truncate">
                        {canClaim && !claimBusy ? "Instant 100 tUSD replenishment" : `Cooldown: ${cooldownSec}s`}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onClaim}
                    disabled={!walletConnected || !canClaim || claimBusy}
                    type="button"
                    className={`relative flex-shrink-0 overflow-hidden rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                      walletConnected && canClaim && !claimBusy
                        ? "bg-[var(--color-neon-orange)] hover:brightness-110 text-white shadow-[0_0_12px_rgba(255,95,31,0.4)] active:scale-95 cursor-pointer"
                        : "bg-[var(--hair)] border border-[var(--hair-hover)] text-[var(--ink-muted)] cursor-not-allowed"
                    }`}
                  >
                    {!walletConnected
                      ? "Connect Wallet"
                      : claimBusy
                      ? "Claiming…"
                      : claimLabel ?? (canClaim ? "+ Claim 100 tUSD" : cooldownSec > 0 ? `Wait ${cooldownSec}s` : "+ Claim 100 tUSD")}
                  </button>
                </div>

                {/* Alerts List */}
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--ink-muted)] font-mono">
                      No unread system alerts
                    </div>
                  ) : (
                    alerts.map((item) => {
                      const isUnread = !item.read;
                      return (
                        <div
                          key={item.id}
                          className={`group relative rounded-xl border p-3 transition-all ${
                            isUnread
                              ? "border-[var(--color-neon-orange)]/35 bg-[var(--panel)] border-l-[3px] border-l-[var(--color-neon-orange)] shadow-[0_2px_12px_-2px_rgba(255,95,31,0.12)]"
                              : "border-[var(--hair)] bg-[var(--panel)]/50 opacity-60 hover:opacity-90"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--card)] border border-[var(--hair)] flex-shrink-0">
                                {item.icon === "ws" ? (
                                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                                ) : item.icon === "speed" ? (
                                  <Zap className="h-3.5 w-3.5 text-[var(--color-neon-orange)]" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-[var(--ink)] truncate">
                                {item.title}
                              </span>
                              {isUnread && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-neon-orange)] flex-shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[var(--ink-muted)] whitespace-nowrap">
                              {item.time}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[var(--ink-secondary)] text-[11px] leading-relaxed">
                            {item.desc}
                          </p>
                          <button
                            onClick={() => clearAlert(item.id)}
                            className="absolute right-2 bottom-2 text-[var(--ink-muted)] hover:text-[#ff3358] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                            title="Dismiss"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer status link */}
                <div className="mt-3 pt-2.5 border-t border-[var(--hair)] flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--color-neon-orange)]">((•))</span>
                    <span className="text-[var(--color-neon-orange)] font-bold">WS Stream: 22ms</span>
                  </div>
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
                className="absolute right-0 top-11 z-50 w-[calc(100vw-20px)] max-w-sm sm:w-80 rounded-lg border border-[var(--hair)] nav-dropdown p-4"
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
          {/* Session Performance (P&L) Flyout Dropdown & Popped-Out Draggable Window */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {activeDropdown === "pnl" && !pnlPoppedOut && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute right-0 top-11 z-50 w-[calc(100vw-20px)] max-w-sm sm:w-96 rounded-2xl border border-[var(--hair)] bg-[var(--card)] p-3.5 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.35),0_0_24px_-4px_rgba(255,95,31,0.15)] overflow-hidden text-[var(--ink)]"
              >
                {/* Masked Border Beam strictly on 1.5px border track */}
                <div className="border-beam-ring rounded-2xl">
                  <span className="rotating-glow-border" />
                </div>

                {/* Header with Pop Out and Close buttons */}
                <div className="relative z-10 flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--hair)]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-white">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                      Session Performance
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setPnlPoppedOut(true);
                      }}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] hover:bg-[var(--hair)] transition-colors cursor-pointer"
                      title="Pop out window to drag anywhere"
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Pop Out</span>
                    </button>
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="rounded-md p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--hair)] transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <SessionStats
                    plays={plays}
                    streak={streak}
                    bestStreak={bestStreak}
                    walletConnected={walletConnected}
                    bare
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popped-Out Floating Draggable Window (Place anywhere on screen) */}
          <AnimatePresence>
            {pnlPoppedOut && (
              <motion.div
                drag
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed z-50 w-84 sm:w-96 rounded-2xl border border-[var(--hair)] bg-[var(--card)] p-4 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.4),0_0_30px_rgba(255,95,31,0.2)] overflow-hidden text-[var(--ink)]"
                style={{ left: "calc(50% - 190px)", top: "110px" }}
              >
                {/* Masked Border Beam strictly on 1.5px border track */}
                <div className="border-beam-ring rounded-2xl">
                  <span className="rotating-glow-border" />
                </div>

                {/* Draggable Title Bar */}
                <div className="relative z-10 flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--hair)] cursor-grab active:cursor-grabbing">
                  <div className="flex items-center gap-2">
                    <GripHorizontal className="h-4 w-4 text-[var(--ink-muted)]" />
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-white">
                      <User className="h-3 w-3" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                        Session Performance
                      </span>
                      <span className="hidden sm:inline-block text-[9px] text-[var(--ink-muted)] ml-1.5 font-mono">
                        (Drag anywhere)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPnlPoppedOut(false)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] hover:bg-[var(--hair)] transition-colors cursor-pointer"
                      title="Dock back to navbar"
                    >
                      <Minimize2 className="h-3 w-3" />
                      <span>Dock</span>
                    </button>
                    <button
                      onClick={() => {
                        setPnlPoppedOut(false);
                        setActiveDropdown(null);
                      }}
                      className="rounded-md p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--hair)] transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <SessionStats
                    plays={plays}
                    streak={streak}
                    bestStreak={bestStreak}
                    walletConnected={walletConnected}
                    bare
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </header>
    </div>
  );
}
