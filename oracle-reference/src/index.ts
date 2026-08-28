import { Connection, Keypair } from "@solana/web3.js";
import dotenv from "dotenv";
import { loadConfig, priceToU64, bpsDiff } from "./config.js";
import {
  fetchAllMids,
  fetchAllMidsForDex,
  createHyperliquidWs,
  type Mids,
} from "./hyperliquid.js";
import {
  loadKeypair,
  priceAccountPda,
  updatePriceIx,
  sendUpdatePrice,
} from "./solana.js";
import { readFileSync } from "fs";
import { resolve } from "path";

dotenv.config();

const cfg = loadConfig(resolve(process.cwd(), "config.json"));
const oraclePath =
  process.env.ORACLE_KEYPAIR_PATH ||
  resolve(process.cwd(), "oracle-keypair.json");
const erRpc = process.env.ER_RPC_ENDPOINT || cfg.erRpc;
const routerEndpoint = process.env.ROUTER_ENDPOINT || cfg.routerEndpoint;

console.log(`Oracle service starting — erRpc=${erRpc} ws=${cfg.hyperliquidWs}`);
console.log(`Assets: ${cfg.assets.map((a) => `${a.symbol}[dex=${a.dex || "main"}]`).join(", ")}`);
console.log(`Update interval ${cfg.updateIntervalMs}ms minChange ${cfg.minChangeBps}bps`);

// Load keypair
let payer: Keypair;
try {
  payer = loadKeypair(oraclePath);
} catch (e) {
  console.error(`Failed to load keypair at ${oraclePath}:`, e);
  process.exit(1);
}
console.log(`Oracle authority: ${payer.publicKey.toBase58()}`);

// Solana connection (ER RPC)
const connection = new Connection(erRpc, "confirmed");

// In-memory caches
const priceCache = new Map<string, { priceStr: string; updatedAt: number }>();
const lastOnChain = new Map<string, { priceU64: bigint; writtenAt: number }>();
const lastWarn = new Map<string, number>();

// Warm via REST across all dexes
async function warmCache() {
  const dexes = ["", ...new Set(cfg.assets.map((a) => a.dex).filter(Boolean))];
  for (const dex of dexes) {
    try {
      const mids = await fetchAllMidsForDex(cfg.hyperliquidRest, dex);
      for (const [k, v] of Object.entries(mids)) {
        if (k.startsWith("@")) continue;
        priceCache.set(k, { priceStr: v, updatedAt: Date.now() });
        if (k.includes(":")) {
          const [, sym] = k.split(":");
          if (sym) priceCache.set(sym, { priceStr: v, updatedAt: Date.now() });
        }
      }
    } catch (e) {
      console.error(`[warm] REST failed for dex=${dex}`, e);
    }
  }
  console.log(`[warm] REST loaded ${priceCache.size} mids across dexes`);
  for (const a of cfg.assets) {
    const hit = priceCache.get(a.symbol) ?? priceCache.get(`${a.dex}:${a.symbol}`);
    console.log(`  ${a.symbol} [dex=${a.dex || "main"}]: ${hit?.priceStr ?? "missing"}`);
  }
}

await warmCache();

async function refreshDexMids() {
  const dexAssets = cfg.assets.filter((a) => a.dex);
  const dexes = [...new Set(dexAssets.map((a) => a.dex))];
  for (const dex of dexes) {
    try {
      const mids = await fetchAllMidsForDex(cfg.hyperliquidRest, dex);
      for (const [k, v] of Object.entries(mids)) {
        if (k.startsWith("@")) continue;
        priceCache.set(k, { priceStr: v, updatedAt: Date.now() });
        if (k.includes(":")) {
          const [, sym] = k.split(":");
          if (sym) priceCache.set(sym, { priceStr: v, updatedAt: Date.now() });
        }
      }
    } catch (e) {
      console.warn(`[dex refresh] dex=${dex} failed`, e);
    }
  }
}
if (cfg.assets.some((a) => a.dex)) {
  setInterval(refreshDexMids, 2000);
}

// WS for main dex
const dexes = [...new Set(cfg.assets.map((a) => a.dex).filter(Boolean))];
const wsHandle = createHyperliquidWs({
  wsUrl: cfg.hyperliquidWs,
  dexes,
  onMids: (mids) => {
    for (const [k, v] of Object.entries(mids)) {
      priceCache.set(k, { priceStr: v, updatedAt: Date.now() });
    }
  },
  onError: (e) => console.error("[ws]", e.message),
});

// Periodic on-chain writer
async function tick() {
  for (const asset of cfg.assets) {
    const entry = priceCache.get(asset.symbol);
    if (!entry) {
      const now = Date.now();
      const last = lastWarn.get(asset.symbol) ?? 0;
      if (now - last > 5000) {
        console.warn(`[warn] no price for ${asset.symbol} in >5s — bets will fail staleness`);
        lastWarn.set(asset.symbol, now);
      }
      continue;
    }
    const age = Date.now() - entry.updatedAt;
    if (age > 5000) {
      console.warn(`[warn] ${asset.symbol} price age ${age}ms >5s`);
    }

    let priceU64: bigint;
    try {
      priceU64 = priceToU64(entry.priceStr);
    } catch {
      continue;
    }
    if (priceU64 === 0n) continue;

    const last = lastOnChain.get(asset.symbol);
    const now = Date.now();
    const bps = last ? bpsDiff(last.priceU64, priceU64) : 10_000;
    const elapsed = last ? now - last.writtenAt : Infinity;
    const shouldWrite = bps >= cfg.minChangeBps || elapsed >= 2000;
    if (!shouldWrite) continue;

    const pda = priceAccountPda(asset.symbol);
    try {
      // Build and send update_price atomically; we use sendUpdatePrice helper that confirms
      // For high frequency, we skip confirm and just send.
      const ix = updatePriceIx(payer.publicKey, pda, priceU64);
      // Use simple send without confirm for speed, but need blockhash
      // For hackathon, we send with confirm to catch errors; use helper
      const sig = await sendUpdatePrice(connection, payer, pda, priceU64);
      lastOnChain.set(asset.symbol, { priceU64, writtenAt: now });
      console.log(`[write] ${asset.symbol} ${entry.priceStr} -> ${priceU64} (bps=${bps}) sig=${sig.slice(0, 8)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Never crash-loop
      console.error(`[write] ${asset.symbol} failed: ${msg}`);
    }
  }
}

setInterval(() => {
  tick().catch((e) => console.error("[tick]", e));
}, cfg.updateIntervalMs);

console.log("Oracle writer running. Ctrl+C to stop.");

// Keeper for settle — permissionless crank (optional). Poll every 2s.
let keeperEnabled = false; // set to true if you want keeper
if (keeperEnabled) {
  console.log("Keeper enabled");
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  wsHandle.close();
  process.exit(0);
});
