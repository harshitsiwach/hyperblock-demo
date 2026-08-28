import { readFileSync } from "fs";
import { resolve } from "path";

export interface AssetConfig {
  symbol: string;
  dex: string;
  decimals: number;
}

export interface OracleConfig {
  assets: AssetConfig[];
  updateIntervalMs: number;
  minChangeBps: number;
  hyperliquidWs: string;
  hyperliquidRest: string;
  erRpc: string;
  routerEndpoint?: string;
}

export function loadConfig(path = resolve(process.cwd(), "config.json")): OracleConfig {
  const raw = readFileSync(path, "utf8");
  const cfg = JSON.parse(raw) as OracleConfig;
  if (!cfg.assets || cfg.assets.length === 0) throw new Error("config.json assets missing");
  return cfg;
}

export function symbolToPdaSeed(symbol: string): Uint8Array {
  const buf = Buffer.alloc(16);
  Buffer.from(symbol).copy(buf);
  return buf;
}

export function dexToBytes(dex: string): Uint8Array {
  const buf = Buffer.alloc(8);
  Buffer.from(dex).copy(buf);
  return buf;
}

export function priceToU64(priceStr: string): bigint {
  const price = parseFloat(priceStr);
  if (!isFinite(price) || price <= 0) throw new Error(`invalid price ${priceStr}`);
  return BigInt(Math.round(price * 1_000_000));
}

export function bpsDiff(oldPrice: bigint, newPrice: bigint): number {
  if (oldPrice === 0n) return 10_000;
  const diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
  return Number((diff * 10000n) / oldPrice);
}
