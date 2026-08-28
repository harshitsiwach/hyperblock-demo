import { fetchAllMids, createHyperliquidWs } from "./hyperliquid.js";
import { loadConfig } from "./config.js";

async function main() {
  const cfg = loadConfig();
  console.log("Hyperliquid probe — config:", JSON.stringify(cfg, null, 2));

  console.log("\n== REST snapshot ==");
  try {
    const mids = await fetchAllMids(cfg.hyperliquidRest);
    console.log(`REST returned ${Object.keys(mids).length} mids`);
    const sampleKeys = Object.keys(mids).slice(0, 20);
    for (const k of sampleKeys) {
      if (k.startsWith("@")) continue;
      console.log(`  ${k}: ${mids[k]}`);
    }
    // check configured assets
    for (const a of cfg.assets) {
      const v = mids[a.symbol];
      if (v) console.log(`✓ ${a.symbol} (dex="${a.dex}") = ${v}`);
      else console.warn(`✗ ${a.symbol} (dex="${a.dex}") NOT FOUND in main mids`);
    }

    // per-dex checks
    const dexes = [...new Set(cfg.assets.map((a) => a.dex).filter(Boolean))];
    for (const dex of dexes) {
      console.log(`\n-- dex "${dex}" --`);
      try {
        const url = cfg.hyperliquidRest;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "allMids", dex }),
        });
        const j = await res.json();
        console.log(JSON.stringify(j, null, 2).slice(0, 800));
      } catch (e) {
        console.error(`dex ${dex} fetch failed`, e);
      }
    }
  } catch (e) {
    console.error("REST failed", e);
  }

  console.log("\n== WS live stream (10s) ==");
  const midsCache = new Map<string, string>();
  const handle = createHyperliquidWs({
    wsUrl: cfg.hyperliquidWs,
    dexes: [...new Set(cfg.assets.map((a) => a.dex).filter(Boolean))],
    onMids: (mids) => {
      for (const [k, v] of Object.entries(mids)) {
        midsCache.set(k, v);
      }
      // print only configured assets
      const line = cfg.assets
        .map((a) => {
          const v = mids[a.symbol] ?? midsCache.get(a.symbol);
          return v ? `${a.symbol}=${v}` : `${a.symbol}=—`;
        })
        .join("  ");
      console.log(new Date().toISOString(), line);
    },
    onError: (e) => console.error("[probe ws]", e),
  });

  setTimeout(() => {
    console.log("\n== probe done ==");
    console.log(`cache size ${midsCache.size}`);
    for (const a of cfg.assets) {
      console.log(`${a.symbol}: ${midsCache.get(a.symbol) ?? "no update"}`);
    }
    handle.close();
    process.exit(0);
  }, 10_000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
