"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MARKETS as SUPPORTED_ASSETS, BASE_PRICES, type MarketInfo } from "@/app/lib/markets";
import { useRealTrading } from "@/app/hooks/use-real-trading";
import { useHyperblockAccount } from "@/app/hooks/use-hyperblock-account";
import { useOnchainBetHistory } from "@/app/hooks/use-onchain-bet-history";
import { settledBetToPlay } from "@/app/lib/hyperblock-api/mapping";
import {
  getRealPlays,
  setRealPlays,
  getRealStreak,
  getRealBestStreak,
  updateRealStreak,
} from "@/app/lib/real/storage";
import { TerminalNav } from "@/app/components/terminal/terminal-nav";
import { MarketOverview } from "@/app/components/terminal/market-overview";
import { TerminalChart } from "@/app/components/terminal/terminal-chart";
import { TradingTicket } from "@/app/components/terminal/trading-ticket";
import { AssetBrowser } from "@/app/components/terminal/asset-browser";
import { LivePositions } from "@/app/components/terminal/live-positions";
import { BetRecordCard } from "@/app/components/terminal/bet-record-card";
import { RecentActivity, type ActivityItem, type BetDetail } from "@/app/components/terminal/recent-activity";
import { WinCelebrationV2 } from "@/app/components/terminal/win-celebration-v2";
import { MobileDock } from "@/app/components/terminal/mobile-dock";
import type { MarketSnapshot, Play } from "@/app/lib/domain";

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RealArena() {
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

  // Onchain tUSD account (Hyperblock API faucet + betting). Stakes real tUSD
  // from the connected wallet; settled results mirror into local plays for charts.
  const account = useHyperblockAccount();
  const [settling, setSettling] = useState(false);
  // Pending card shown in Active Orders while the ~10-20s onchain round settles.
  // Status "submitting" is deliberately ignored by the local trading engine.
  const [pendingPlay, setPendingPlay] = useState<Play | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  // Chain-verified bet record (stake pulls + payouts reconstructed from devnet).
  const history = useOnchainBetHistory({
    userAta: account.balances?.userAta ?? null,
    houseAta: account.balances?.houseAta ?? null,
    mint: account.config?.tokenMint ?? null,
    decimals: account.config?.tokenDecimals ?? null,
    rpcEndpoint: account.config?.baseRpcEndpoint ?? null,
    refreshKey: historyKey,
  });
  const liveActivePlays = useMemo(
    () => (pendingPlay ? [pendingPlay, ...realTrade.activePlays] : realTrade.activePlays) as Play[],
    [pendingPlay, realTrade.activePlays],
  );

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

  // Mobile Navigation Tab
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

  const tusdBalance = account.tusdBalance;
  // Nav shows onchain tUSD only — the old local balance is retired.
  const navBalance = tusdBalance ?? 0;
  const needsApproval = !!account.address && !account.isApprovedFor(amount);

  // One-time cleanup: drop the retired local balance so it never shows again.
  useEffect(() => {
    try {
      localStorage.removeItem("hyperblock:real:balance");
      window.dispatchEvent(new CustomEvent("real-balance-change", { detail: 0 }));
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
      setHistoryKey((k) => k + 1);
      setToast(`+${amountTokens} tUSD claimed · ${signature.slice(0, 8)}…`);
      setTimeout(() => setClaimPulse(false), 900);
      setTimeout(() => setToast(null), 3500);

      setActivityItems((prev) => [
        {
          id: `claim-${Date.now()}`,
          type: "system",
          title: "tUSD Faucet Claimed (Live)",
          subtitle: `+${amountTokens} tUSD · ${signature.slice(0, 12)}…`,
          timestamp: Date.now(),
          highlight: "green",
        },
        ...prev.slice(0, 19),
      ]);
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
    const entryPrice = realTrade.currentPrice;
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
    setToast("Bet sent · settling ~10s onchain…");
    // Visible Active Order while the round settles (engine ignores "submitting").
    const openedAt = Date.now();
    setPendingPlay({
      id: `pending-${openedAt}`,
      marketId: selectedMarketId,
      direction: dir,
      collateralUsd: amount,
      entryPrice,
      openedAt,
      expiresAt: openedAt + 10_000,
      refundAt: openedAt + 30_000,
      status: "submitting",
      priceMovePercent: 0,
      liveProfitUsd: 0,
    });

    setActivityItems((prev) => [
      {
        id: `bet-${Date.now()}`,
        type: "trade",
        title: `Opened ${dir.toUpperCase()} on ${selectedAsset.symbol}`,
        subtitle: `Stake: ${amount} tUSD · Entry: $${entryPrice.toFixed(2)}`,
        timestamp: Date.now(),
        highlight: dir === "up" ? "green" : "red",
        detail: {
          symbol: selectedAsset.symbol,
          direction: dir,
          stakeTokens: amount,
          entryPrice,
          status: "settling",
          openedAt,
        },
      },
      ...prev.slice(0, 19),
    ]);

    try {
      const settled = await account.placeOnchainBet({
        token: selectedAsset.symbol,
        direction: dir,
        betAmount: amount,
        currentPrice: entryPrice,
      });
      const play: any = settledBetToPlay(settled, selectedMarketId);
      const next = [play, ...getRealPlays()].slice(0, 50);
      setRealPlays(next);
      setPendingPlay(null);
      setHistoryKey((k) => k + 1);

      const profit = settled.profitTokens ?? 0;
      const settledAt = Date.now();
      const pnlPct = amount > 0 ? (profit / amount) * 100 : 0;
      const exitStr = settled.exitPrice !== undefined && settled.exitPrice !== null ? `$${settled.exitPrice.toFixed(2)}` : "—";
      const betDetail: BetDetail = {
        symbol: selectedAsset.symbol,
        direction: dir,
        stakeTokens: amount,
        entryPrice,
        exitPrice: settled.exitPrice ?? undefined,
        payoutTokens: settled.payoutTokens ?? undefined,
        profitTokens: profit,
        feeTokens: settled.feeTokens ?? 0,
        status: settled.status === "pending" ? "settling" : settled.status,
        stakeSignature: settled.stakeSignature ?? undefined,
        payoutSignature: settled.payoutSignature ?? undefined,
        openedAt,
        settledAt,
      };
      if (settled.status === "won" && profit > 0) {
        const streakInfo = updateRealStreak(true);
        play.streak = streakInfo.streak;
        const isMega = profit >= amount * 5 * 0.9 - 1e-9;
        setCelebrate({ profit, id: play.id, streak: play.streak, isMega });
        setActivityItems((prev) => [
          {
            id: `settle-win-${Date.now()}`,
            type: "settlement",
            title: `Won +${profit.toFixed(2)} tUSD on ${selectedAsset.symbol}`,
            subtitle: `Bet $${entryPrice.toFixed(2)} → Close ${exitStr} · P&L +$${profit.toFixed(2)} (+${pnlPct.toFixed(1)}%)`,
            timestamp: Date.now(),
            highlight: "green",
            detail: { ...betDetail },
          },
          ...prev.slice(0, 19),
        ]);
        const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
        void t;
      } else {
        updateRealStreak(false);
        const label =
          settled.status === "refunded" || settled.status === "breakeven"
            ? `Trade ${settled.status} · stake returned`
            : `Trade Settled · -${amount} tUSD`;
        setToast(label);
        setTimeout(() => setToast(null), 2600);
        setActivityItems((prev) => [
          {
            id: `settle-loss-${Date.now()}`,
            type: "settlement",
            title:
              settled.status === "won"
                ? `Settled on ${selectedAsset.symbol}`
                : `Lost -${amount} tUSD on ${selectedAsset.symbol}`,
            subtitle: `Bet $${entryPrice.toFixed(2)} → Close ${exitStr} · P&L ${profit >= 0 ? "+" : "−"}$${Math.abs(profit).toFixed(2)} (${pnlPct >= 0 ? "+" : "−"}${Math.abs(pnlPct).toFixed(1)}%)`,
            timestamp: Date.now(),
            highlight: settled.status === "won" ? "green" : "red",
            detail: { ...betDetail },
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Bet failed");
      setTimeout(() => setToast(null), 3500);
    } finally {
      setPendingPlay(null);
      setSettling(false);
    }
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

  // Balance rolling count-up animation (tracks onchain tUSD when connected)
  useEffect(() => {
    const from = prevBalanceRef.current;
    const to = navBalance;
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
  }, [navBalance]);

  return (
    <div className="min-h-screen terminal-grid-bg text-[var(--ink)] flex flex-col font-sans bg-[var(--bg)] relative transition-colors duration-200">
      {/* Top Terminal Navigation Bar */}
      <TerminalNav
        balance={displayBalance}
        balanceBump={balanceBump}
        walletConnected={!!account.address}
        canClaim={!account.claiming && account.claimCooldownSec <= 0}
        cooldownSec={account.claimCooldownSec}
        onClaim={() => void handleClaim()}
        claimPulse={claimPulse}
        claimLabel="+ Claim 100 tUSD"
        claimBusy={account.claiming}
        snapshot={undefined}
        plays={realTrade.plays as Play[]}
        streak={streak}
        bestStreak={bestStreak}
      />

      {/* Main Trading Terminal Workspace */}
      <main className="mx-auto flex-1 w-full max-w-[1720px] px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 space-y-4 lg:space-y-5 pb-20 lg:pb-8">
        {/* Upper Workspace: 3-Column Grid — browser left, graph middle, betting UI + positions right */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4 items-start">
          {/* Column 1: Market Overview (Top) & Asset Browser (Below) */}
          <div className="lg:col-span-3 flex flex-col gap-3.5 order-3 lg:order-1">
            <MarketOverview
              asset={selectedAsset}
              currentPrice={realTrade.currentPrice}
              priceHistory={hlHistory}
              latencyMs={22}
            />
            {needsApproval && (
              <div className="rounded-lg border border-[var(--color-neon-orange)] bg-[var(--color-neon-orange-soft)] px-3.5 py-3 text-[11px] text-[var(--ink)]">
                <div className="font-bold">One-time tUSD approval</div>
                <div className="mt-0.5 text-[var(--ink-muted)]">Authorize the house wallet as SPL delegate once — bets after that need no popup.</div>
                <button
                  onClick={() => void account.approve().then(() => setToast("Approved · you can bet now")).catch((e) => setToast(e instanceof Error ? e.message : "Approval failed"))}
                  disabled={account.approving}
                  className="mt-2 w-full rounded-lg bg-[var(--color-neon-orange)] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 transition-colors hover:bg-[var(--color-neon-orange-pressed)]"
                >
                  {account.approving ? "Approving…" : "Approve tUSD"}
                </button>
              </div>
            )}
            {settling && (
              <div className="rounded-lg border border-[var(--wait)] bg-[var(--wait-tint)] px-3.5 py-2.5 text-[11px] font-bold text-[var(--wait)]">
                Settling onchain… stake pulled, waiting ~10s for Hyperliquid exit price.
              </div>
            )}

            {/* Market Asset Browser */}
            <AssetBrowser
              selectedMarketId={selectedMarketId}
              onSelect={(id) => setSelectedMarketId(id)}
              prices={realTrade.prices}
            />
          </div>

          {/* Column 2: Graph (Middle Column) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 order-1 lg:order-2">
            <TerminalChart
              data={hlHistory}
              currentPrice={realTrade.currentPrice}
              activePlays={liveActivePlays}
              symbol={selectedAsset.symbol}
              height={620}
            />
          </div>

          {/* Column 3: Bet Console (Top) & Unified Active Orders / Bet Record (Below) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 order-2 lg:order-3">
            {/* 10-Second Bet Ticket */}
            <TradingTicket
              asset={selectedAsset}
              amount={amount}
              onAmountChange={setAmount}
              onBet={(dir) => void handleBet(dir)}
              disabled={!realTrade.currentPrice || settling || account.placing}
              activeCount={liveActivePlays.length}
              maxPositions={8}
              betFlash={betFlash}
            />

            {/* Active Orders & On-chain Record */}
            <LivePositions
              activePlays={liveActivePlays}
              historyPlays={realTrade.historyPlays as Play[]}
              now={realTrade.now}
              records={history.records}
              historyLoading={history.loading}
              walletConnected={!!account.address}
              onRefreshHistory={() => void history.refresh()}
            />
          </div>
        </div>

        {/* Recent Terminal Stream — full width below everything */}
        <div className="mt-4 lg:mt-5">
          <RecentActivity items={activityItems} />
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

      {/* Flat toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-[var(--hair)] bg-[var(--card)] px-4 py-2.5 text-xs font-bold text-[var(--ink)]">
          {toast}
        </div>
      )}

      {/* Mobile Ergonomic Navigation Dock */}
      <MobileDock
        activeTab={mobileTab}
        onTabChange={(tab) => setMobileTab(tab as any)}
        onOpenAssetSheet={() => setShowAssetSheet(true)}
        onOpenTradeSheet={() => setShowTradeSheet(true)}
        activeCount={liveActivePlays.length}
      />

      {/* Mobile Drawer Bottom Sheet for Asset Browser */}
      {showAssetSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 lg:hidden">
          <div className="relative max-h-[80vh] w-full rounded-t-lg border-t border-[var(--hair)] bg-[var(--card)] p-4 overflow-y-auto">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--hair)]" />
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hair)] mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Select Asset</h3>
              <button onClick={() => setShowAssetSheet(false)} className="text-xs text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] transition-colors">✕ Close</button>
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 lg:hidden">
          <div className="relative w-full rounded-t-lg border-t border-[var(--hair)] bg-[var(--card)] p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--hair)]" />
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hair)] mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">10-Second Order</h3>
              <button onClick={() => setShowTradeSheet(false)} className="text-xs text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] transition-colors">✕ Close</button>
            </div>
            <TradingTicket
              asset={selectedAsset}
              amount={amount}
              onAmountChange={setAmount}
              onBet={(dir) => {
                void handleBet(dir);
                setShowTradeSheet(false);
              }}
              disabled={!realTrade.currentPrice || settling || account.placing}
              activeCount={liveActivePlays.length}
              maxPositions={8}
              betFlash={betFlash}
            />
          </div>
        </div>
      )}
    </div>
  );
}
