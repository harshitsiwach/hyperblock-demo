"use client";

import { useEffect, useMemo, useState } from "react";
import { useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { PriceArena } from "@/app/components/price-arena";
import { LiveHyperliquidChart } from "@/app/components/live-hyperliquid-chart";
import { AssetIcon } from "@/app/components/asset-icon";
import { getMarketBySymbol } from "@/app/lib/markets";
import type { MarketSnapshot } from "@/app/lib/domain";

export function HyperliquidLiveChart({ symbol, label }: { symbol: string; label: string }) {
  const prices = useHyperliquidPrices([symbol]);
  const current = prices.get(symbol);
  const [history, setHistory] = useState<{ price: number; timestamp: number }[]>([]);
  const market = getMarketBySymbol(symbol);

  useEffect(() => {
    if (!current) return;
    setHistory((h) => {
      const next = [...h, { price: current.price, timestamp: current.updatedAt }];
      if (next.length > 120) next.shift();
      return next;
    });
  }, [current?.price, current?.updatedAt]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const mockSnapshot: MarketSnapshot = useMemo(() => {
    const price = current?.price ?? history[history.length - 1]?.price ?? 0;
    const safeHistory = history.length ? history : [{ price: price || 0, timestamp: Date.now() }];
    return {
      mode: "live" as const,
      marketId: market?.marketId ?? 1,
      marketLabel: label,
      gameLabel: `${symbol} PRICE RUSH`,
      currentPrice: price,
      currentRawPrice: String(Math.round(price * 100)),
      priceExponent: 8,
      priceHistory: safeHistory,
      feedHealth: current && Date.now() - current.updatedAt <= 5000 ? "live" : "offline",
      feedAgeSeconds: current ? (Date.now() - current.updatedAt) / 1000 : 99,
      marketMode: "open" as const,
      activePositions: 0,
      nextPositionNonce: 0,
      maxPositions: 8,
      walletAddress: null,
      walletBalanceUsd: null,
      fallbackClaimableUsd: 0,
      plays: [],
      capturedAt: Date.now(),
      erEndpoint: "",
      collateralMint: "",
      oracleAddress: "",
      oracleFeedId: "",
      notice: "Hyperliquid · live · 1s · MagicBlock hero",
    };
  }, [current, history, label, market]);

  const stale = !current || Date.now() - current.updatedAt > 5000;

  return (
    <div className="hl-detail-v2">
      <div className="hl-v2-head">
        <div className="hl-v2-symbol" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AssetIcon symbol={symbol} category={market?.category ?? "crypto"} size={48} />
          <div>
            <div className="hl-v2-name">{label}</div>
            <div className="hl-v2-sub">
              <span className="hl-v2-dex">{market?.dex ? "xyz · builder" : "main · perp"}</span>
              <span className="hl-v2-dot" />
              <span className={stale ? "hl-v2-stale" : "hl-v2-live"}>
                <i /> {stale ? "connecting…" : "live · 1s"}
              </span>
            </div>
          </div>
        </div>
        <div className="hl-v2-pricebox">
          <div className="hl-v2-price num" style={{ color: "var(--ink)" }}>
            {current ? `$${current.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 700, marginTop: 2 }}>{history.length} ticks · smooth</div>
        </div>
      </div>

      <div className="hl-v2-chart-card">
        <div className="hl-v2-chart-top">
          <span>Hyperliquid · {symbol} · hero · every second</span>
          <span className="hl-v2-range">
            {history.length > 1 ? (
              <>
                H <b className="num">${Math.max(...history.map((x) => x.price)).toFixed(2)}</b> · L <b className="num">${Math.min(...history.map((x) => x.price)).toFixed(2)}</b> · {history.length}s
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div style={{ display: "none" }}>
          <PriceArena snapshot={mockSnapshot} plays={[]} now={nowTick} />
        </div>
        <LiveHyperliquidChart data={history.map((h) => ({ time: h.timestamp / 1000, value: h.price }))} value={history[history.length - 1]?.price ?? current?.price ?? 0} height={540} window={45} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mut)", marginTop: 10, fontWeight: 600 }}>
          <span>Every second · live-line-chart · {history.length} ticks · moves with price</span>
          <span>{history.length > 1 ? `H $${Math.max(...history.map((x) => x.price)).toFixed(2)} · L $${Math.min(...history.map((x) => x.price)).toFixed(2)}` : ""}</span>
        </div>
      </div>

      <div className="hl-v2-ticks">
        <div className="hl-v2-ticks-head">Live ticks — every second · drag chart to inspect history · winning shows burst</div>
        <div className="hl-v2-ticks-grid">
          {history.slice(-12).reverse().map((pt, i) => {
            const prev = history[history.length - 12 + (11 - i) - 1];
            const ch = prev ? pt.price - prev.price : 0;
            return (
              <div key={pt.timestamp} className="hl-v2-tick" style={{ animationDelay: `${i * 18}ms` }}>
                <span className="hl-v2-tick-time num">{new Date(pt.timestamp).toLocaleTimeString()}</span>
                <span className="hl-v2-tick-price num">${pt.price.toFixed(2)}</span>
                <span className={`hl-v2-tick-chg ${ch > 0 ? "positive" : ch < 0 ? "negative" : ""}`}>{ch === 0 ? "—" : `${ch > 0 ? "+" : ""}${ch.toFixed(2)}`}</span>
              </div>
            );
          })}
          {history.length === 0 && <span className="hl-v2-tick-empty">— waiting —</span>}
        </div>
      </div>
    </div>
  );
}
