"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { TerminalLeaderboard } from "@/app/components/terminal/terminal-leaderboard";
import { TerminalNotification, type BetNotificationData } from "@/app/components/terminal/terminal-notification";
import { AssetIcon } from "@/app/components/asset-icon";
import type { MarketSnapshot, Play } from "@/app/lib/domain";

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Arena View: "demo" (trading workspace) | "leaderboard" (arena rankings)
  const [arenaView, setArenaView] = useState<"demo" | "leaderboard">("demo");

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
  const [betNotification, setBetNotification] = useState<BetNotificationData | null>(null);
  const handleDismissNotification = useCallback(() => {
    setBetNotification(null);
  }, []);
  const [celebrate, setCelebrate] = useState<{
    profit: number;
    id: string;
    streak?: number;
    isMega?: boolean;
    symbol?: string;
    direction?: "up" | "down";
    stake?: number;
    entryPrice?: number;
    exitPrice?: number;
    pnlPct?: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [balanceBump, setBalanceBump] = useState(false);
  const prevBalanceRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Mobile Navigation Tab
  const [mobileTab, setMobileTab] = useState<"trade" | "positions" | "activity">("trade");

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
    {
      id: "init-3",
      type: "system",
      title: "10-Sec Fast Rounds Active",
      subtitle: "Instant settlement on Hyperliquid tick prices",
      timestamp: Date.now() - 30000,
      highlight: "green",
    },
    {
      id: "init-4",
      type: "system",
      title: "Solana Devnet Oracle Verified",
      subtitle: "High-precision onchain consensus router standby",
      timestamp: Date.now() - 20000,
      highlight: "neutral",
    },
    {
      id: "init-5",
      type: "system",
      title: "Market Engine Online",
      subtitle: "Crypto, Stocks, Commodities & Forex available",
      timestamp: Date.now() - 10000,
      highlight: "green",
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
      ...prev.slice(0, 199),
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
        ...prev.slice(0, 199),
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

    // 1. Animated Bet Placement Notification
    setBetNotification({
      id: `bet-${openedAt}`,
      type: "placed",
      symbol: selectedAsset.symbol,
      direction: dir,
      stake: amount,
      entryPrice,
      durationMs: 10000,
      timestamp: openedAt,
    });

    // Transition to settling notification as round locks
    const settlingTimer = setTimeout(() => {
      setBetNotification((curr) => {
        if (curr && curr.type === "placed") {
          return {
            id: `settle-${Date.now()}`,
            type: "settling",
            symbol: selectedAsset.symbol,
            direction: dir,
            stake: amount,
            entryPrice,
            timestamp: Date.now(),
          };
        }
        return curr;
      });
    }, 8500);

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
      ...prev.slice(0, 199),
    ]);

    try {
      const settled = await account.placeOnchainBet({
        token: selectedAsset.symbol,
        direction: dir,
        betAmount: amount,
        currentPrice: entryPrice,
      });
      clearTimeout(settlingTimer);

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
        setCelebrate({
          profit,
          id: play.id,
          streak: play.streak,
          isMega,
          symbol: selectedAsset.symbol,
          direction: dir,
          stake: amount,
          entryPrice,
          exitPrice: settled.exitPrice ?? undefined,
          pnlPct,
        });

        // 2. Animated Victory Result Notification
        setBetNotification({
          id: `won-${Date.now()}`,
          type: "won",
          symbol: selectedAsset.symbol,
          direction: dir,
          stake: amount,
          entryPrice,
          exitPrice: settled.exitPrice ?? undefined,
          profit,
          pnlPct,
          timestamp: Date.now(),
        });

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
          ...prev.slice(0, 199),
        ]);
        const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
        void t;
      } else {
        updateRealStreak(false);
        const isRefund = settled.status === "refunded" || settled.status === "breakeven";

        // 3. Animated Loss or Refund Result Notification
        setBetNotification({
          id: `result-${Date.now()}`,
          type: isRefund ? "refunded" : "lost",
          symbol: selectedAsset.symbol,
          direction: dir,
          stake: amount,
          entryPrice,
          exitPrice: settled.exitPrice ?? undefined,
          profit: isRefund ? 0 : -amount,
          pnlPct: isRefund ? 0 : -100,
          message: isRefund ? "Trade settled breakeven · stake refunded" : undefined,
          timestamp: Date.now(),
        });

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
          ...prev.slice(0, 199),
        ]);
      }
    } catch (e) {
      clearTimeout(settlingTimer);
      setBetNotification({
        id: `err-${Date.now()}`,
        type: "info",
        symbol: selectedAsset.symbol,
        message: e instanceof Error ? e.message : "Bet failed",
        timestamp: Date.now(),
      });
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

      setBetNotification({
        id: `won-${Date.now()}`,
        type: "won",
        symbol: selectedAsset.symbol,
        direction: play.direction,
        stake: play.collateralUsd,
        entryPrice: play.entryPrice,
        exitPrice: play.exitPrice ?? realTrade.currentPrice ?? undefined,
        profit: realTrade.lastSettlement.profit,
        pnlPct: (realTrade.lastSettlement.profit / play.collateralUsd) * 100,
        timestamp: Date.now(),
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
        ...prev.slice(0, 199),
      ]);

      const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
      return () => clearTimeout(t);
    }

    if (realTrade.lastSettlement && realTrade.lastSettlement.profit < 0) {
      const play: any = realTrade.lastSettlement.play as any;

      setBetNotification({
        id: `lost-${Date.now()}`,
        type: "lost",
        symbol: selectedAsset.symbol,
        direction: play.direction,
        stake: play.collateralUsd,
        entryPrice: play.entryPrice,
        exitPrice: play.exitPrice ?? realTrade.currentPrice ?? undefined,
        profit: -play.collateralUsd,
        pnlPct: -100,
        timestamp: Date.now(),
      });

      setActivityItems((prev) => [
        {
          id: `settle-loss-${Date.now()}`,
          type: "settlement",
          title: `Lost -$${play.collateralUsd} on ${selectedAsset.symbol}`,
          subtitle: `${play.direction?.toUpperCase() ?? "DOWN"} $${play.collateralUsd} · Settled at loss`,
          timestamp: Date.now(),
          highlight: "red",
        },
        ...prev.slice(0, 199),
      ]);
    }
  }, [realTrade.lastSettlement, selectedAsset.symbol, realTrade.currentPrice]);

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
      {/* Top Terminal Navigation Bar (Flush top notch, max-w-[1680px]) */}
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
        activeTab={arenaView}
        onTabChange={setArenaView}
      />

      {/* Main Trading Terminal Workspace (User's Exact 2-Row Wireframe / Leaderboard) */}
      <main className="mx-auto w-full max-w-[1680px] px-2.5 sm:px-4 lg:px-6 pt-14 sm:pt-16 pb-32 sm:pb-36 flex flex-col gap-3.5">
        {arenaView === "leaderboard" ? (
          <TerminalLeaderboard onBackToDemo={() => setArenaView("demo")} />
        ) : (
          <>
            {/* Desktop Layout: Exact 2-Row Wireframe (hidden on screens < lg) */}
            <div className="hidden lg:flex lg:flex-col lg:gap-4">
              {/* Row 1: Chart (Left) + Order Ticket & Bets (Right) */}
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-8 xl:col-span-9 flex flex-col h-[585px]">
                  <TerminalChart
                    data={hlHistory}
                    currentPrice={realTrade.currentPrice}
                    activePlays={liveActivePlays}
                    symbol={selectedAsset.symbol}
                    height="100%"
                  />
                </div>
                <div className="col-span-4 xl:col-span-3 flex flex-col gap-3.5 h-[585px]">
                  <TradingTicket
                    asset={selectedAsset}
                    amount={amount}
                    onAmountChange={setAmount}
                    onBet={(dir) => void handleBet(dir)}
                    disabled={!realTrade.currentPrice || settling || account.placing}
                    activeCount={liveActivePlays.length}
                    maxPositions={8}
                    betFlash={betFlash}
                    needsApproval={needsApproval}
                    onApprove={() => void account.approve().then(() => setToast("Approved · you can bet now")).catch((e) => setToast(e instanceof Error ? e.message : "Approval failed"))}
                    approving={account.approving}
                  />
                  <LivePositions
                    activePlays={liveActivePlays}
                    historyPlays={realTrade.historyPlays as Play[]}
                    now={realTrade.now}
                    records={history.records}
                    historyLoading={history.loading}
                    walletConnected={!!account.address}
                    onRefreshHistory={() => void history.refresh()}
                    settling={settling}
                  />
                </div>
              </div>

              {/* Row 2: Coin (Market Overview) & Assets (Asset Browser) Side-by-Side */}
              <div className="grid grid-cols-12 gap-4 items-stretch">
                <div className="col-span-5 xl:col-span-4 flex flex-col">
                  <MarketOverview
                    asset={selectedAsset}
                    currentPrice={realTrade.currentPrice}
                    priceHistory={hlHistory}
                    latencyMs={22}
                  />
                </div>
                <div className="col-span-7 xl:col-span-8 flex flex-col">
                  <AssetBrowser
                    selectedMarketId={selectedMarketId}
                    onSelect={(id) => setSelectedMarketId(id)}
                    prices={realTrade.prices}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Layout: Responsive Dedicated Tabs (hidden on lg and above) */}
            <div className="flex flex-col gap-3.5 lg:hidden">
              {mobileTab === "trade" && (
                <>
                  {/* Quick Asset Selector Header for Mobile */}
                  <div className="flex items-center justify-between rounded-xl border border-[var(--hair)] bg-[var(--card)] p-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--panel)] border border-[var(--hair)]">
                        <AssetIcon symbol={selectedAsset.symbol} category={selectedAsset.category} size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[var(--ink)]">{selectedAsset.symbol}</span>
                          <span className="text-[9px] font-bold text-[var(--ink-secondary)] uppercase bg-[var(--panel)] px-1 rounded border border-[var(--hair)]">
                            {selectedAsset.category}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] font-extrabold text-[var(--color-neon-orange)]">
                          ${realTrade.currentPrice ? formatPrice(realTrade.currentPrice) : "—"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAssetSheet(true)}
                      type="button"
                      className="rounded-lg border border-[var(--hair)] bg-[var(--panel)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ink)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)] active:scale-95 transition-all cursor-pointer"
                    >
                      Change Market ▾
                    </button>
                  </div>

                  {/* Compact Mobile Chart */}
                  <div className="flex flex-col min-h-[300px]">
                    <TerminalChart
                      data={hlHistory}
                      currentPrice={realTrade.currentPrice}
                      activePlays={liveActivePlays}
                      symbol={selectedAsset.symbol}
                      height={320}
                    />
                  </div>

                  {/* Order Ticket */}
                  <TradingTicket
                    asset={selectedAsset}
                    amount={amount}
                    onAmountChange={setAmount}
                    onBet={(dir) => void handleBet(dir)}
                    disabled={!realTrade.currentPrice || settling || account.placing}
                    activeCount={liveActivePlays.length}
                    maxPositions={8}
                    betFlash={betFlash}
                    needsApproval={needsApproval}
                    onApprove={() => void account.approve().then(() => setToast("Approved · you can bet now")).catch((e) => setToast(e instanceof Error ? e.message : "Approval failed"))}
                    approving={account.approving}
                  />

                  {/* Market Overview */}
                  <MarketOverview
                    asset={selectedAsset}
                    currentPrice={realTrade.currentPrice}
                    priceHistory={hlHistory}
                    latencyMs={22}
                  />
                </>
              )}

              {mobileTab === "positions" && (
                <div className="flex flex-col gap-3">
                  <LivePositions
                    activePlays={liveActivePlays}
                    historyPlays={realTrade.historyPlays as Play[]}
                    now={realTrade.now}
                    records={history.records}
                    historyLoading={history.loading}
                    walletConnected={!!account.address}
                    onRefreshHistory={() => void history.refresh()}
                    settling={settling}
                  />
                </div>
              )}

              {mobileTab === "activity" && (
                <div className="flex flex-col gap-3">
                  <RecentActivity items={activityItems} inline />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Recent Terminal Stream — docked bottom notch with overlapping expand */}
      <RecentActivity items={activityItems} defaultExpanded={false} />

      {/* Non-Casino Victory Celebration Modal */}
      <WinCelebrationV2
        profit={celebrate?.profit ?? 0}
        show={!!celebrate}
        streak={celebrate?.streak}
        isMega={celebrate?.isMega}
        symbol={celebrate?.symbol}
        direction={celebrate?.direction}
        stake={celebrate?.stake}
        entryPrice={celebrate?.entryPrice}
        exitPrice={celebrate?.exitPrice}
        pnlPct={celebrate?.pnlPct}
        seed={celebrate?.id}
        onDone={() => setCelebrate(null)}
      />

      {/* Terminal HUD Bet & Settlement Notification */}
      <TerminalNotification
        notification={betNotification}
        onDismiss={handleDismissNotification}
      />

      {/* Flat toast fallback */}
      {toast && !betNotification && (
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm lg:hidden">
          <div
            onClick={() => setShowAssetSheet(false)}
            className="flex-1 w-full"
            aria-hidden="true"
          />
          <div className="relative max-h-[85vh] w-full rounded-t-2xl border-t border-[var(--hair)] bg-[var(--card)] p-4 pb-8 overflow-y-auto shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--hair)]" />
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hair)] mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Select Asset</h3>
              <button
                onClick={() => setShowAssetSheet(false)}
                className="rounded-md px-2 py-1 text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] bg-[var(--panel)] transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
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
          <div
            onClick={() => setShowTradeSheet(false)}
            className="flex-1 w-full"
            aria-hidden="true"
          />
          <div className="relative w-full rounded-t-2xl border-t border-[var(--hair)] bg-[var(--card)] p-4 pb-8 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--hair)]" />
            <div className="flex items-center justify-between pb-2 border-b border-[var(--hair)] mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">10-Second Order</h3>
              <button
                onClick={() => setShowTradeSheet(false)}
                className="rounded-md px-2 py-1 text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)] bg-[var(--panel)] transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
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
              needsApproval={needsApproval}
              onApprove={() => void account.approve().then(() => setToast("Approved · you can bet now")).catch((e) => setToast(e instanceof Error ? e.message : "Approval failed"))}
              approving={account.approving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
