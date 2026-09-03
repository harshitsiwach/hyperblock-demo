"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MARKETS as SUPPORTED_ASSETS, BASE_PRICES, type MarketInfo } from "@/app/lib/markets";
import { useMockTrading } from "@/app/hooks/use-mock-trading";
import { useHyperblockAccount } from "@/app/hooks/use-hyperblock-account";
import { settledBetToPlay } from "@/app/lib/hyperblock-api/mapping";
import {
  getMockPlays,
  setMockPlays,
  getStreak,
  getBestStreak,
  updateStreak,
} from "@/app/lib/mock/storage";
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

export function MockArena() {
  const router = useRouter();

  // Selected Market ID (Default: GOLD (XAU) - marketId 9)
  const [selectedMarketId, setSelectedMarketId] = useState<number>(() => {
    const valid = SUPPORTED_ASSETS.map((a) => a.marketId);
    if (typeof window !== "undefined") {
      const q = Number.parseInt(new URLSearchParams(window.location.search).get("market") ?? "9", 10);
      if (valid.includes(q)) return q;
      const saved = Number.parseInt(localStorage.getItem("hyperblock:mock:market") ?? "9", 10);
      if (valid.includes(saved)) return saved;
    }
    return 9; // default GOLD
  });

  const selectedAsset = useMemo(
    () => SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId) ?? SUPPORTED_ASSETS[8],
    [selectedMarketId]
  );

  const mock = useMockTrading(selectedMarketId);

  // Onchain tUSD account (Hyperblock API faucet + betting). Betting stakes real
  // tUSD from the connected wallet; results mirror into local plays for the chart.
  const account = useHyperblockAccount();
  const [settling, setSettling] = useState(false);

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

  // Top Nav and Mobile State
  const [activeNavTab, setActiveNavTab] = useState("trade");
  const [mobileTab, setMobileTab] = useState("trade");
  const [showAssetSheet, setShowAssetSheet] = useState(false);
  const [showTradeSheet, setShowTradeSheet] = useState(false);

  // Activity Stream items
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([
    {
      id: "init-1",
      type: "system",
      title: "Hyperliquid Live WS Connected",
      subtitle: "Streaming 1s ticks directly from mainnet router (22ms)",
      timestamp: Date.now() - 60000,
      highlight: "green",
    },
    {
      id: "init-2",
      type: "system",
      title: "Demo Terminal Ready",
      subtitle: "$10,000.00 mock equity allocated · 1000x sensitivity",
      timestamp: Date.now() - 45000,
      highlight: "neutral",
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist market in storage & URL
  useEffect(() => {
    localStorage.setItem("hyperblock:mock:market", String(selectedMarketId));
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
      setStreak(getStreak());
      setBestStreak(getBestStreak());
    };
    upd();
    window.addEventListener("mock-streak", upd as any);
    window.addEventListener("mock-balance-change", upd as any);
    const iv = setInterval(upd, 1000);
    return () => {
      window.removeEventListener("mock-streak", upd as any);
      window.removeEventListener("mock-balance-change", upd as any);
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
      mock.prices.get(selectedAsset.symbol)?.price ??
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
      // Subtle realistic micro-variance (<0.05%)
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
    if (mock.currentPrice == null) return;
    setHlHistory((h) => {
      // Guard against old token price points leaking into the array
      const lastPoint = h[h.length - 1];
      if (lastPoint && Math.abs(lastPoint.p - mock.currentPrice!) / mock.currentPrice! > 0.4) {
        // Price jump >40% means old asset leftover; purge cleanly
        const fresh = [{ t: Date.now(), p: mock.currentPrice! }];
        marketHistoriesRef.current.set(selectedMarketId, fresh);
        return fresh;
      }
      const next = [...h, { t: Date.now(), p: mock.currentPrice! }];
      if (next.length > 120) next.shift();
      marketHistoriesRef.current.set(selectedMarketId, next);
      return next;
    });
  }, [mock.currentPrice, selectedMarketId]);

  const tusdBalance = account.tusdBalance;
  // Nav shows onchain tUSD only — the old local demo balance is retired.
  const navBalance = tusdBalance ?? 0;
  const needsApproval = !!account.address && !account.isApprovedFor(amount);

  // One-time cleanup: drop the retired local demo balance so it never shows again.
  useEffect(() => {
    try {
      localStorage.removeItem("hyperblock:mock:balance");
      window.dispatchEvent(new CustomEvent("mock-balance-change", { detail: 0 }));
    } catch {}
  }, []);

  // Handle tUSD faucet claim via Hyperblock API (POST /api/claim)
  const handleClaim = async () => {
    if (!account.address) {
      setToast("Connect a Solana wallet to claim tUSD");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (account.claiming) return;
    try {
      const { amountTokens, signature } = await account.claim();
      setClaimPulse(true);
      setToast(`+${amountTokens} tUSD claimed · ${signature.slice(0, 8)}…`);
      setTimeout(() => setClaimPulse(false), 900);
      setTimeout(() => setToast(null), 3500);

      setActivityItems((prev) => [
        {
          id: `claim-${Date.now()}`,
          type: "system",
          title: "tUSD Faucet Claimed",
          subtitle: `+${amountTokens} tUSD to ${account.address?.slice(0, 4)}…${account.address?.slice(-4)} · ${signature.slice(0, 12)}…`,
          timestamp: Date.now(),
          highlight: "green",
        },
        ...prev.slice(0, 19),
      ]);

      try {
        navigator.vibrate?.([20, 30, 20]);
      } catch {}
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Claim failed");
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Handle onchain bet: one-time SPL delegate approval, then POST /api/bets/place
  // (server pulls stake, waits ~10s, settles — the response IS the result).
  const handleBet = async (dir: "up" | "down") => {
    setCelebrate(null);
    if (settling || account.placing) return;
    if (!account.address) {
      setToast("Connect a Solana wallet to bet tUSD");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const entryPrice = mock.currentPrice;
    if (entryPrice == null || !Number.isFinite(entryPrice)) {
      setToast("Price connecting…");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (tusdBalance !== null && tusdBalance < amount) {
      setToast("Insufficient tUSD — claim faucet funds");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (!account.isApprovedFor(amount)) {
      setToast("One-time approval — confirm in wallet…");
      try {
        await account.approve();
        setToast("Approved · placing bet…");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Approval failed");
        setTimeout(() => setToast(null), 3000);
        return;
      }
    }

    setBetFlash(dir);
    setTimeout(() => setBetFlash(null), 600);
    setSettling(true);
    setToast(`Bet sent · settling ~10s onchain…`);

    setActivityItems((prev) => [
      {
        id: `bet-${Date.now()}`,
        type: "trade",
        title: `Opened ${dir.toUpperCase()} on ${selectedAsset.symbol}`,
        subtitle: `Stake: ${amount} tUSD · Entry: $${entryPrice.toFixed(2)}`,
        timestamp: Date.now(),
        highlight: dir === "up" ? "green" : "red",
      },
      ...prev.slice(0, 19),
    ]);

    try {
      navigator.vibrate?.(12);
    } catch {}

    try {
      const settled = await account.placeOnchainBet({
        token: selectedAsset.symbol,
        direction: dir,
        betAmount: amount,
        currentPrice: entryPrice,
      });
      const play: any = settledBetToPlay(settled, selectedMarketId);
      const next = [play, ...getMockPlays()].slice(0, 50);
      setMockPlays(next);

      const profit = settled.profitTokens ?? 0;
      if (settled.status === "won" && profit > 0) {
        const streakInfo = updateStreak(true);
        play.streak = streakInfo.streak;
        const isMega = profit >= amount * 5 * 0.9 - 1e-9;
        setCelebrate({ profit, id: play.id, streak: play.streak, isMega });
        setActivityItems((prev) => [
          {
            id: `settle-${Date.now()}`,
            type: "settlement",
            title: `Won +${profit.toFixed(2)} tUSD on ${selectedAsset.symbol}`,
            subtitle: `${dir.toUpperCase()} ${amount} tUSD · exit $${settled.exitPrice?.toFixed(2) ?? "—"}`,
            timestamp: Date.now(),
            highlight: "green",
          },
          ...prev.slice(0, 19),
        ]);
        const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
        void t;
      } else {
        updateStreak(false);
        const label =
          settled.status === "refunded" || settled.status === "breakeven"
            ? `Trade ${settled.status} · stake returned`
            : `Trade Settled · -${amount} tUSD`;
        setToast(label);
        setTimeout(() => setToast(null), 2600);
        setActivityItems((prev) => [
          {
            id: `settle-${Date.now()}`,
            type: "settlement",
            title:
              settled.status === "won"
                ? `Settled on ${selectedAsset.symbol}`
                : `Lost -${amount} tUSD on ${selectedAsset.symbol}`,
            subtitle: `${dir.toUpperCase()} · exit $${settled.exitPrice?.toFixed(2) ?? "—"} · ${settled.status}`,
            timestamp: Date.now(),
            highlight: settled.status === "won" ? "green" : "red",
          },
          ...prev.slice(0, 19),
        ]);
        try {
          navigator.vibrate?.([20, 40]);
        } catch {}
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Bet failed");
      setTimeout(() => setToast(null), 3500);
    } finally {
      setSettling(false);
    }
  };

  // Balance countUp animation (tracks onchain tUSD when connected)
  useEffect(() => {
    if (navBalance === prevBalanceRef.current) return;
    const from = prevBalanceRef.current;
    const to = navBalance;
    const delta = to - from;
    prevBalanceRef.current = to;
    if (delta === 0) return;

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
  }, [navBalance]);

  // Settlements listener
  useEffect(() => {
    if (mock.lastSettlement && mock.lastSettlement.profit > 0) {
      const play: any = mock.lastSettlement.play as any;
      const isMega = mock.lastSettlement.profit >= play.collateralUsd * 5 * 0.9 - 1e-9;
      setCelebrate({ profit: mock.lastSettlement.profit, id: play.id, streak: play.streak, isMega });

      // Add to activity stream
      setActivityItems((prev) => [
        {
          id: `settle-${Date.now()}`,
          type: "settlement",
          title: `Won +${formatUsd(mock.lastSettlement?.profit ?? 0)} on ${selectedAsset.symbol}`,
          subtitle: `${play.direction.toUpperCase()} $${play.collateralUsd} · Settled with profit`,
          timestamp: Date.now(),
          highlight: "green",
        },
        ...prev.slice(0, 19),
      ]);

      const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
      return () => clearTimeout(t);
    }

    if (mock.lastSettlement && mock.lastSettlement.profit < 0) {
      const play: any = mock.lastSettlement.play as any;
      setToast(`Trade Settled · -$${play.collateralUsd}`);
      setTimeout(() => setToast(null), 2400);

      // Add to activity stream
      setActivityItems((prev) => [
        {
          id: `settle-${Date.now()}`,
          type: "settlement",
          title: `Lost -$${play.collateralUsd} on ${selectedAsset.symbol}`,
          subtitle: `${play.direction.toUpperCase()} · Settled below strike`,
          timestamp: Date.now(),
          highlight: "red",
        },
        ...prev.slice(0, 19),
      ]);

      try {
        navigator.vibrate?.([20, 40]);
      } catch {}
    }
  }, [mock.lastSettlement, selectedAsset.symbol]);

  // Snapshot for Solana wallet button
  const mockSnapshot: MarketSnapshot = useMemo(() => {
    const price = mock.currentPrice ?? 0;
    const history = hlHistory.map((h) => ({ price: h.p, timestamp: h.t }));
    const safeHistory = history.length ? history : [{ price: price || 0, timestamp: Date.now() }];
    return {
      mode: "live" as const,
      marketId: selectedMarketId,
      marketLabel: selectedAsset.label,
      gameLabel: `${selectedAsset.symbol} PRICE RUSH`,
      currentPrice: price,
      currentRawPrice: String(Math.round(price * 100)),
      priceExponent: 8,
      priceHistory: safeHistory,
      feedHealth: mock.currentPrice ? ("live" as const) : ("offline" as const),
      feedAgeSeconds: 0.3,
      marketMode: "open" as const,
      activePositions: mock.activePlays.length,
      nextPositionNonce: mock.plays.length,
      maxPositions: 8,
      walletAddress: null,
      walletBalanceUsd: navBalance,
      fallbackClaimableUsd: 0,
      plays: mock.plays as Play[],
      capturedAt: Date.now(),
      erEndpoint: "",
      collateralMint: "",
      oracleAddress: "",
      oracleFeedId: "",
      notice: account.address
        ? `Demo · Hyperliquid live · tUSD ${tusdBalance?.toFixed(2) ?? "…"} · ${account.address.slice(0, 4)}…`
        : "Demo · Hyperliquid live · Connect wallet to claim tUSD",
    };
  }, [mock.currentPrice, hlHistory, selectedMarketId, selectedAsset.label, mock.activePlays.length, mock.plays, navBalance, selectedAsset.symbol, account.address, tusdBalance]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f8fafc] flex flex-col font-sans terminal-grid-bg relative selection:bg-[#00f076]/30 selection:text-[#00f076]">
      {/* Subtle Custom Cursor for Desktop */}
      <CustomCursor />

      {/* Top Terminal Navigation */}
      <TerminalNav
        balance={displayBalance}
        balanceBump={balanceBump}
        activePositionsCount={mock.activePlays.length}
        maxPositions={8}
        streak={streak}
        bestStreak={bestStreak}
        canClaim={!account.claiming}
        cooldownSec={0}
        onClaim={() => void handleClaim()}
        claimPulse={claimPulse}
        claimLabel="+ Claim 100 tUSD"
        claimBusy={account.claiming}
        activeNavTab={activeNavTab}
        onNavTabChange={(tab) => {
          setActiveNavTab(tab);
          if (tab === "leaderboard") router.push("/leaderboard");
          if (tab === "vaults") router.push("/liquidity");
        }}
        snapshot={mockSnapshot}
      />

      {/* Main Trading Terminal Workspace */}
      <main className="mx-auto flex-1 w-full max-w-[1720px] p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5 pb-20 lg:pb-8">
        {/* Upper Workspace: 3-Column Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Column 1: Market Overview (Left Column) */}
          <div className="lg:col-span-3">
            <MarketOverview
              asset={selectedAsset}
              currentPrice={mock.currentPrice}
              priceHistory={hlHistory}
              latencyMs={22}
            />
          </div>

          {/* Column 2: Live Trading Chart & Active Asset Watch HUD (Center Column) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <TerminalChart
              data={hlHistory}
              currentPrice={mock.currentPrice}
              activePlays={mock.activePlays as Play[]}
              symbol={selectedAsset.symbol}
              height={520}
            />

            {/* Active Watched Token Hologram & Web3 Matrix HUD */}
            <ActiveAssetHud
              asset={selectedAsset}
              currentPrice={mock.currentPrice}
              prices={mock.prices}
              onSelectMarket={(id) => setSelectedMarketId(id)}
            />
          </div>

          {/* Column 3: Order Console & Asset Selector (Right Column) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {!account.address && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5 text-[11px] font-semibold text-amber-200">
                Connect a Solana wallet (top-right) to claim 100 tUSD and place onchain bets.
              </div>
            )}
            {needsApproval && (
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2.5 text-[11px] text-cyan-100">
                <div className="font-bold">One-time tUSD approval</div>
                <div className="mt-0.5 text-cyan-200/80">Authorize the house wallet as SPL delegate once — bets after that need no popup.</div>
                <button
                  onClick={() => void account.approve().then(() => setToast("Approved · you can bet now")).catch((e) => setToast(e instanceof Error ? e.message : "Approval failed"))}
                  disabled={account.approving}
                  className="mt-2 w-full rounded-lg bg-cyan-300 px-3 py-1.5 text-[11px] font-extrabold text-[#090a0f] disabled:opacity-50"
                >
                  {account.approving ? "Approving…" : "Approve tUSD"}
                </button>
              </div>
            )}
            {settling && (
              <div className="rounded-xl border border-[#00f076]/30 bg-[#00f076]/[0.07] px-3 py-2.5 text-[11px] font-bold text-[#00f076] animate-pulse">
                Settling onchain… stake pulled, waiting ~10s for Hyperliquid exit price.
              </div>
            )}
            <TradingTicket
              asset={selectedAsset}
              amount={amount}
              onAmountChange={setAmount}
              onBet={(dir) => void handleBet(dir)}
              disabled={!mock.currentPrice || settling || account.placing}
              activeCount={mock.activePlays.length}
              maxPositions={8}
              betFlash={betFlash}
            />

            <AssetBrowser
              selectedMarketId={selectedMarketId}
              onSelect={(id) => setSelectedMarketId(id)}
              prices={mock.prices}
            />
          </div>
        </div>

        {/* Lower Workspace: Dock with Session Stats, Live Positions & Stream */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Column 1: Session Performance & Ring */}
          <div className="lg:col-span-3">
            <SessionStats plays={mock.plays as Play[]} streak={streak} bestStreak={bestStreak} />
          </div>

          {/* Column 2: Live Position Cards & 10s Countdown */}
          <div className="lg:col-span-6">
            <LivePositions
              activePlays={mock.activePlays as Play[]}
              historyPlays={mock.historyPlays as Play[]}
              now={mock.now}
            />
          </div>

          {/* Column 3: Recent Activity Stream */}
          <div className="lg:col-span-3">
            <RecentActivity items={activityItems} />
          </div>
        </div>
      </main>

      {/* Floating Victory Celebration */}
      <WinCelebrationV2
        profit={celebrate?.profit ?? 0}
        show={!!celebrate}
        streak={celebrate?.streak}
        isMega={celebrate?.isMega}
        onDone={() => setCelebrate(null)}
      />

      {/* Modern Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-white/[0.14] bg-[#141824]/95 px-4 py-2.5 text-xs font-extrabold text-white shadow-2xl backdrop-blur-xl animate-[price-flash-green_0.3s_ease-out]">
          {toast}
        </div>
      )}

      {/* Mobile Ergonomic Navigation Dock */}
      <MobileDock
        activeTab={mobileTab}
        onTabChange={(tab) => setMobileTab(tab)}
        onOpenAssetSheet={() => setShowAssetSheet(true)}
        onOpenTradeSheet={() => setShowTradeSheet(true)}
        activeCount={mock.activePlays.length}
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
              prices={mock.prices}
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
              <h3 className="text-xs font-bold uppercase text-white">Place 10-Second Trade</h3>
              <button onClick={() => setShowTradeSheet(false)} className="text-xs text-slate-400">✕ Close</button>
            </div>
            <TradingTicket
              asset={selectedAsset}
              amount={amount}
              onAmountChange={setAmount}
              onBet={(dir) => {
                void handleBet(dir);
                setShowTradeSheet(false);
              }}
              disabled={!mock.currentPrice || settling || account.placing}
              activeCount={mock.activePlays.length}
              maxPositions={8}
              betFlash={betFlash}
            />
          </div>
        </div>
      )}
    </div>
  );
}
