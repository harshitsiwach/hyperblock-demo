"use client";

import React from "react";
import type { AssetCategory } from "@/app/lib/markets";
import {
  TokenBTC,
  TokenETH,
  TokenSOL,
  TokenAVAX,
  TokenDOGE,
  TokenARB,
  TokenAAVE,
} from "@web3icons/react";

// thesvg brand icons for major stocks
import apple from "thesvg/apple";
import nvidia from "thesvg/nvidia";
import tesla from "thesvg/tesla";
import coinbase from "thesvg/coinbase";
import microsoft from "thesvg/microsoft";
import google from "thesvg/google";
import amazon from "thesvg/amazon";
import meta from "thesvg/meta";

const CATEGORY_COLOR: Record<AssetCategory, string> = {
  crypto: "#00f076",
  stocks: "#17181c",
  commodities: "#d4af37",
  forex: "#3b82f6",
};

const SYMBOL_COLOR: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  HYPE: "#00f076",
  DOGE: "#c2a633",
  AVAX: "#e84142",
  ARB: "#28a0f0",
  AAVE: "#b6509e",
  AAPL: "#000000",
  NVDA: "#76b900",
  TSLA: "#e31937",
  COIN: "#0052ff",
  MSFT: "#00a4ef",
  GOOGL: "#4285f4",
  AMZN: "#ff9900",
  META: "#0866ff",
  GOLD: "#d4af37",
  SILVER: "#a8a9ad",
  BRENTOIL: "#2c3e50",
  COPPER: "#b87333",
  PLATINUM: "#e5e4e2",
  PALLADIUM: "#c0c0c0",
  EUR: "#003399",
  JPY: "#bc002d",
  SP500: "#1a1a1a",
  DXY: "#0f4c75",
};

const STOCK_SVG_MAP: Record<string, { svg: string; hex: string }> = {
  AAPL: apple,
  NVDA: nvidia,
  TSLA: tesla,
  COIN: coinbase,
  MSFT: microsoft,
  GOOGL: google,
  AMZN: amazon,
  META: meta,
};

export function AssetIcon({
  symbol,
  category,
  size = 36,
  className = "",
}: {
  symbol: string;
  category: AssetCategory;
  size?: number;
  className?: string;
}) {
  const sym = symbol.toUpperCase();
  const bg = SYMBOL_COLOR[sym] ?? CATEGORY_COLOR[category];

  // 1. Official Web3 Token Icons from @web3icons/react
  if (sym === "BTC") {
    return <TokenBTC size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "ETH") {
    return <TokenETH size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "SOL") {
    return <TokenSOL size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "AVAX") {
    return <TokenAVAX size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "DOGE") {
    return <TokenDOGE size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "ARB") {
    return <TokenARB size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "AAVE") {
    return <TokenAAVE size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }

  // 2. Hyperliquid (HYPE) custom glowing emblem
  if (sym === "HYPE") {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #0b1c14 0%, #00f076 100%)",
          border: "1px solid rgba(0, 240, 118, 0.4)",
        }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none">
          <path
            d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
            fill="#00f076"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 12L12 9L16 12L12 15L8 12Z" fill="#0b0d12" />
        </svg>
      </div>
    );
  }

  // 3. Stock brand SVGs
  const stockSvg = STOCK_SVG_MAP[sym];
  if (stockSvg) {
    const isDarkLogo = ["AAPL", "NVDA", "TSLA"].includes(sym);
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 bg-white border border-white/10 ${className}`}
        style={{
          width: size,
          height: size,
          padding: size * 0.18,
          boxShadow: `0 2px 8px ${bg}22`,
        }}
      >
        <div
          style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}
          dangerouslySetInnerHTML={{ __html: stockSvg.svg }}
        />
      </div>
    );
  }

  // 4. Commodities, Forex & Other Assets: Institutional Badge
  const isLight = ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"].includes(sym);
  const letter = sym.slice(0, sym.length > 3 ? 3 : sym.length);

  return (
    <div
      className={`flex items-center justify-center rounded-xl font-mono font-extrabold flex-shrink-0 relative overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: isLight ? "linear-gradient(135deg, #e5c158 0%, #b8860b 100%)" : bg,
        color: isLight ? "#1a1200" : "#ffffff",
        fontSize: size * 0.32,
        boxShadow: `0 2px 10px ${bg}35`,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/25 pointer-events-none" />
      <span className="relative z-10">{letter}</span>
    </div>
  );
}
