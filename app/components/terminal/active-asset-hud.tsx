"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { AssetIcon } from "@/app/components/asset-icon";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";
import { MARKETS, type MarketInfo } from "@/app/lib/markets";
import { Activity, ArrowUpRight, Cpu, Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";

interface ActiveAssetHudProps {
  asset: MarketInfo;
  currentPrice: number | null;
  prices: Map<string, { price: number; [key: string]: any }>;
  onSelectMarket: (marketId: number) => void;
}

const TOP_WATCH_ASSETS = [
  { symbol: "BTC", label: "Bitcoin", marketId: 1, chain: "Bitcoin L1" },
  { symbol: "ETH", label: "Ethereum", marketId: 2, chain: "Ethereum PoS" },
  { symbol: "SOL", label: "Solana", marketId: 3, chain: "Solana SVM" },
  { symbol: "AVAX", label: "Avalanche", marketId: 15, chain: "Avalanche C-Chain" },
  { symbol: "HYPE", label: "Hyperliquid", marketId: 4, chain: "HyperBFT L1" },
  { symbol: "ARB", label: "Arbitrum", marketId: 16, chain: "Arbitrum Nitro" },
  { symbol: "AAVE", label: "Aave", marketId: 17, chain: "DeFi Lending" },
  { symbol: "DOGE", label: "Dogecoin", marketId: 14, chain: "Scrypt PoW" },
  { symbol: "GOLD", label: "Gold", marketId: 9, chain: "Spot Metal" },
  { symbol: "NVDA", label: "NVIDIA", marketId: 6, chain: "Equities DEX" },
];

export function ActiveAssetHud({
  asset,
  currentPrice,
  prices,
  onSelectMarket,
}: ActiveAssetHudProps) {
  // Network specification for active asset
  const networkInfo = useMemo(() => {
    switch (asset.symbol.toUpperCase()) {
      case "BTC":
        return { network: "Bitcoin UTXO Core", consensus: "SHA-256 PoW", standard: "Native BTC", blockTime: "10m" };
      case "ETH":
        return { network: "Ethereum Mainnet", consensus: "Proof of Stake", standard: "ERC-20", blockTime: "12s" };
      case "SOL":
        return { network: "Solana Sealevel", consensus: "Proof of History", standard: "SPL Token", blockTime: "400ms" };
      case "AVAX":
        return { network: "Avalanche C-Chain", consensus: "Snowman BFT", standard: "ARC-20", blockTime: "1.2s" };
      case "HYPE":
        return { network: "Hyperliquid L1", consensus: "HyperBFT Tendermint", standard: "Native L1", blockTime: "200ms" };
      case "ARB":
        return { network: "Arbitrum One Rollup", consensus: "Optimistic Rollup", standard: "ERC-20", blockTime: "250ms" };
      case "AAVE":
        return { network: "Aave V3 Protocol", consensus: "Multi-Chain Liquidity", standard: "ERC-20 Governance", blockTime: "12s" };
      case "DOGE":
        return { network: "Dogecoin Core", consensus: "Scrypt AuxPoW", standard: "Native Doge", blockTime: "1m" };
      case "GOLD":
        return { network: "London Bullion (LBMA)", consensus: "Physical Settlement", standard: "XAU/USD Spot", blockTime: "Live 1s" };
      default:
        return { network: `${asset.name} Terminal`, consensus: "Hyperliquid XYZ DEX", standard: "Synthetic Perps", blockTime: "1s" };
    }
  }, [asset]);

  return (
    <div className="terminal-card bg-[#121620] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden">
      {/* Background Cyber Ambient Grid & Glow */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#00f076]/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Upper Tier: Watched Asset Hologram & Real-Time Telemetry */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
        {/* Left: Active Watched Token Hologram */}
        <div className="flex items-center gap-3.5">
          {/* Animated Orbital Energy Ring around Active Token Icon */}
          <div className="relative flex items-center justify-center h-14 w-14">
            {/* Outer Spinning Orbit Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-[#00f076]/40 pointer-events-none"
            />
            {/* Inner Reverse Glow Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-1 rounded-full border border-[#00f076]/20 shadow-[0_0_12px_rgba(0,240,118,0.2)] pointer-events-none"
            />
            {/* Pulsing Radar Aura */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-1.5 rounded-full bg-[#00f076]/10 pointer-events-none"
            />
            {/* The Official Branded Web3 Icon */}
            <div className="relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
              <AssetIcon symbol={asset.symbol} category={asset.category} size={40} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-white tracking-tight">
                {asset.symbol}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {asset.name}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-[#00f076]/10 border border-[#00f076]/30 px-2 py-0.5 text-[10px] font-bold text-[#00f076]">
                <Radio className="h-2.5 w-2.5 animate-pulse text-[#00f076]" />
                WATCHING
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span>{networkInfo.network}</span>
              <span>·</span>
              <span className="text-slate-400">{networkInfo.standard}</span>
            </div>
          </div>
        </div>

        {/* Right: Live Price Readout & Feed Health */}
        <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Mark Index:
            </span>
            <TypewriterNumber
              value={currentPrice ?? 0}
              prefix="$"
              decimals={currentPrice && currentPrice < 1 ? 4 : 2}
              className="text-lg font-extrabold text-white"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-[#00f076]">
              <ShieldCheck className="h-3 w-3" />
              <span>Hyperliquid L1 Oracle</span>
            </span>
            <span>·</span>
            <span>Block: {networkInfo.blockTime}</span>
          </div>
        </div>
      </div>

      {/* Lower Tier: Web3 Token Quick-Switch Matrix with Branded Icons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-[#00f076]" />
            <span>Web3 Markets Matrix</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">
              (Click to watch & stream)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            100% Real-Time Mainnet
          </span>
        </div>

        {/* Scrollable / Responsive Grid of Tokens */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TOP_WATCH_ASSETS.map((item) => {
            const isSelected = item.symbol === asset.symbol;
            const liveP = prices.get(item.symbol)?.price;

            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => onSelectMarket(item.marketId)}
                className={`group relative flex items-center gap-2.5 p-2 rounded-xl transition-all text-left border ${
                  isSelected
                    ? "bg-[#00f076]/10 border-[#00f076] shadow-[0_0_12px_rgba(0,240,118,0.2)]"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.15]"
                }`}
              >
                {/* Branded Web3 Icon */}
                <div className="transition-transform group-hover:scale-110">
                  <AssetIcon symbol={item.symbol} category={item.marketId <= 4 || item.marketId >= 14 && item.marketId <= 17 ? "crypto" : item.marketId === 9 ? "commodities" : "stocks"} size={26} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-extrabold truncate ${isSelected ? "text-[#00f076]" : "text-white group-hover:text-[#00f076]"}`}>
                      {item.symbol}
                    </span>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00f076] animate-ping" />
                    )}
                  </div>
                  <div className="font-mono text-[11px] font-medium text-slate-400 truncate">
                    {liveP ? `$${liveP.toLocaleString(undefined, { minimumFractionDigits: liveP < 1 ? 4 : 2, maximumFractionDigits: liveP < 1 ? 4 : 2 })}` : "—"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
