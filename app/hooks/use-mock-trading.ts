"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Direction, Play } from "@/app/lib/domain";
import { createMockPlay, settleMockPlay, updateMockPlayLive, MOCK_MAX_POSITIONS } from "@/app/lib/mock/engine";
import { addMockBalance, getMockBalance, getMockPlays, setMockPlays, updateStreak } from "@/app/lib/mock/storage";
import { HYPERLIQUID_MAINNET_WS, useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { SUPPORTED_ASSETS } from "@/app/components/asset-selector";

export function useMockTrading(selectedMarketId: number) {
  const [balance, setBalance] = useState(0);
  const [plays, setPlays] = useState<Play[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [lastSettlement, setLastSettlement] = useState<{ play: Play; profit: number } | null>(null);
  // DEMO now uses REAL mainnet prices (wss://api.hyperliquid.xyz/ws) for convincing showcase — graph driven from WS, isolated storage still mock
  const prices = useHyperliquidPrices(SUPPORTED_ASSETS.map((a) => a.symbol), HYPERLIQUID_MAINNET_WS);
  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId);
  const currentPrice = selectedAsset ? prices.get(selectedAsset.symbol)?.price ?? null : null;

  // tick every 100ms for smooth countdown + 1s settlement check
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // sync balance & plays from storage on mount and via events (claim)
  useEffect(() => {
    setBalance(getMockBalance());
    setPlays(getMockPlays() as Play[]);
    const onBal = (e: Event) => setBalance((e as CustomEvent).detail ?? getMockBalance());
    const onStorage = () => {
      setBalance(getMockBalance());
      setPlays(getMockPlays() as Play[]);
    };
    window.addEventListener("mock-balance-change", onBal as any);
    window.addEventListener("storage", onStorage);
    // also poll for plays changes from other tabs
    const iv = setInterval(() => {
      setBalance(getMockBalance());
      setPlays(getMockPlays() as Play[]);
    }, 500);
    return () => {
      window.removeEventListener("mock-balance-change", onBal as any);
      window.removeEventListener("storage", onStorage);
      clearInterval(iv);
    };
  }, []);

  // Persist plays
  const persist = useCallback((next: Play[]) => {
    setPlays(next);
    setMockPlays(next);
  }, []);

  // Live update + auto-settle every 1s per tick
  useEffect(() => {
    if (plays.length === 0) return;
    let changed = false;
    let bonus = 0;
    let settled: Play | null = null;
    let settledProfit = 0;

    const next = plays.map((play) => {
      const asset = SUPPORTED_ASSETS.find((a) => a.marketId === play.marketId);
      const priceEntry = asset ? prices.get(asset.symbol)?.price : null;
      const livePrice = priceEntry ?? play.entryPrice;
      // if still active, just update live
      if (now < play.expiresAt) {
        const updated = updateMockPlayLive(play, livePrice, now);
        if (updated !== play) changed = true;
        return updated;
      }
      // if expired and not yet settled (won/lost etc), settle now using current price
      if (["active", "settling", "refunding"].includes(play.status)) {
        const { play: settledPlay, payoutUsd } = settleMockPlay(play, livePrice, now);
        if (settledPlay.status !== play.status) {
          changed = true;
          bonus += payoutUsd;
          settled = settledPlay;
          settledProfit = (settledPlay.liveProfitUsd ?? 0);
          // payout already includes stake, but we deducted stake at bet time, so add full payout
          return settledPlay;
        }
      }
      return play;
    });

    if (bonus > 0) {
      const newBal = addMockBalance(bonus);
      setBalance(newBal);
      if (settled !== null) {
        const won = (settled as Play).status === "won";
        const streakInfo = updateStreak(won);
        // add streak info to settlement for celebration
        (settled as any).streak = streakInfo.streak;
        (settled as any).isNewBest = streakInfo.isNewBest;
        setLastSettlement({ play: settled, profit: settledProfit });
        // haptic + sound for win/loss
        try {
          if (won) {
            navigator.vibrate?.([30, 50, 30, 80]);
            // win sound
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
      // auto-clear toast after 3.5s
      setTimeout(() => setLastSettlement(null), 3600);
    }
    // also handle non-bonus settle (breakeven) still update streak
    if (bonus === 0 && plays.some((p, i) => next[i]?.status !== p.status)) {
      const justSettled = next.find((p, i) => p.status !== plays[i]?.status && ["won", "lost", "breakeven", "refunded"].includes(p.status));
      if (justSettled) {
        const won = justSettled.status === "won";
        updateStreak(won);
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
      if (balance < amount) return { ok: false, reason: "Insufficient demo balance — claim funds" } as const;
      const price = prices.get(selectedAsset.symbol)?.price;
      if (!price || !Number.isFinite(price)) return { ok: false, reason: "Price connecting…" } as const;
      const activeCount = plays.filter((p) => ["active", "settling", "refunding"].includes(p.status)).length;
      if (activeCount >= MOCK_MAX_POSITIONS) return { ok: false, reason: `Max ${MOCK_MAX_POSITIONS} positions` } as const;

      // deduct immediately for satisfying feel
      const newBal = addMockBalance(-amount);
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

      // haptic + tick sound
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
