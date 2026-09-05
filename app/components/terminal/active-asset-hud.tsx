"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { AssetIcon } from "@/app/components/asset-icon";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";
import { MARKETS, type MarketInfo } from "@/app/lib/markets";
import { Activity, ArrowUpRight, Cpu, Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";

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
  const { activeTintConfig } = useTheme();

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
    <div className="terminal-card rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div
        className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ backgroundColor: activeTintConfig.subtleBg }}
      />

      {/* Upper Tier: Watched Asset Hologram & Real-Time Telemetry */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--glass-panel-border-subtle)] pb-3.5">
        {/* Left: Active Watched Token */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center h-13 w-13 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] shadow-sm">
            <div className="relative z-10">
              <AssetIcon symbol={asset.symbol} category={asset.category} size={36} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-[var(--ink)] tracking-tight">
                {asset.symbol}
              </span>
              <span className="text-xs font-semibold text-[var(--ink-secondary)]">
                {asset.name}
              </span>
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                style={{
                  color: activeTintConfig.color,
                  borderColor: activeTintConfig.borderColor,
                  backgroundColor: activeTintConfig.subtleBg,
                }}
              >
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                WATCHING
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--ink-muted)] font-mono">
              <span>{networkInfo.network}</span>
              <span>·</span>
              <span className="text-[var(--ink-muted)]">{networkInfo.standard}</span>
            </div>
          </div>
        </div>

        {/* Right: Live Price Readout & Feed Health */}
        <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">
              Mark Index:
            </span>
            <TypewriterNumber
              value={currentPrice ?? 0}
              prefix="$"
              decimals={currentPrice && currentPrice < 1 ? 4 : 2}
              className="text-lg font-extrabold text-[var(--ink)] font-mono"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
            <span className="flex items-center gap-1 text-[var(--ink-secondary)]">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Hyperliquid L1 Oracle</span>
            </span>
            <span>·</span>
            <span>Block: {networkInfo.blockTime}</span>
          </div>
        </div>
      </div>

      {/* Lower Tier: Web3 Token Quick-Switch Matrix */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <span>Web3 Markets Matrix</span>
            <span className="text-[10px] font-mono text-[var(--ink-muted)] font-normal">
              (Click to watch & stream)
            </span>
          </div>
          <span className="text-[10px] font-mono text-[var(--ink-muted)]">
            100% Real-Time Mainnet
          </span>
        </div>

        {/* Responsive Grid of Tokens */}
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
                    ? "shadow-sm"
                    : "bg-[var(--glass-card-bg)] border-[var(--glass-card-border)] hover:bg-[var(--glass-card-hover-bg)] hover:border-[var(--glass-card-hover-border)]"
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: activeTintConfig.subtleBg,
                        borderColor: activeTintConfig.borderColor,
                        boxShadow: `0 0 12px ${activeTintConfig.glowColor}`,
                      }
                    : undefined
                }
              >
                {/* Branded Web3 Icon */}
                <div className="transition-transform group-hover:scale-105">
                  <AssetIcon symbol={item.symbol} category={item.marketId <= 4 || item.marketId >= 14 && item.marketId <= 17 ? "crypto" : item.marketId === 9 ? "commodities" : "stocks"} size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs font-extrabold truncate ${
                        isSelected ? "text-[var(--ink)]" : "text-[var(--ink-secondary)] group-hover:text-[var(--ink)]"
                      }`}
                    >
                      {item.symbol}
                    </span>
                    {isSelected && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: activeTintConfig.color }}
                      />
                    )}
                  </div>
                  <div className="font-mono text-[11px] font-medium text-[var(--ink-muted)] truncate">
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
