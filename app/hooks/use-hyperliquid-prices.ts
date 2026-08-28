"use client";

import { useEffect, useRef, useState } from "react";

export interface HyperliquidPrice {
  symbol: string;
  price: number;
  priceStr: string;
  updatedAt: number;
}

const WS_URL = "wss://api.hyperliquid-testnet.xyz/ws";

/**
 * Subscribes to Hyperliquid WS for both main DEX (crypto) and builder DEX "xyz"
 * (stocks, commodities, forex). Strips the "xyz:" prefix from builder DEX symbols.
 */
export function useHyperliquidPrices(symbols: string[]): Map<string, HyperliquidPrice> {
  const [prices, setPrices] = useState<Map<string, HyperliquidPrice>>(new Map());
  const cacheRef = useRef<Map<string, HyperliquidPrice>>(new Map());

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let backoff = 1000;
    const symbolSet = new Set(symbols);

    const processMids = (mids: Record<string, string>) => {
      let changed = false;
      for (const [rawKey, v] of Object.entries(mids)) {
        if (!v || v.startsWith("@")) continue;
        // Strip "xyz:" prefix if present
        const sym = rawKey.includes(":") ? rawKey.split(":")[1] : rawKey;
        if (!sym || !symbolSet.has(sym)) continue;
        const price = parseFloat(v);
        if (isFinite(price)) {
          cacheRef.current.set(sym, { symbol: sym, price, priceStr: v, updatedAt: Date.now() });
          changed = true;
        }
      }
      if (changed) setPrices(new Map(cacheRef.current));
    };

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        backoff = 1000;
        // Subscribe to main DEX (crypto assets)
        ws?.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
        // Subscribe to builder DEX "xyz" (stocks, commodities, forex)
        ws?.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids", dex: "xyz" } }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { channel?: string; data?: { mids?: Record<string, string> } };
          if (msg.channel !== "allMids" || !msg.data?.mids) return;
          processMids(msg.data.mids);
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        if (closed) return;
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };
    };
    connect();
    return () => {
      closed = true;
      ws?.close();
    };
  }, [symbols.join(",")]);

  return prices;
}
