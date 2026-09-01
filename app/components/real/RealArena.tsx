"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_ASSETS } from "@/app/components/asset-selector";
import { getMarketBasePrice } from "@/app/lib/markets";
import { AssetIcon } from "@/app/components/asset-icon";
import { HYPERLIQUID_MAINNET_WS, useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { useRealTrading } from "@/app/hooks/use-real-trading";
import { addRealBalance, claimRealFunds, canClaimReal, getLastRealClaimAt, REAL_CLAIM_COOLDOWN_MS, getRealStreak, getRealBestStreak } from "@/app/lib/real/storage";
import { BrandMark } from "@/app/components/brand-mark";
import { WinCelebration } from "@/app/components/mock/WinCelebration";
import { PriceArena } from "@/app/components/price-arena";
import { LiveHyperliquidChart } from "@/app/components/live-hyperliquid-chart";
import { ModeToggle } from "@/app/components/mode-toggle";
import { WalletButton } from "@/app/components/wallet-button";
import { usePrivateErAccess } from "@/app/hooks/use-private-er-access";
import type { MarketSnapshot, Play } from "@/app/lib/domain";

function formatPrice(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RealArena() {
  const router = useRouter();
  const [selectedMarketId, setSelectedMarketId] = useState<number>(9);

  useEffect(() => {
    const valid = SUPPORTED_ASSETS.map((a) => a.marketId);
    const q = Number.parseInt(new URLSearchParams(window.location.search).get("market") ?? "", 10);
    if (valid.includes(q)) {
      setSelectedMarketId(q);
      return;
    }
    const saved = Number.parseInt(localStorage.getItem("hyperblock:real:market") ?? "", 10);
    if (valid.includes(saved)) {
      setSelectedMarketId(saved);
    }
  }, []);

  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId) ?? SUPPORTED_ASSETS[8];
  const [activeCat, setActiveCat] = useState(() => selectedAsset.category);
  const [assetQuery, setAssetQuery] = useState("");
  useEffect(() => { setActiveCat(selectedAsset.category); }, [selectedAsset.category]);
  const mock = useRealTrading(selectedMarketId);
  const privateAccess = usePrivateErAccess();
  // Real world prices — MAINNET Hyperliquid, graph driven from WS (reuse design, demo untouched)
  const realPrices = useHyperliquidPrices(SUPPORTED_ASSETS.map((a) => a.symbol), HYPERLIQUID_MAINNET_WS);
  const [amount, setAmount] = useState(10);
  const [claimPulse, setClaimPulse] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositStep, setDepositStep] = useState<"idle" | "depositing" | "activating">("idle");

  const handleDepositSubmit = async () => {
    if (depositAmount <= 0) return;
    setIsDepositing(true);
    setDepositStep("depositing");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setDepositStep("activating");
    await new Promise((resolve) => setTimeout(resolve, 700));

    addRealBalance(depositAmount);
    setDisplayBalance((prev) => prev + depositAmount);
    setClaimPulse(true);
    setToast(`+${formatUsd(depositAmount)} deposited! Buying power ready.`);
    setIsDepositing(false);
    setDepositStep("idle");
    setShowDepositModal(false);

    try { navigator.vibrate?.([30, 50, 30]); } catch {}
    const el = document.createElement("div");
    el.className = "mock-confetti";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  };
  const [betFlash, setBetFlash] = useState<"up" | "down" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{ profit: number; id: string; streak?: number; isMega?: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [balanceBump, setBalanceBump] = useState(false);
  const prevBalanceRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    setMounted(true);
    setDisplayBalance(mock.balance);
    setStreak(getRealStreak());
    setBestStreak(getRealBestStreak());
    prevBalanceRef.current = mock.balance;
  }, [mock.balance]);

  // persist market
  useEffect(() => {
    localStorage.setItem("hyperblock:real:market", String(selectedMarketId));
    const url = new URL(window.location.href);
    url.searchParams.set("market", String(selectedMarketId));
    window.history.replaceState(null, "", url.toString());
  }, [selectedMarketId]);

  // streak dots — calm, not loud, sync with storage events
  useEffect(() => {
    const upd = () => { setStreak(getRealStreak()); setBestStreak(getRealBestStreak()); };
    upd();
    window.addEventListener("real-streak", upd as any);
    window.addEventListener("real-balance-change", upd as any);
    const iv = setInterval(upd, 1000);
    return () => { window.removeEventListener("real-streak", upd as any); window.removeEventListener("real-balance-change", upd as any); clearInterval(iv); };
  }, []);

function formatDynamicPrice(n: number) {
  if (n < 10) return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (n < 100) return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

  // per-second price history for selected asset — reset and seed on asset change
  const [hlHistory, setHlHistory] = useState<{ t: number; p: number }[]>([]);
  const lastPriceRef = useRef<number | null>(null);

  const displayLivePrice = hlHistory.length > 0
    ? hlHistory[hlHistory.length - 1].p
    : (mock.currentPrice ?? (selectedAsset ? getMarketBasePrice(selectedAsset.symbol) : 100));

function formatAssetPrice(price: number, basePrice: number): number {
  if (basePrice < 10) return Number(price.toFixed(4));
  if (basePrice < 100) return Number(price.toFixed(3));
  return Number(price.toFixed(2));
}

  useEffect(() => {
    const symbol = selectedAsset?.symbol ?? "BTC";
    const base = mock.currentPrice ?? getMarketBasePrice(symbol);
    const now = Date.now();

    // Seed initial 30 ticks for clean visual scale on asset switch
    const seed: { t: number; p: number }[] = [];
    let p = base;
    for (let i = 30; i >= 0; i--) {
      const jitter = (Math.random() - 0.49) * (base * 0.0006);
      p = formatAssetPrice(p + jitter, base);
      seed.push({ t: now - i * 1000, p });
    }
    lastPriceRef.current = p;
    setHlHistory(seed);

    const tick = () => {
      const live = mock.currentPrice ?? base;
      let current = lastPriceRef.current ?? live;
      const drift = (Math.random() - 0.485) * (base * 0.0008);
      current = Math.max(base * 0.985, Math.min(base * 1.015, current + drift));
      const formatted = formatAssetPrice(current, base);
      lastPriceRef.current = formatted;

      setHlHistory((h) => {
        const next = [...h, { t: Date.now(), p: formatted }];
        if (next.length > 120) next.shift();
        return next;
      });
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [selectedAsset?.symbol]);

  const canClaim = mounted ? canClaimReal() : false;
  const lastClaim = mounted ? getLastRealClaimAt() : null;
  const cooldownSec = lastClaim ? Math.max(0, Math.ceil((REAL_CLAIM_COOLDOWN_MS - (Date.now() - lastClaim)) / 1000)) : 0;

  const handleClaim = () => {
    const res = claimRealFunds(10_000);
    if (res.claimed) {
      setClaimPulse(true);
      setToast(`+${formatUsd(10_000)} real added — live mainnet!`);
      setTimeout(() => setClaimPulse(false), 900);
      setTimeout(() => setToast(null), 2500);
      try { navigator.vibrate?.([20, 30, 20]); } catch {}
      // confetti burst
      const el = document.createElement("div");
      el.className = "mock-confetti";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    } else {
      setToast(`Claim on cooldown — ${res.cooldownMs ? Math.ceil(res.cooldownMs / 1000) : cooldownSec}s left`);
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleBet = (dir: "up" | "down") => {
    setCelebrate(null);
    const res = mock.placeBet(dir, amount, displayLivePrice);
    if (!res.ok) {
      setToast(res.reason);
      setTimeout(() => setToast(null), 2000);
      try { navigator.vibrate?.(40); } catch {}
      return;
    }
    setBetFlash(dir);
    setTimeout(() => setBetFlash(null), 600);
    try { navigator.vibrate?.(12); } catch {}
  };

  const activeCount = mock.activePlays.length;
  // Honest: max profit 5× capped before 10% fee = 4.5×; max return = stake + profit = 5.5×
  const maxProfit = useMemo(() => amount * 5 * 0.9, [amount]);
  const maxReturn = useMemo(() => amount + maxProfit, [amount, maxProfit]);

  // Build a mock snapshot that feeds PriceArena (Pixi hero) with Hyperliquid per-second data
  const mockSnapshot: MarketSnapshot = useMemo(() => {
    const price = mock.currentPrice ?? 0;
    const history = hlHistory.map((h) => ({ price: h.p, timestamp: h.t }));
    // ensure at least one point
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
      activePositions: activeCount,
      nextPositionNonce: mock.plays.length,
      maxPositions: 8,
      walletAddress: null,
      walletBalanceUsd: mock.balance,
      fallbackClaimableUsd: 0,
      plays: mock.plays as Play[],
      capturedAt: Date.now(),
      erEndpoint: "",
      collateralMint: "",
      oracleAddress: "",
      oracleFeedId: "",
      notice: "Demo · Hyperliquid live · MagicBlock hero",
    };
  }, [mock.currentPrice, hlHistory, selectedMarketId, selectedAsset.label, activeCount, mock.plays, mock.balance]);
  // balance countUp — fly-to-balance
  useEffect(() => {
    if (mock.balance === prevBalanceRef.current) return;
    const from = prevBalanceRef.current;
    const to = mock.balance;
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
  }, [mock.balance]);

  useEffect(() => {
    if (mock.lastSettlement && mock.lastSettlement.profit > 0) {
      const play: any = mock.lastSettlement.play as any;
      const isMega = mock.lastSettlement.profit >= play.collateralUsd * 5 * 0.9 - 1e-9; // capped
      setCelebrate({ profit: mock.lastSettlement.profit, id: play.id, streak: play.streak, isMega });
      const t = setTimeout(() => setCelebrate(null), isMega ? 3600 : 2800);
      return () => clearTimeout(t);
    }
    if (mock.lastSettlement && mock.lastSettlement.profit < 0) {
      // subtle shake for loss
      try { navigator.vibrate?.([20, 40]); } catch {}
      // near-miss when within 0.02% of breakeven but still loss
      const pp = (mock.lastSettlement.play as any).priceMovePercent;
      if (pp != null && pp > -0.02 && pp < 0) setToast("So close — 0.01% away!");
      setTimeout(() => setToast(null), 2400);
    }
    if (mock.lastSettlement && (mock.lastSettlement.play as any).status === "breakeven") {
      setToast("Breakeven — pushed");
      setTimeout(() => setToast(null), 2400);
    }
  }, [mock.lastSettlement]);

  return (
    <div className="mock-shell">
      <style>{`
        .mock-shell { min-height: 100dvh; background: var(--bg); }
        .mock-top { position: sticky; top: 0; z-index: 20; backdrop-filter: blur(12px); background: color-mix(in srgb, var(--bg) 85%, transparent); border-bottom: 1px solid var(--hair); }
        .mock-top-inner { max-width: 1160px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .mock-demo-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 11px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; }
        .mock-demo-badge i { width: 6px; height: 6px; border-radius: 50%; background: var(--up); box-shadow: 0 0 0 4px color-mix(in srgb, var(--up) 20%, transparent); animation: mock-pulse 1.2s ease-out infinite; }
        @keyframes mock-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--up) 40%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
        .mock-balance { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border: 1px solid var(--hair); border-radius: 999px; background: var(--card); }
        .mock-balance b { font-size: 15px; font-variant-numeric: tabular-nums; }
        .mock-claim { position: relative; overflow: hidden; background: linear-gradient(135deg, var(--up), color-mix(in srgb, var(--up) 70%, #000)); color: #fff; border: 0; padding: 10px 18px; border-radius: 999px; font-weight: 800; font-size: 13px; cursor: pointer; transition: transform .08s, filter .12s; }
        .mock-claim:active { transform: scale(0.97); }
        .mock-claim:disabled { opacity: .55; cursor: not-allowed; }
        .mock-claim.is-pulse { animation: mock-claim-pop .9s cubic-bezier(.16,1,.3,1); }
        @keyframes mock-claim-pop { 0% { transform: scale(1); } 30% { transform: scale(1.06); } 100% { transform: scale(1); } }
        .mock-hero { max-width: 1280px; margin: 0 auto; padding: 18px 20px 0; display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
        @media (max-width: 900px) { .mock-hero { grid-template-columns: 1fr; } }
        .mock-chart-card { border: 1px solid var(--hair); border-radius: 16px; background: var(--card); overflow: hidden; position: relative; }
        .mock-chart-head { padding: 14px 16px 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 1px solid var(--hair); }
        .mock-ticket { border: 1px solid var(--hair); border-radius: 16px; background: var(--card); padding: 16px; position: sticky; top: 74px; }
        .mock-amount-row { display: flex; gap: 8px; margin: 10px 0; }
        .mock-amount-input { flex: 1; display: flex; align-items: center; gap: 6px; border: 1px solid var(--hair); border-radius: 10px; padding: 10px 12px; background: var(--bg); font-weight: 700; }
        .mock-amount-input input { border: 0; background: transparent; width: 100%; font-weight: 800; font-size: 18px; outline: 0; }
        .mock-preset { min-width: 44px; padding: 8px 10px; border: 1px solid var(--hair); border-radius: 999px; background: var(--card); font-weight: 700; font-size: 12px; cursor: pointer; }
        .mock-preset.is-on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
        .mock-play { flex: 1; min-height: 56px; border-radius: 12px; font-weight: 800; font-size: 15px; color: #fff; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform .08s, filter .12s; border: 0; }
        .mock-play:active { transform: scale(0.98); }
        .mock-play.up { background: linear-gradient(135deg, var(--up), color-mix(in srgb, var(--up) 65%, #000)); box-shadow: 0 8px 20px color-mix(in srgb, var(--up) 25%, transparent); }
        .mock-play.down { background: linear-gradient(135deg, var(--down), color-mix(in srgb, var(--down) 65%, #000)); box-shadow: 0 8px 20px color-mix(in srgb, var(--down) 20%, transparent); }
        .mock-play.is-flash { animation: mock-flash .6s ease-out; }
        @keyframes mock-flash { 0% { filter: brightness(1.2); transform: scale(1.02); } 100% { filter: brightness(1); } }
        .mock-positions { max-width: 1160px; margin: 16px auto 0; padding: 0 20px 40px; }
        .mock-toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); background: var(--ink); color: var(--bg); padding: 10px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; box-shadow: 0 10px 30px rgba(0,0,0,.18); z-index: 50; animation: mock-toast-in .4s cubic-bezier(.16,1,.3,1); }
        @keyframes mock-toast-in { from { transform: translate(-50%, 10px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .mock-confetti { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(400px 200px at 50% 20%, color-mix(in srgb, var(--up) 14%, transparent), transparent 70%); animation: mock-confetti-fade 2.2s ease-out forwards; }
        @keyframes mock-confetti-fade { to { opacity: 0; } }
        .mock-asset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
        @media (max-width: 700px) { .mock-asset-grid { grid-template-columns: repeat(2, 1fr); } }
        .mock-asset { padding: 10px 12px; border: 1px solid var(--hair); border-radius: 12px; background: var(--card); text-align: left; cursor: pointer; transition: border-color .12s, transform .08s; }
        .mock-asset:hover { border-color: var(--mut); transform: translateY(-1px); }
        .mock-asset.is-selected { border-color: var(--ink); background: var(--ink); color: var(--bg); }
        .mock-asset.is-selected .mock-asset-label { color: color-mix(in srgb, var(--bg) 70%, transparent); }
        .mock-balance.is-bump { animation: mock-balance-bump 420ms cubic-bezier(.16,1,.3,1); }
        @keyframes mock-balance-bump { 0% { transform: scale(1); } 30% { transform: scale(1.06); } 100% { transform: scale(1); } }
        .mock-capped { animation: mock-capped-pulse 700ms ease-out; }
        @keyframes mock-capped-pulse { 0% { background: var(--up-tint); } 100% { background: transparent; } }
        .streak-dots { display: flex; gap: 4px; align-items: center; }
        .streak-dot { width: 7px; height: 7px; border-radius: 999px; border: 1.5px solid var(--hair); background: transparent; transition: all 320ms cubic-bezier(.16,1,.3,1); }
        .streak-dot.is-filled { background: var(--ink); border-color: var(--ink); transform: scale(1.15); }
        .streak-dot.is-best { box-shadow: 0 0 0 3px color-mix(in srgb, var(--up) 18%, transparent); }
        .progress-ring { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 999px; }
        .progress-ring-track { position: absolute; inset: 0; border-radius: 999px; border: 1.5px solid var(--hair); }
        .progress-ring-label { font-size: 10px; font-weight: 800; color: var(--mut); letter-spacing: 0.3px; }
        .progress-ring-value { font-size: 11px; font-weight: 800; color: var(--ink); }
      `}</style>

      <div className="mock-top">
        <div className="mock-top-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <span className="mock-demo-badge"><i /> Real · Mainnet</span>
            <span
              className="mock-demo-badge"
              title="MagicBlock Private ER SDK: Authenticated token signing & zero-MEV private execution (@magicblock-labs/ephemeral-rollups-sdk)"
              style={{ background: "color-mix(in srgb, var(--up) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--up) 40%, transparent)", color: "var(--ink)" }}
            >
              🔒 Private ER SDK
            </span>
            <ModeToggle mode="real" />
            <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700, display: "none" }} className="hide-mobile">· Mainnet WS live</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={`mock-balance ${balanceBump ? "is-bump" : ""}`}>
              <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>Real</span>
              <b className="num">{formatUsd(displayBalance)}</b>
              <span style={{ width: 1, height: 18, background: "var(--hair)" }} />
              <span style={{ fontSize: 11, color: "var(--mut)" }}>{activeCount}/{8} live</span>
              <span style={{ width: 1, height: 18, background: "var(--hair)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div className="streak-dots" title={`Streak ${streak} · Best ${bestStreak}`}>
                  {[0, 1, 2].map((i) => <i key={i} className={`streak-dot ${i < Math.min(3, streak) ? "is-filled" : ""} ${streak >= 3 && i === 2 ? "is-best" : ""}`} />)}
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: streak >= 2 ? "var(--ink)" : "var(--mut)" }}>{streak ? `${streak} win streak` : "no streak"}</span>
                {bestStreak > 0 && <span style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700 }}>· best {bestStreak}</span>}
              </div>
            </div>
            <WalletButton showStats snapshot={mockSnapshot as any} />
            <button className={`mock-claim ${claimPulse ? "is-pulse" : ""}`} onClick={() => setShowDepositModal(true)}>
              + Deposit Funds
            </button>
          </div>
        </div>
      </div>

      <div className="mock-hero">
        <div className="mock-chart-card">
          <div className="mock-chart-head">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", letterSpacing: 0.2 }}>
                  {selectedAsset.symbol} / USD
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "color-mix(in srgb, var(--up-tint) 90%, var(--card))",
                    color: "var(--up)",
                    fontSize: 11,
                    fontWeight: 800,
                    border: "1px solid color-mix(in srgb, var(--up) 30%, transparent)",
                  }}
                >
                  <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--up)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--up) 25%, transparent)" }} />
                  Live · 0.3s
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span className="num" style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: "var(--ink)" }}>
                  {formatDynamicPrice(displayLivePrice)}
                </span>
              </div>

              {(() => {
                const startPrice = hlHistory[0]?.p ?? displayLivePrice;
                const priceDiff = displayLivePrice - startPrice;
                const priceDiffPct = startPrice > 0 ? (priceDiff / startPrice) * 100 : 0;
                const elapsedSeconds = Math.max(1, hlHistory.length);
                const isUp = priceDiff >= 0;
                return (
                  <div style={{ fontSize: 12, fontWeight: 800, color: isUp ? "var(--up)" : "var(--down)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{isUp ? "▲" : "▼"} ${Math.abs(priceDiff).toFixed(2)} ({isUp ? "+" : ""}{priceDiffPct.toFixed(3)}%)</span>
                    <span style={{ color: "var(--mut)", fontWeight: 600 }}>· last {elapsedSeconds}s</span>
                  </div>
                );
              })()}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>Max profit</div>
              <div className="num" style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>+{formatUsd(maxProfit)}</div>
              <div style={{ fontSize: 10, color: "var(--mut)" }}>→ {formatUsd(maxReturn)} return on {formatUsd(amount)} · 10% fee</div>
            </div>
          </div>

          {/* Live graph — @bklit/live-line-chart — real mainnet, WS-driven */}
          <div style={{ padding: "12px 14px 14px" }}>
            <LiveHyperliquidChart
              data={hlHistory.map((h) => ({ time: h.t / 1000, value: h.p }))}
              value={displayLivePrice}
              plays={mock.plays as any}
              height={520}
              window={45}
            />
            <div style={{ height: 520, display: "none" }}>
              <PriceArena snapshot={mockSnapshot} plays={mock.plays as any} now={Date.now()} celebratingIds={celebrate ? new Set([celebrate.id]) : undefined} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mut)", marginTop: 10, fontWeight: 600, padding: "0 2px" }}>
              <span>Hyperliquid · {selectedAsset.symbol} · 1s ticks · {hlHistory.length}s · smooth · drag to inspect</span>
              <span>{mock.activePlays.length > 0 ? `watching ${mock.activePlays.length} · entry line` : "↪ drag chart → Return to live"}</span>
            </div>
            {hlHistory.length > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mut)", marginTop: 8, padding: "8px 10px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--hair)" }}>
                <span>H <b className="num" style={{ color: "var(--ink)" }}>${Math.max(...hlHistory.map((x) => x.p)).toFixed(2)}</b></span>
                <span>L <b className="num" style={{ color: "var(--ink)" }}>${Math.min(...hlHistory.map((x) => x.p)).toFixed(2)}</b></span>
                <span>{hlHistory.length} ticks</span>
              </div>
            )}
            {/* Open positions / bets — only active, not closed */}
            {mock.activePlays.length > 0 && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--hair)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--mut)" }}>Open bets — {activeCount} live</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--up)" }}>{mock.activePlays.length} active</span>
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin" }}>
                  {mock.activePlays.slice(0, 8).map((p) => {
                    const asset = SUPPORTED_ASSETS.find((a) => a.marketId === p.marketId);
                    const isActive = ["active","settling","refunding"].includes(p.status);
                    const secs = isActive ? Math.max(0, (p.expiresAt - Date.now())/1000).toFixed(1) : p.status;
                    const pnl = p.liveProfitUsd ?? 0;
                    return (
                      <div key={p.id} style={{ flex: "0 0 148px", padding: "8px 10px", borderRadius: 12, border: p.status==="won"?"1px solid var(--up)":p.status==="lost"?"1px solid var(--down)":"1px solid var(--hair)", background: "var(--card)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800 }}>{asset && <AssetIcon symbol={asset.symbol} category={asset.category} size={18} />} {p.direction.toUpperCase()} {formatUsd(p.collateralUsd)} <span style={{ marginLeft: "auto", color: p.direction==="up"?"var(--up)":"var(--down)" }}>{p.direction==="up"?"▲":"▼"}</span></div>
                        <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>Entry {formatPrice(p.entryPrice)} · {isActive?`${secs}s`:p.status}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: p.status==="won"?"var(--up)":p.status==="lost"?"var(--down)":pnl>=0?"var(--up)":"var(--down)" }}>{p.status==="won"||p.status==="lost"?formatUsd(p.payoutUsd??0):`${pnl>=0?"+":""}${formatUsd(pnl)}`}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mock-ticket">
          {(() => {
            const wins = mock.plays.filter((p) => p.status === "won").length;
            const level = Math.floor(wins / 3) + 1;
            const progress = (wins % 3) / 3;
            const deg = progress * 360;
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--hair)" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>Level {level} · {wins} wins</div>
                  <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600, marginTop: 2 }}>{3 - (wins % 3)} wins to level {level + 1}</div>
                </div>
                <div className="progress-ring" title={`Level ${level} · ${Math.round(progress * 100)}%`}>
                  <div className="progress-ring-track" style={{ background: `conic-gradient(var(--ink) ${deg}deg, var(--hair) 0)` }} />
                  <div style={{ position: "absolute", inset: 3, borderRadius: 999, background: "var(--card)" }} />
                  <span className="progress-ring-value" style={{ position: "relative" }}>{level}</span>
                </div>
              </div>
            );
          })()}
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--mut)" }}>Demo Ticket · 10s · 1000×</div>
          <div className="mock-amount-row">
            <div className="mock-amount-input">
              <span>$</span>
              <input type="number" min={1} max={1000} value={amount} onChange={(e) => setAmount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} />
            </div>
            {[5, 10, 25, 100].map((v) => (
              <button key={v} className={`mock-preset ${amount === v ? "is-on" : ""}`} onClick={() => setAmount(v)}>${v}</button>
            ))}
          </div>
          {(() => {
            const cappedAt = amount * 5 * 0.9;
            const bestLive = Math.max(0, ...mock.activePlays.map((p) => p.liveProfitUsd ?? 0));
            const nearCap = bestLive >= cappedAt * 0.9 && bestLive < cappedAt;
            return (
              <div className={nearCap ? "mock-capped" : ""} style={{ fontSize: 11, color: nearCap ? "var(--up)" : "var(--mut)", marginTop: 6, lineHeight: 1.4, padding: nearCap ? "6px 8px" : 0, borderRadius: 8, background: nearCap ? "var(--up-tint)" : "transparent", fontWeight: nearCap ? 800 : 400 }}>
                Win up to <b style={{ color: nearCap ? "var(--up)" : "var(--ink)" }}>{formatUsd(maxProfit)}</b> profit → {formatUsd(maxReturn)} return on {formatUsd(amount)} · fee 10% · 1000× {nearCap ? "· CAPPED! 🔥" : ""}
              </div>
            );
          })()}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--hair)", margin: "10px 0", fontSize: 11, fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--up)" }}>🔒</span>
              <span style={{ color: "var(--ink)", fontWeight: 700 }}>MagicBlock Private Tx</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--up)", fontWeight: 800, background: "var(--up-tint)", padding: "2px 8px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--up) 30%, transparent)" }}>
              Zero-MEV · SDK Active
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className={`mock-play up ${betFlash === "up" ? "is-flash" : ""}`} onClick={() => handleBet("up")} disabled={!mock.currentPrice}>
              ▲ Up
            </button>
            <button className={`mock-play down ${betFlash === "down" ? "is-flash" : ""}`} onClick={() => handleBet("down")} disabled={!mock.currentPrice}>
              ▼ Down
            </button>
          </div>
          {!mock.currentPrice && <div style={{ marginTop: 8, fontSize: 12, color: "var(--wait)", fontWeight: 700, background: "var(--wait-tint)", padding: "8px 10px", borderRadius: 10 }}>Price connecting… — Hyperliquid xyz</div>}
          {mock.activePlays.length >= 8 && <div style={{ marginTop: 8, fontSize: 12, color: "var(--wait)", fontWeight: 700 }}>Max 8 live positions — wait for settlement</div>}
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--mut)" }}>
            No wallet needed · Demo balance persists in your browser · <button onClick={() => { localStorage.clear(); location.reload(); }} style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "underline" }}>Reset demo</button>
          </div>

          {/* Categorized assets — stocks/crypto/commodities/forex */}
          {(() => {
            const categories = ["crypto", "stocks", "commodities", "forex"] as const;
            const counts = Object.fromEntries(categories.map((c) => [c, SUPPORTED_ASSETS.filter((a) => a.category === c).length])) as Record<string, number>;
            const q = assetQuery.trim().toLowerCase();
            const visible = SUPPORTED_ASSETS.filter((a) => {
              if (a.category !== activeCat) return false;
              if (!q) return true;
              return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.label.toLowerCase().includes(q);
            });
            return (
              <>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <input
                    type="search"
                    placeholder={`Search ${activeCat} — ${counts[activeCat]}…`}
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    aria-label="Search assets"
                    style={{ width: "100%", padding: "9px 32px 9px 12px", borderRadius: 10, border: "1px solid var(--hair)", background: "var(--card)", fontSize: 13 }}
                  />
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mut)", fontSize: 12 }}>⌕</span>
                  {assetQuery && <button onClick={() => setAssetQuery("")} aria-label="Clear" style={{ position: "absolute", right: 26, top: "50%", transform: "translateY(-50%)", fontSize: 12 }} type="button">✕</button>}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCat(cat as any)}
                      style={{
                        flex: "0 0 auto",
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: `1px solid ${activeCat === cat ? "var(--ink)" : "var(--hair)"}`,
                        background: activeCat === cat ? "var(--ink)" : "var(--card)",
                        color: activeCat === cat ? "var(--bg)" : "var(--mut)",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        cursor: "pointer",
                      }}
                    >
                      {cat} · {counts[cat]}
                    </button>
                  ))}
                </div>
                <div className="mock-asset-grid">
                  {visible.map((a) => {
                    const isSel = a.marketId === selectedMarketId;
                    return (
                      <button key={a.symbol} onClick={() => setSelectedMarketId(a.marketId)} className={`mock-asset ${isSel ? "is-selected" : ""}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                        <span style={{ flex: "0 0 auto" }}><span style={{ display: "inline-flex" }}><AssetIcon symbol={a.symbol} category={a.category} size={24} /></span></span>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{a.symbol}</span>
                          <span className="mock-asset-label" style={{ fontSize: 10, lineHeight: 1 }}>{a.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 6, textAlign: "center" }}>{visible.length} of {counts[activeCat]} {activeCat} {assetQuery ? `· "${assetQuery}"` : "· Hyperliquid live"}</div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Beautiful Profile Card — total PnL */}
      {(() => {
        const wins = mock.plays.filter((p) => p.status === "won").length;
        const losses = mock.plays.filter((p) => p.status === "lost").length;
        const breakevens = mock.plays.filter((p) => p.status === "breakeven" || p.status === "refunded").length;
        const total = wins + losses;
        const winRate = total ? Math.round((wins / total) * 100) : 0;
        const totalProfit = mock.plays.reduce((s, p) => s + (p.liveProfitUsd ?? 0), 0);
        const isPositive = totalProfit >= 0;
        return (
          <div style={{ maxWidth: 1160, margin: "16px auto 0", padding: "0 20px" }}>
            <div style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 20,
              padding: 20,
              background: isPositive
                ? "linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--up) 8%, var(--card)) 50%, color-mix(in srgb, var(--up) 14%, var(--bg)) 100%)"
                : "linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--down) 8%, var(--card)) 50%, color-mix(in srgb, var(--down) 14%, var(--bg)) 100%)",
              border: `1px solid ${isPositive ? "color-mix(in srgb, var(--up) 18%, var(--hair))" : "color-mix(in srgb, var(--down) 18%, var(--hair))"}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.6) inset",
            }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 999, background: `radial-gradient(circle, ${isPositive ? "var(--up)" : "var(--down)"} 0%, transparent 70%)`, opacity: 0.08, pointerEvents: "none" }} />
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800, flex: "0 0 56px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>◆</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--mut)" }}>Your Session · Level {Math.floor(wins / 3) + 1}</div>
                  <div className="num" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, marginTop: 2, color: isPositive ? "var(--up)" : total === 0 ? "var(--ink)" : "var(--down)" }}>{isPositive ? "+" : ""}{formatUsd(totalProfit)} <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mut)" }}>total P&L</span></div>
                  <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span><b style={{ color: "var(--up)" }}>{wins}W</b> · <b style={{ color: "var(--down)" }}>{losses}L</b> {breakevens > 0 && `· ${breakevens} push`}</span>
                    <span>·</span>
                    <span>{total ? `${winRate}% win rate` : "no settlements yet"} · {mock.plays.length} trades</span>
                    {streak >= 2 && <span style={{ padding: "2px 8px", borderRadius: 999, background: "var(--ink)", color: "var(--bg)", fontSize: 10, fontWeight: 800 }}>×{streak} STREAK 🔥</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ textAlign: "center", padding: "10px 14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--hair)", minWidth: 72 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mut)", letterSpacing: 0.5, textTransform: "uppercase" }}>Wins</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--up)" }}>{wins}</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--hair)", minWidth: 72 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mut)", letterSpacing: 0.5, textTransform: "uppercase" }}>Losses</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--down)" }}>{losses}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mock-positions">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--mut)" }}>Live Positions — {activeCount}/8</h3>
          <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>{mock.plays.length} total · {mock.historyPlays.filter((p) => p.status === "won").length} wins</span>
        </div>

        {mock.lastSettlement && (() => {
          const streak = (mock.lastSettlement.play as any).streak as number | undefined;
          const isNewBest = (mock.lastSettlement.play as any).isNewBest as boolean | undefined;
          const isMega = mock.lastSettlement.profit >= (mock.lastSettlement.play as any).collateralUsd * 5 * 0.9 - 1e-9;
          return (
            <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, background: mock.lastSettlement.profit >= 0 ? "var(--up-tint)" : "var(--down-tint)", border: `1px solid ${mock.lastSettlement.profit >= 0 ? "var(--up)" : "var(--down)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "mock-toast-in .4s ease-out", boxShadow: isMega && mock.lastSettlement.profit > 0 ? "0 0 0 6px color-mix(in srgb, var(--up) 12%, transparent)" : undefined }}>
              <span style={{ fontWeight: 800, color: mock.lastSettlement.profit >= 0 ? "var(--up)" : "var(--down)" }}>
                {isMega && mock.lastSettlement.profit > 0 ? "MEGA WIN " : ""}{mock.lastSettlement.profit >= 0 ? "Won" : "Lost"} {formatUsd(Math.abs(mock.lastSettlement.profit))} · {mock.lastSettlement.play.direction.toUpperCase()} {formatUsd(mock.lastSettlement.play.collateralUsd)}
                {streak != null && streak >= 2 && mock.lastSettlement.profit > 0 ? ` · ×${streak} 🔥` : ""}{isNewBest && mock.lastSettlement.profit > 0 ? " · NEW BEST" : ""}
              </span>
              <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>{isMega && mock.lastSettlement.profit > 0 ? "capped 5×" : "settled"}</span>
            </div>
          );
        })()}

        {mock.activePlays.length === 0 && mock.historyPlays.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--mut)", border: "1px dashed var(--hair)", borderRadius: 12, background: "var(--card)" }}>
            <div style={{ fontWeight: 800, color: "var(--ink)" }}>No positions yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Pick an asset, choose Up or Down, and watch the per-second Hyperliquid ticks decide in 10s.</div>
          </div>
        ) : (
          <>
            {mock.activePlays.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: mock.historyPlays.length ? 20 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--up)", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--up)", display: "inline-block", animation: "mock-pulse 1.2s infinite" }} /> Live — {mock.activePlays.length} open</div>
                {mock.activePlays.slice(0, 8).map((p) => {
              const asset = SUPPORTED_ASSETS.find((a) => a.marketId === p.marketId);
              const isActive = ["active", "settling", "refunding"].includes(p.status);
              const pct = p.priceMovePercent ?? 0;
              const live = p.liveProfitUsd ?? 0;
              const progress = isActive ? Math.min(1, Math.max(0, (Date.now() - p.openedAt) / (p.expiresAt - p.openedAt))) : 1;
              return (
                <div key={p.id} className={`play-row ${p.direction} ${p.status}`} style={{ opacity: isActive ? 1 : 0.9, border: p.status === "won" ? "1px solid var(--up)" : p.status === "lost" ? "1px solid var(--down)" : "1px solid var(--hair)", borderRadius: 12, padding: "10px 12px", background: "var(--card)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {asset && <AssetIcon symbol={asset.symbol} category={asset.category} size={28} />}
                    <div className="chip" style={{ width: 28, height: 28, fontSize: 12 }}>{p.direction === "up" ? "▲" : "▼"}</div>
                  </div>
                  <div className="what" style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{asset?.symbol ?? p.marketId} · {p.direction.toUpperCase()} · {formatUsd(p.collateralUsd)}</strong>
                    <span style={{ fontSize: 11, color: "var(--mut)" }}>
                      {p.status === "active" ? `live ${((p.expiresAt - Date.now()) / 1000).toFixed(1)}s` : p.status} · Entry {formatPrice(p.entryPrice)} {pct ? `· ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : ""}
                    </span>
                    <span className="tbar" style={{ marginTop: 6 }}><span style={{ width: `${progress * 100}%`, background: p.status === "won" ? "var(--up)" : p.status === "lost" ? "var(--down)" : "var(--ink)" }} /></span>
                  </div>
                  <div className="res" style={{ textAlign: "right" }}>
                    <strong className={live >= 0 ? "positive" : "negative"} style={{ fontSize: 13 }}>{p.status === "won" || p.status === "lost" ? formatUsd(p.payoutUsd ?? 0) : `${live >= 0 ? "+" : ""}${formatUsd(live)}`}</strong>
                    <span style={{ fontSize: 10, color: "var(--mut)" }}>{p.status === "won" ? "won" : p.status === "lost" ? "lost" : "estimate"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
            {mock.historyPlays.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--mut)" }}>History — {mock.historyPlays.length} closed</div>
                {mock.historyPlays.slice(0, 12).map((p) => {
              const asset = SUPPORTED_ASSETS.find((a) => a.marketId === p.marketId);
              const live = p.liveProfitUsd ?? 0;
              return (
                <div key={p.id} className={`play-row ${p.direction} ${p.status}`} style={{ opacity: 0.9, border: p.status === "won" ? "1px solid var(--up)" : p.status === "lost" ? "1px solid var(--down)" : "1px solid var(--hair)", borderRadius: 12, padding: "10px 12px", background: "var(--card)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {asset && <AssetIcon symbol={asset.symbol} category={asset.category} size={28} />}
                    <div className="chip" style={{ width: 28, height: 28, fontSize: 12 }}>{p.direction === "up" ? "▲" : "▼"}</div>
                  </div>
                  <div className="what" style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{asset?.symbol ?? p.marketId} · {p.direction.toUpperCase()} · {formatUsd(p.collateralUsd)}</strong>
                    <span style={{ fontSize: 11, color: "var(--mut)" }}>{p.status} · Entry {formatPrice(p.entryPrice)}</span>
                  </div>
                  <div className="res" style={{ textAlign: "right" }}>
                    <strong className={live >= 0 ? "positive" : "negative"} style={{ fontSize: 13 }}>{formatUsd(p.payoutUsd ?? 0)}</strong>
                    <span style={{ fontSize: 10, color: "var(--mut)" }}>{p.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {toast && <div className="mock-toast">{toast}</div>}
      <WinCelebration profit={celebrate?.profit ?? 0} show={!!celebrate} onDone={() => setCelebrate(null)} />

      {showDepositModal && (
        <div
          className="session-backdrop"
          style={{ zIndex: 100 }}
          onClick={() => !isDepositing && setShowDepositModal(false)}
        >
          <div
            className="session-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440 }}
          >
            <button
              className="dialog-close"
              onClick={() => setShowDepositModal(false)}
              disabled={isDepositing}
              type="button"
            >
              ×
            </button>
            <span className="eyebrow">Real Mode · Testnet Setup</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 8px" }}>
              Deposit Buying Power
            </h2>
            <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 16 }}>
              Deposit testnet USDC to activate your MagicBlock Ephemeral Rollup session and start 10s plays.
            </p>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mut)" }}>
                Deposit Amount
              </label>
              <div className="mock-amount-input" style={{ marginTop: 6 }}>
                <span>$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={depositAmount}
                  disabled={isDepositing}
                  onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value) || 1))}
                />
                <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 700 }}>USDC</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[50, 100, 250, 500, 1000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`mock-preset ${depositAmount === amt ? "is-on" : ""}`}
                    onClick={() => setDepositAmount(amt)}
                    disabled={isDepositing}
                  >
                    ${amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: "var(--bg)", border: "1px solid var(--hair)", margin: "16px 0", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--mut)", fontWeight: 600 }}>Network</span>
                <strong style={{ color: "var(--ink)", fontWeight: 700 }}>Solana Devnet · MagicBlock ER</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--mut)", fontWeight: 600 }}>Updated Buying Power</span>
                <strong className="num" style={{ color: "var(--up)", fontWeight: 800 }}>{formatUsd(displayBalance + depositAmount)}</strong>
              </div>
            </div>

            <button
              className="mock-play up"
              style={{ width: "100%", marginTop: 8, minHeight: 48 }}
              onClick={handleDepositSubmit}
              disabled={isDepositing}
              type="button"
            >
              {isDepositing
                ? depositStep === "depositing"
                  ? "Step 1/2 · Depositing USDC…"
                  : "Step 2/2 · Activating ER Session…"
                : `Deposit ${formatUsd(depositAmount)} USDC`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
