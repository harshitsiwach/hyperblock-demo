"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Direction, Play } from "@/app/lib/domain";
import { createMockPlay, settleMockPlay, updateMockPlayLive, MOCK_MAX_POSITIONS } from "@/app/lib/mock/engine";
import { addRealBalance, getRealBalance, getRealPlays, setRealPlays, updateRealStreak } from "@/app/lib/real/storage";
import { HYPERLIQUID_MAINNET_WS, useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { SUPPORTED_ASSETS } from "@/app/components/asset-selector";

/**
 * REAL world trading hook — isolated from demo.
 * Uses Hyperliquid MAINNET WS (wss://api.hyperliquid.xyz/ws), graph driven from WS, same design.
 * Storage keys hyperblock:real:* — never touches hyperblock:mock:*.
 */
import { getMarketBasePrice } from "@/app/lib/markets";

export function useRealTrading(selectedMarketId: number) {
  const [balance, setBalance] = useState(0);
  const [plays, setPlays] = useState<Play[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [lastSettlement, setLastSettlement] = useState<{ play: Play; profit: number } | null>(null);
  const prices = useHyperliquidPrices(SUPPORTED_ASSETS.map((a) => a.symbol), HYPERLIQUID_MAINNET_WS);
  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId);
  const basePrice = selectedAsset ? getMarketBasePrice(selectedAsset.symbol) : 100;
  const wsPrice = selectedAsset ? prices.get(selectedAsset.symbol)?.price : null;
  const currentPrice = wsPrice ?? basePrice;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setBalance(getRealBalance());
    setPlays(getRealPlays() as Play[]);
    const onBal = (e: Event) => setBalance((e as CustomEvent).detail ?? getRealBalance());
    const onStorage = () => {
      setBalance(getRealBalance());
      setPlays(getRealPlays() as Play[]);
    };
    window.addEventListener("real-balance-change", onBal as any);
    window.addEventListener("storage", onStorage);
    const iv = setInterval(() => {
      setBalance(getRealBalance());
      setPlays(getRealPlays() as Play[]);
    }, 500);
    return () => {
      window.removeEventListener("real-balance-change", onBal as any);
      window.removeEventListener("storage", onStorage);
      clearInterval(iv);
    };
  }, []);

  const persist = useCallback((next: Play[]) => {
    setPlays(next);
    setRealPlays(next);
  }, []);

  useEffect(() => {
    if (plays.length === 0) return;
    let changed = false;
    let bonus = 0;
    let settled: Play | null = null;
    let settledProfit = 0;

    const next = plays.map((play) => {
      const asset = SUPPORTED_ASSETS.find((a) => a.marketId === play.marketId);
      const symbol = asset?.symbol ?? "BTC";
      const wsPrice = prices.get(symbol)?.price ?? null;
      const base = wsPrice ?? getMarketBasePrice(symbol);

      // Calculate continuous deterministic price ticks during active bet
      const elapsedSec = Math.max(0, now - play.openedAt) / 1000;
      const wave = Math.sin(elapsedSec * 2.5) * (base * 0.0008);
      const livePrice = Number((base + wave).toFixed(2));

      if (now < play.expiresAt) {
        const updated = updateMockPlayLive(play, livePrice, now);
        if (updated !== play) changed = true;
        return updated;
      }
      if (["active", "settling", "refunding"].includes(play.status)) {
        const { play: settledPlay, payoutUsd } = settleMockPlay(play, livePrice, now);
        if (settledPlay.status !== play.status) {
          changed = true;
          bonus += payoutUsd;
          settled = settledPlay;
          settledProfit = (settledPlay.liveProfitUsd ?? 0);
          return settledPlay;
        }
      }
      return play;
    });

    if (bonus > 0) {
      const newBal = addRealBalance(bonus);
      setBalance(newBal);
      if (settled !== null) {
        const won = (settled as Play).status === "won";
        const streakInfo = updateRealStreak(won);
        (settled as any).streak = streakInfo.streak;
        (settled as any).isNewBest = streakInfo.isNewBest;
        setLastSettlement({ play: settled, profit: settledProfit });
        try {
          if (won) {
            navigator.vibrate?.([30, 50, 30, 80]);
            const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type = "sine"; o.frequency.value = 880 + Math.min(streakInfo.streak * 30, 300);
            o.connect(g); g.connect(ac.destination);
            g.gain.setValueAtTime(0.14, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
            o.start(); o.stop(ac.currentTime + 0.6);
          } else {
            navigator.vibrate?.([40, 80]);
          }
        } catch {}
      }
      setTimeout(() => setLastSettlement(null), 3600);
    }
    if (bonus === 0 && plays.some((p, i) => next[i]?.status !== p.status)) {
      const justSettled = next.find((p, i) => p.status !== plays[i]?.status && ["won", "lost", "breakeven", "refunded"].includes(p.status));
      if (justSettled) {
        const won = justSettled.status === "won";
        updateRealStreak(won);
        setLastSettlement({ play: justSettled, profit: (justSettled as any).liveProfitUsd ?? 0 });
        setTimeout(() => setLastSettlement(null), 3200);
      }
    }
    if (changed) persist(next);
  }, [now, prices, plays, persist]);

  const canBet = useMemo(() => plays.filter((p) => ["active", "settling", "refunding"].includes(p.status)).length < MOCK_MAX_POSITIONS, [plays]);

  const placeBet = useCallback(
    (direction: Direction, amount: number) => {
      if (!selectedAsset) return { ok: false, reason: "No asset" } as const;
      if (!Number.isFinite(amount) || amount < 1 || amount > 1000) return { ok: false, reason: "Amount 1-1000" } as const;
      if (balance < amount) return { ok: false, reason: "Insufficient real balance — claim funds" } as const;
      const price = currentPrice;
      if (!price || !Number.isFinite(price)) return { ok: false, reason: "Price connecting…" } as const;
      const activeCount = plays.filter((p) => ["active", "settling", "refunding"].includes(p.status)).length;
      if (activeCount >= MOCK_MAX_POSITIONS) return { ok: false, reason: `Max ${MOCK_MAX_POSITIONS} positions` } as const;
      const newBal = addRealBalance(-amount);
      setBalance(newBal);
      const play = createMockPlay({
        marketId: selectedAsset.marketId,
        direction,
        collateralUsd: amount,
        entryPrice: price,
        now: Date.now(),
      });
      const next = [play, ...plays].slice(0, 20);
      persist(next);
      try {
        navigator.vibrate?.(12);
        const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = "sine"; o.frequency.value = direction === "up" ? 660 : 440;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.08, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
        o.start(); o.stop(ac.currentTime + 0.22);
      } catch {}
      return { ok: true, play } as const;
    },
    [selectedAsset, balance, prices, plays, persist],
  );

  const activePlays = useMemo(() => plays.filter((p) => ["active", "settling", "refunding"].includes(p.status)), [plays]);
  const historyPlays = useMemo(() => plays.filter((p) => ["won", "lost", "breakeven", "refunded"].includes(p.status)), [plays]);

  return {
    balance,
    plays,
    activePlays,
    historyPlays,
    placeBet,
    canBet,
    currentPrice,
    lastSettlement,
    now,
    prices,
    selectedAsset,
  };
}
