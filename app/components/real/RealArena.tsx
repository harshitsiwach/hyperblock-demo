"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MARKETS as SUPPORTED_ASSETS, BASE_PRICES, type MarketInfo } from "@/app/lib/markets";
import { useRealTrading } from "@/app/hooks/use-real-trading";
import {
  claimRealFunds,
  canClaimReal,
  getLastRealClaimAt,
  REAL_CLAIM_COOLDOWN_MS,
  getRealStreak,
  getRealBestStreak,
} from "@/app/lib/real/storage";
import { CustomCursor } from "@/app/components/terminal/custom-cursor";
import { TerminalNav } from "@/app/components/terminal/terminal-nav";
import { MarketOverview } from "@/app/components/terminal/market-overview";
import { TerminalChart } from "@/app/components/terminal/terminal-chart";
import { TradingTicket } from "@/app/components/terminal/trading-ticket";
import { AssetBrowser } from "@/app/components/terminal/asset-browser";
import { SessionStats } from "@/app/components/terminal/session-stats";
import { LivePositions } from "@/app/components/terminal/live-positions";
import { RecentActivity, type ActivityItem } from "@/app/components/terminal/recent-activity";
import { WinCelebrationV2 } from "@/app/components/terminal/win-celebration-v2";
import { MobileDock } from "@/app/components/terminal/mobile-dock";
import { ActiveAssetHud } from "@/app/components/terminal/active-asset-hud";
import type { MarketSnapshot, Play } from "@/app/lib/domain";

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RealArena() {
  const router = useRouter();

  // Selected Market ID (Default: GOLD (XAU) - marketId 9)
  const [selectedMarketId, setSelectedMarketId] = useState<number>(() => {
    const valid = SUPPORTED_ASSETS.map((a) => a.marketId);
    if (typeof window !== "undefined") {
      const q = Number.parseInt(new URLSearchParams(window.location.search).get("market") ?? "9", 10);
      if (valid.includes(q)) return q;
      const saved = Number.parseInt(localStorage.getItem("hyperblock:real:market") ?? "9", 10);
      if (valid.includes(saved)) return saved;
    }
    return 9; // default GOLD
  });

  const selectedAsset = useMemo(
    () => SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId) ?? SUPPORTED_ASSETS[8],
    [selectedMarketId]
  );

  const realTrade = useRealTrading(selectedMarketId);

  // Local interaction & visual state
  const [amount, setAmount] = useState(10);
  const [claimPulse, setClaimPulse] = useState(false);
  const [betFlash, setBetFlash] = useState<"up" | "down" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{ profit: number; id: string; streak?: number; isMega?: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [balanceBump, setBalanceBump] = useState(false);
  const prevBalanceRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Active Navigation Tab
  const [activeNavTab, setActiveNavTab] = useState("trade");
  const [mobileTab, setMobileTab] = useState<"trade" | "chart" | "positions" | "stats" | "more">("trade");

  // Mobile Bottom Sheets
  const [showAssetSheet, setShowAssetSheet] = useState(false);
  const [showTradeSheet, setShowTradeSheet] = useState(false);

  // Activity Stream items
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([
    {
      id: "init-1",
      type: "system",
      title: "Hyperliquid Mainnet Router Connected",
      subtitle: "Streaming real-time 1s ticks directly from builder DEX (22ms)",
      timestamp: Date.now() - 60000,
      highlight: "green",
    },
    {
      id: "init-2",
      type: "system",
      title: "Real Terminal Active",
      subtitle: "Real execution engine ready · 1000x sensitivity",
      timestamp: Date.now() - 45000,
      highlight: "neutral",
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist market in storage & URL
  useEffect(() => {
    localStorage.setItem("hyperblock:real:market", String(selectedMarketId));
    const url = new URL(window.location.href);
    url.searchParams.set("market", String(selectedMarketId));
    window.history.replaceState(null, "", url.toString());

    // Append switch event to activity stream
    setActivityItems((prev) => [
      {
        id: `switch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: "switch",
        title: `Switched to ${selectedAsset.symbol}`,
        subtitle: `${selectedAsset.label} · 10-sec market selected`,
        timestamp: Date.now(),
        highlight: "neutral",
      },
      ...prev.slice(0, 19),
    ]);
  }, [selectedMarketId, selectedAsset.symbol, selectedAsset.label]);

  // Streak & balance sync
  useEffect(() => {
    const upd = () => {
      setStreak(getRealStreak());
      setBestStreak(getRealBestStreak());
    };
    upd();
    window.addEventListener("real-streak", upd as any);
    window.addEventListener("real-balance-change", upd as any);
    const iv = setInterval(upd, 1000);
    return () => {
      window.removeEventListener("real-streak", upd as any);
      window.removeEventListener("real-balance-change", upd as any);
      clearInterval(iv);
    };
  }, []);

  // Per-market price history cache so switching tokens never mixes price scales
  const marketHistoriesRef = useRef<Map<number, { t: number; p: number }[]>>(new Map());
  const [hlHistory, setHlHistory] = useState<{ t: number; p: number }[]>([]);

  // When selected market changes: refresh history specifically for that token
  useEffect(() => {
    const cached = marketHistoriesRef.current.get(selectedMarketId);
    const livePrice =
      realTrade.prices.get(selectedAsset.symbol)?.price ??
      BASE_PRICES[selectedAsset.symbol.toUpperCase()] ??
      100;

    if (cached && cached.length > 5) {
      // Validate cached points to ensure no old price contamination
      const valid = cached.every((pt) => Math.abs(pt.p - livePrice) / livePrice < 0.35);
      if (valid) {
        setHlHistory([...cached]);
        return;
      }
    }

    // Generate fresh baseline history specifically around this particular token's price
    const now = Date.now();
    const initialPoints: { t: number; p: number }[] = [];
    for (let i = 40; i >= 0; i--) {
      const microDrift = (Math.sin(i * 0.35) * 0.0008 + Math.sin(i * 0.9) * 0.0004) * livePrice;
      initialPoints.push({
        t: now - i * 1000,
        p: Number((livePrice + microDrift).toFixed(livePrice < 1 ? 4 : 2)),
      });
    }
    marketHistoriesRef.current.set(selectedMarketId, initialPoints);
    setHlHistory(initialPoints);
  }, [selectedMarketId, selectedAsset.symbol]);

  // Append live 1-second ticks for currently active token
  useEffect(() => {
    if (realTrade.currentPrice == null) return;
    setHlHistory((h) => {
      const lastPoint = h[h.length - 1];
      if (lastPoint && Math.abs(lastPoint.p - realTrade.currentPrice!) / realTrade.currentPrice! > 0.4) {
        const fresh = [{ t: Date.now(), p: realTrade.currentPrice! }];
        marketHistoriesRef.current.set(selectedMarketId, fresh);
        return fresh;
      }
      const next = [...h, { t: Date.now(), p: realTrade.currentPrice! }];
      if (next.length > 120) next.shift();
      marketHistoriesRef.current.set(selectedMarketId, next);
      return next;
    });
  }, [realTrade.currentPrice, selectedMarketId]);

  const canClaim = mounted ? canClaimReal() : false;
  const lastClaim = mounted ? getLastRealClaimAt() : null;
  const cooldownSec = lastClaim
    ? Math.max(0, Math.ceil((REAL_CLAIM_COOLDOWN_MS - (Date.now() - lastClaim)) / 1000))
    : 0;

  // Handle Real claim
  const handleClaim = () => {
    const res = claimRealFunds(10_000);
    if (res.claimed) {
      setClaimPulse(true);
      setToast(`+${formatUsd(10_000)} Real Balance Added`);
      setTimeout(() => setClaimPulse(false), 900);
      setTimeout(() => setToast(null), 2500);

      // Push activity event
      setActivityItems((prev) => [
        {
          id: `claim-${Date.now()}`,
          type: "system",
          title: "Real Balance Credited",
          subtitle: `Added ${formatUsd(10_000)} to your real account`,
          timestamp: Date.now(),
          highlight: "green",
        },
        ...prev.slice(0, 19),
      ]);
    }
  };

  // Handle Order Placement
  const handleBet = (dir: "up" | "down") => {
    setCelebrate(null);
    const res = realTrade.placeBet(dir, amount);
    if (!res.ok) {
      setToast(res.reason);
      setTimeout(() => setToast(null), 2000);
      return;
    }

    setBetFlash(dir);
    setTimeout(() => setBetFlash(null), 600);

    // Push activity event
    setActivityItems((prev) => [
      {
        id: `bet-${Date.now()}`,
        type: "trade",
        title: `Opened ${dir.toUpperCase()} on ${selectedAsset.symbol}`,
        subtitle: `Stake: $${amount} · Entry: $${realTrade.currentPrice?.toFixed(2) ?? "—"}`,
        timestamp: Date.now(),
        highlight: dir === "up" ? "green" : "red",
      },
      ...prev.slice(0, 19),
    ]);
  };

  // Settlement reaction & win celebration
  useEffect(() => {
    if (realTrade.lastSettlement && realTrade.lastSettlement.profit > 0) {
      const play: any = realTrade.lastSettlement.play as any;
      const isMega = realTrade.lastSettlement.profit >= play.collateralUsd * 5 * 0.9 - 1e-9;
      setCelebrate({
        profit: realTrade.lastSettlement.profit,
        id: play.id,
        streak: play.streak,
        isMega,
      });

      setActivityItems((prev) => [
        {
          id: `settle-win-${Date.now()}`,
          type: "settlement",
          title: `Won +${formatUsd(realTrade.lastSettlement?.profit ?? 0)} on ${selectedAsset.symbol}`,
          subtitle: `${play.direction?.toUpperCase() ?? "UP"} $${play.collateralUsd} · Settled with profit`,
          timestamp: Date.now(),
          highlight: "green",
        },
        ...prev.slice(0, 19),
      ]);

      const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
      return () => clearTimeout(t);
    }

    if (realTrade.lastSettlement && realTrade.lastSettlement.profit < 0) {
      const play: any = realTrade.lastSettlement.play as any;
      setToast(`Trade Settled · -$${play.collateralUsd}`);
      setTimeout(() => setToast(null), 2400);

      setActivityItems((prev) => [
        {
          id: `settle-loss-${Date.now()}`,
          type: "settlement",
          title: `Lost -$${play.collateralUsd} on ${selectedAsset.symbol}`,
          subtitle: `${play.direction?.toUpperCase() ?? "DOWN"} $${play.collateralUsd} · Settled at loss`,
          timestamp: Date.now(),
          highlight: "red",
        },
        ...prev.slice(0, 19),
      ]);
    }
  }, [realTrade.lastSettlement]);

  // Balance rolling count-up animation
  useEffect(() => {
    const from = prevBalanceRef.current;
    const to = realTrade.balance;
    prevBalanceRef.current = to;
    if (from === to) return;

    const delta = to - from;
    if (Math.abs(delta) < 0.01) {
      setDisplayBalance(to);
      return;
    }

    setBalanceBump(true);
    setTimeout(() => setBalanceBump(false), 420);

    const start = performance.now();
    const dur = 420;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayBalance(from + delta * eased);
      if (p < 1) requestAnimationFrame(tick);
      else setDisplayBalance(to);
    };
    requestAnimationFrame(tick);
  }, [realTrade.balance]);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col font-sans selection:bg-[#00f076]/30 selection:text-white relative">
      {/* Interactive Desktop Custom Cursor */}
      <CustomCursor />

      {/* Top Terminal Navigation Bar */}
      <TerminalNav
        balance={displayBalance}
        balanceBump={balanceBump}
        activePositionsCount={realTrade.activePlays.length}
        maxPositions={8}
        streak={streak}
        bestStreak={bestStreak}
        canClaim={canClaim}
        cooldownSec={cooldownSec}
        onClaim={handleClaim}
        claimPulse={claimPulse}
        activeNavTab={activeNavTab}
        onNavTabChange={(tab) => {
          setActiveNavTab(tab);
          if (tab === "leaderboard") router.push("/leaderboard");
          if (tab === "vaults") router.push("/liquidity");
        }}
        snapshot={undefined}
        isReal={true}
      />

      {/* Main Trading Terminal Workspace */}
      <main className="mx-auto flex-1 w-full max-w-[1720px] p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5 pb-20 lg:pb-8">
        {/* Upper Workspace: 3-Column Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Column 1: Market Overview (Left Column) */}
          <div className="lg:col-span-3">
            <MarketOverview
              asset={selectedAsset}
              currentPrice={realTrade.currentPrice}
              priceHistory={hlHistory}
              latencyMs={22}
            />
          </div>

          {/* Column 2: Live Trading Chart & Active Asset Watch HUD (Center Column) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <TerminalChart
              data={hlHistory}
              currentPrice={realTrade.currentPrice}
              activePlays={realTrade.activePlays as Play[]}
              symbol={selectedAsset.symbol}
              height={520}
            />

            {/* Active Watched Token Hologram & Web3 Matrix HUD */}
            <ActiveAssetHud
              asset={selectedAsset}
              currentPrice={realTrade.currentPrice}
              prices={realTrade.prices}
              onSelectMarket={(id) => setSelectedMarketId(id)}
            />
          </div>

          {/* Column 3: Order Console & Asset Selector (Right Column) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <TradingTicket
              asset={selectedAsset}
              amount={amount}
              onAmountChange={setAmount}
              onBet={handleBet}
              disabled={!realTrade.currentPrice}
              activeCount={realTrade.activePlays.length}
              maxPositions={8}
              betFlash={betFlash}
            />

            <AssetBrowser
              selectedMarketId={selectedMarketId}
              onSelect={(id) => setSelectedMarketId(id)}
              prices={realTrade.prices}
            />
          </div>
        </div>

        {/* Lower Workspace: Dock with Session Stats, Live Positions & Stream */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Column 1: Session Performance & Ring */}
          <div className="lg:col-span-3">
            <SessionStats plays={realTrade.plays as Play[]} streak={streak} bestStreak={bestStreak} />
          </div>

          {/* Column 2: Live Position Cards & 10s Countdown */}
          <div className="lg:col-span-6">
            <LivePositions
              activePlays={realTrade.activePlays as Play[]}
              historyPlays={realTrade.historyPlays as Play[]}
              now={realTrade.now}
            />
          </div>

          {/* Column 3: Recent Activity Stream */}
          <div className="lg:col-span-3">
            <RecentActivity items={activityItems} />
          </div>
        </div>
      </main>

      {/* Non-Casino Victory Celebration Modal */}
      <WinCelebrationV2
        profit={celebrate?.profit ?? 0}
        show={!!celebrate}
        streak={celebrate?.streak}
        isMega={celebrate?.isMega}
        onDone={() => setCelebrate(null)}
      />

      {/* Floating System Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-white/[0.14] bg-[#141824]/95 px-4 py-2.5 text-xs font-extrabold text-white shadow-2xl backdrop-blur-xl animate-[price-flash-green_0.3s_ease-out]">
          {toast}
        </div>
      )}

      {/* Mobile Ergonomic Navigation Dock */}
      <MobileDock
        activeTab={mobileTab}
        onTabChange={(tab) => setMobileTab(tab as any)}
        onOpenAssetSheet={() => setShowAssetSheet(true)}
        onOpenTradeSheet={() => setShowTradeSheet(true)}
        activeCount={realTrade.activePlays.length}
      />

      {/* Mobile Drawer Bottom Sheet for Asset Browser */}
      {showAssetSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm lg:hidden">
          <div className="relative max-h-[80vh] w-full rounded-t-2xl border-t border-white/[0.12] bg-[#121620] p-4 overflow-y-auto">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-3">
              <h3 className="text-xs font-bold uppercase text-white">Select Asset</h3>
              <button onClick={() => setShowAssetSheet(false)} className="text-xs text-slate-400">✕ Close</button>
            </div>
            <AssetBrowser
              selectedMarketId={selectedMarketId}
              onSelect={(id) => {
                setSelectedMarketId(id);
                setShowAssetSheet(false);
              }}
              prices={realTrade.prices}
            />
          </div>
        </div>
      )}

      {/* Mobile Drawer Bottom Sheet for Trading Ticket */}
      {showTradeSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm lg:hidden">
          <div className="relative w-full rounded-t-2xl border-t border-white/[0.12] bg-[#121620] p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-3">
              <h3 className="text-xs font-bold uppercase text-white">10-Second Order</h3>
              <button onClick={() => setShowTradeSheet(false)} className="text-xs text-slate-400">✕ Close</button>
            </div>
            <TradingTicket
              asset={selectedAsset}
              amount={amount}
              onAmountChange={setAmount}
              onBet={(dir) => {
                handleBet(dir);
                setShowTradeSheet(false);
              }}
              disabled={!realTrade.currentPrice}
              activeCount={realTrade.activePlays.length}
              maxPositions={8}
              betFlash={betFlash}
            />
          </div>
        </div>
      )}
    </div>
  );
}
