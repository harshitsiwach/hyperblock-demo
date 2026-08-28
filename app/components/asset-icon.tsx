"use client";

import type { AssetCategory } from "@/app/lib/markets";

// thesvg brand icons — tree-shakeable per-icon imports (3KB each)
import bitcoin from "thesvg/bitcoin";
import ethereum from "thesvg/ethereum";
import solana from "thesvg/solana";
import dogecoin from "thesvg/dogecoin";
import avalanche from "thesvg/avalanche";
import apple from "thesvg/apple";
import nvidia from "thesvg/nvidia";
import tesla from "thesvg/tesla";
import coinbase from "thesvg/coinbase";
import microsoft from "thesvg/microsoft";
import google from "thesvg/google";
import amazon from "thesvg/amazon";
import meta from "thesvg/meta";

const CATEGORY_COLOR: Record<AssetCategory, string> = {
  crypto: "#00a862",
  stocks: "#17181c",
  commodities: "#b45309",
  forex: "#e5484d",
};

const SYMBOL_COLOR: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  HYPE: "#2bd186",
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

const THESVG_MAP: Record<string, { svg: string; hex: string }> = {
  BTC: bitcoin,
  ETH: ethereum,
  SOL: solana,
  DOGE: dogecoin,
  AVAX: avalanche,
  AAPL: apple,
  NVDA: nvidia,
  TSLA: tesla,
  COIN: coinbase,
  MSFT: microsoft,
  GOOGL: google,
  AMZN: amazon,
  META: meta,
};

export function AssetIcon({ symbol, category, size = 36 }: { symbol: string; category: AssetCategory; size?: number }) {
  const thesvg = THESVG_MAP[symbol];
  const bg = SYMBOL_COLOR[symbol] ?? CATEGORY_COLOR[category];
  const isLight = ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"].includes(symbol);
  const fg = isLight ? "#17181c" : "#fff";
  const letter = symbol.slice(0, symbol.length > 3 ? 3 : symbol.length);
  const isCrypto = category === "crypto";

  // If thesvg brand is available, render crisp SVG logo
  if (thesvg) {
    // Use white container for dark logos like Apple, keep brand color as border glow
    const isDarkLogo = ["AAPL", "NVDA", "TSLA"].includes(symbol);
    const containerBg = isDarkLogo ? "#fff" : "#fff";
    const containerBorder = isDarkLogo ? "1px solid var(--hair)" : `1px solid ${bg}18`;
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: containerBg,
          display: "grid",
          placeItems: "center",
          flex: `0 0 ${size}px`,
          boxShadow: `0 2px 10px ${bg}22, 0 1px 0 rgba(0,0,0,0.04)`,
          border: containerBorder,
          position: "relative",
          overflow: "hidden",
          padding: size * 0.18,
        }}
        title={symbol}
      >
        <div
          // thesvg provides raw <svg> string with brand colors
          style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}
          dangerouslySetInnerHTML={{ __html: thesvg.svg }}
        />
      </div>
    );
  }

  // Fallback: beautiful letter badge (commodities/forex + missing crypto like HYPE/ARB)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: bg,
        color: fg,
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.32,
        fontWeight: 800,
        letterSpacing: -0.5,
        flex: `0 0 ${size}px`,
        boxShadow: `0 2px 8px ${bg}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
        border: isLight ? "1px solid #e8e7e3" : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, rgba(255,255,255,${isCrypto ? 0.18 : 0.12}) 0%, transparent 55%)`,
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative", zIndex: 1, fontVariantNumeric: "tabular-nums" }}>{letter}</span>
    </div>
  );
}
