"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_ASSETS } from "@/app/components/asset-selector";
import { AssetIcon } from "@/app/components/asset-icon";
import { useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { useMockTrading } from "@/app/hooks/use-mock-trading";
import { claimMockFunds, canClaimMock, getLastClaimAt, MOCK_CLAIM_COOLDOWN_MS } from "@/app/lib/mock/storage";
import { BrandMark } from "@/app/components/brand-mark";
import { WinCelebration } from "@/app/components/mock/WinCelebration";
import type { MarketSnapshot, Play } from "@/app/lib/domain";

function formatPrice(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MockArena() {
  const router = useRouter();
  const [selectedMarketId, setSelectedMarketId] = useState<number>(() => {
    const valid = SUPPORTED_ASSETS.map((a) => a.marketId);
    if (typeof window !== "undefined") {
      const q = Number.parseInt(new URLSearchParams(window.location.search).get("market") ?? "9", 10);
      if (valid.includes(q)) return q;
      const saved = Number.parseInt(localStorage.getItem("hyperblock:mock:market") ?? "9", 10);
      if (valid.includes(saved)) return saved;
    }
    return 9; // default GOLD for commodities focus
  });
  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId) ?? SUPPORTED_ASSETS[8];
  const mock = useMockTrading(selectedMarketId);
  const [amount, setAmount] = useState(10);
  const [claimPulse, setClaimPulse] = useState(false);
  const [betFlash, setBetFlash] = useState<"up" | "down" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // persist market
  useEffect(() => {
    localStorage.setItem("hyperblock:mock:market", String(selectedMarketId));
    const url = new URL(window.location.href);
    url.searchParams.set("market", String(selectedMarketId));
    window.history.replaceState(null, "", url.toString());
  }, [selectedMarketId]);

  // per-second price history for selected asset
  const [hlHistory, setHlHistory] = useState<{ t: number; p: number }[]>([]);
  useEffect(() => {
    if (mock.currentPrice == null) return;
    setHlHistory((h) => {
      const next = [...h, { t: Date.now(), p: mock.currentPrice! }];
      if (next.length > 90) next.shift();
      return next;
    });
  }, [mock.currentPrice]);

  const canClaim = canClaimMock();
  const lastClaim = getLastClaimAt();
  const cooldownSec = lastClaim ? Math.max(0, Math.ceil((MOCK_CLAIM_COOLDOWN_MS - (Date.now() - lastClaim)) / 1000)) : 0;

  const handleClaim = () => {
    const res = claimMockFunds(10_000);
    if (res.claimed) {
      setClaimPulse(true);
      setToast(`+${formatUsd(10_000)} demo added — have fun!`);
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
    const res = mock.placeBet(dir, amount);
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
  const maxPayout = useMemo(() => amount * 0.9 * 5, [amount]); // capped 5x minus 10% fee simplified
  const activeCategory = selectedAsset.category;
  const [celebrate, setCelebrate] = useState<{ profit: number; id: string } | null>(null);

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
  useEffect(() => {
    if (mock.lastSettlement && mock.lastSettlement.profit > 0) {
      setCelebrate({ profit: mock.lastSettlement.profit, id: mock.lastSettlement.play.id });
      const t = setTimeout(() => setCelebrate(null), 2800);
      return () => clearTimeout(t);
    }
    if (mock.lastSettlement && mock.lastSettlement.profit < 0) {
      // subtle shake for loss
      try { navigator.vibrate?.([20, 40]); } catch {}
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
        .mock-hero { max-width: 1160px; margin: 0 auto; padding: 18px 20px 0; display: grid; grid-template-columns: 1fr 360px; gap: 18px; }
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
      `}</style>

      <div className="mock-top">
        <div className="mock-top-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <span className="mock-demo-badge"><i /> Demo Mode</span>
            <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700, display: "none" }} className="hide-mobile">· No wallet needed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="mock-balance">
              <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>Demo</span>
              <b className="num">{formatUsd(mock.balance)}</b>
              <span style={{ width: 1, height: 18, background: "var(--hair)" }} />
              <span style={{ fontSize: 11, color: "var(--mut)" }}>{activeCount}/{8} live</span>
            </div>
            <button className={`mock-claim ${claimPulse ? "is-pulse" : ""}`} onClick={handleClaim} disabled={!canClaim}>
              {canClaim ? "+ Claim $10k" : `Claim in ${cooldownSec}s`}
            </button>
          </div>
        </div>
      </div>

      <div className="mock-hero">
        <div className="mock-chart-card">
          <div className="mock-chart-head">
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--mut)" }}>{selectedAsset.label} · Hyperliquid {selectedAsset.dex || "main"}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span className="num" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>{mock.currentPrice ? formatPrice(mock.currentPrice) : "—"}</span>
                {(() => {
                  const p = mock.currentPrice;
                  if (p == null || hlHistory.length < 2) return null;
                  const first = hlHistory[0].p;
                  const ch = p - first;
                  const pct = (ch / first) * 100;
                  return <span className={`num ${ch >= 0 ? "positive" : "negative"}`} style={{ fontSize: 13, fontWeight: 700 }}>{ch >= 0 ? "+" : ""}{ch.toFixed(2)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</span>;
                })()}
              </div>
              <div style={{ fontSize: 11, color: mock.currentPrice ? "var(--up)" : "var(--mut)", fontWeight: 700, marginTop: 2 }}>
                {mock.currentPrice ? `● Hyperliquid · live · 1s ticks · ${hlHistory.length}s` : "● connecting…"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>Max payout</div>
              <div className="num" style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>{formatUsd(amount + maxPayout)}</div>
              <div style={{ fontSize: 10, color: "var(--mut)" }}>stake {formatUsd(amount)} → up to +{formatUsd(maxPayout)}</div>
            </div>
          </div>

          {/* Pixi hero — same as original BTC, now for every asset, per-second Hyperliquid */}
          <div style={{ padding: "8px 12px 12px" }}>
            <div style={{ height: 280 }}>
              <PriceArena snapshot={mockSnapshot} plays={mock.plays as any} now={Date.now()} celebratingIds={celebrate ? new Set([celebrate.id]) : undefined} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--mut)", marginTop: 6, fontWeight: 600 }}>
              <span>Hyperliquid · {selectedAsset.symbol} · wall-clock 45s window · drag to inspect</span>
              <span>{mock.activePlays.length > 0 ? `watching ${mock.activePlays.length} · entry line` : "↪ drag chart → Return to live"}</span>
            </div>
          </div>
        </div>

        <div className="mock-ticket">
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
          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 6, lineHeight: 1.4 }}>
            Win up to <b style={{ color: "var(--ink)" }}>{formatUsd(maxPayout)}</b> profit on {formatUsd(amount)} · fee 10% · per-second Hyperliquid ticks
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

          <div className="mock-asset-grid">
            {SUPPORTED_ASSETS.map((a) => {
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
        </div>
      </div>

      <div className="mock-positions">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--mut)" }}>Live Positions — {activeCount}/8</h3>
          <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>{mock.plays.length} total · {mock.historyPlays.filter((p) => p.status === "won").length} wins</span>
        </div>

        {mock.lastSettlement && (
          <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, background: mock.lastSettlement.profit >= 0 ? "var(--up-tint)" : "var(--down-tint)", border: `1px solid ${mock.lastSettlement.profit >= 0 ? "var(--up)" : "var(--down)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "mock-toast-in .4s ease-out" }}>
            <span style={{ fontWeight: 800, color: mock.lastSettlement.profit >= 0 ? "var(--up)" : "var(--down)" }}>{mock.lastSettlement.profit >= 0 ? "Won" : "Lost"} {formatUsd(Math.abs(mock.lastSettlement.profit))} · {mock.lastSettlement.play.direction.toUpperCase()} {mock.lastSettlement.play.collateralUsd}</span>
            <span style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700 }}>settled</span>
          </div>
        )}

        {mock.plays.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--mut)", border: "1px dashed var(--hair)", borderRadius: 12, background: "var(--card)" }}>
            <div style={{ fontWeight: 800, color: "var(--ink)" }}>No positions yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Pick an asset, choose Up or Down, and watch the per-second Hyperliquid ticks decide in 10s.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {mock.plays.slice(0, 12).map((p) => {
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
      </div>

      {toast && <div className="mock-toast">{toast}</div>}
      <WinCelebration profit={celebrate?.profit ?? 0} show={!!celebrate} onDone={() => setCelebrate(null)} />
    </div>
  );
}
