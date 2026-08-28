# Instructions — "HyperBlock" Leveraged Binary Prediction App

> **Project**: Multi-asset leveraged binary prediction market (up/down bets, up to 1000x, short-expiry rounds)
> **Stack**: Solana + Anchor + MagicBlock Ephemeral Rollups (execution) + Hyperliquid API (price oracle) + Next.js/TypeScript (frontend)
> **Context**: Built for the MagicBlock hackathon. MagicBlock Ephemeral Rollups (ER) MUST be the core execution layer. Hyperliquid is used ONLY as the off-chain price source, bridged on-chain by a custom oracle service.

---

## 1. Objective

Clone MagicBlock's `leveraged-prediction` program (binary up/down bets with up to 1000x leverage, short expiry) and extend it so users can bet on the price direction of multiple assets — crypto, FX, commodities, indices — where all prices come from Hyperliquid's public API instead of Pyth.

The user experience: user picks an asset (e.g., BTC, ETH, gold, EUR/USD), picks UP or DOWN, stakes SOL/USDC, waits for the round to expire (10s–5min), and gets paid out automatically by the on-chain program if they were right.

---

## 2. Repositories to Clone / Reference

| Repo | Purpose |
|---|---|
| `https://github.com/magicblock-labs/leveraged-prediction` | **Base program — clone this as our project root** |
| `https://github.com/magicblock-labs/ephemeral-rollups-sdk` | Rust + TS SDK for delegation, session keys, ER transaction routing — add as dependency |
| `https://github.com/magicblock-labs/magicblock-engine-examples` | Reference only: `binary-prediction` example shows pool PDA design, session keys, ephemeral SPL vaults, permissionless settle |

Working directory layout:

```
project-root/
├── leveraged-prediction/   # cloned base (Anchor program)
├── oracle/                 # NEW: off-chain Hyperliquid → on-chain price bridge (Node/TS)
├── app/                    # NEW: Next.js frontend
└── instructions.md         # this file
```

---

## 3. Architecture

```
┌──────────────┐   WebSocket (allMids)   ┌─────────────────┐
│  Hyperliquid │ ──────────────────────▶ │  Oracle Service │ (off-chain, ours)
│  (price feed)│                         │  Node.js / TS   │
└──────────────┘                         └────────┬────────┘
                                                  │ update_price() txs
                                                  ▼
┌──────────────────────────────────────────────────────────┐
│            MagicBlock Ephemeral Rollup (devnet)           │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Pool PDAs  │   │ PriceAccount │   │  Bet accounts  │  │
│  │ (per asset)│   │  (per asset) │   │  (per user bet)│  │
│  └────────────┘   └──────────────┘   └────────────────┘  │
│         Anchor program (delegated to ER, gasless)         │
└──────────────────────────────────────────────────────────┘
                    ▲                           ▲
                    │  place_bet / settle       │  live prices for UI
              ┌─────┴──────┐              ┌─────┴──────┐
              │  Frontend  │ ◀─────────── │ Hyperliquid│ (direct WS for display)
              │  Next.js   │              │     WS     │
              └────────────┘              └────────────┘
```

**Key principle**: the on-chain program never talks to Hyperliquid directly. The oracle service is the ONLY writer of on-chain price accounts, and it is the bridge between Hyperliquid and the Ephemeral Rollup.

---

## 4. Phase 1 — On-Chain Program Changes (Anchor)

Work inside `leveraged-prediction/programs/`.

### 4.1 Add a custom price account

The base program reads Pyth `PriceUpdateV2` accounts. Replace that with our own account that the oracle service writes:

```rust
#[account]
pub struct PriceAccount {
    pub authority: Pubkey,     // oracle service signer — only writer
    pub asset_symbol: [u8; 16],// e.g. "BTC", "EUR-USD", "XAU-USD" (null-padded)
    pub dex: [u8; 8],          // Hyperliquid dex namespace, "" = main perp dex
    pub price: u64,            // price scaled by 1e6 (e.g., $67,432.123456 → 67432123456)
    pub timestamp: i64,        // unix seconds of last update
    pub bump: u8,
}
```

PDA seeds: `[b"price", asset_symbol]` — one price account per asset.

### 4.2 Add `update_price` instruction (oracle-only)

```rust
pub fn update_price(ctx: Context<UpdatePrice>, price: u64) -> Result<()> {
    let price_account = &mut ctx.accounts.price_account;
    require_keys_eq!(
        ctx.accounts.authority.key(),
        price_account.authority,
        ErrorCode::UnauthorizedOracle
    );
    let clock = Clock::get()?;
    price_account.price = price;
    price_account.timestamp = clock.unix_timestamp;
    Ok(())
}
```

Hard requirements:
- `authority` signer must equal `price_account.authority`. No other caller may write prices.
- Reject `price == 0`.

### 4.3 Modify `place_bet`

Replace the Pyth read with a staleness-checked read of `PriceAccount`:

```rust
pub const MAX_PRICE_AGE_SECONDS: i64 = 5; // reject if price older than 5s

let price_account = &ctx.accounts.price_account;
let clock = Clock::get()?;
require!(
    clock.unix_timestamp - price_account.timestamp <= MAX_PRICE_AGE_SECONDS,
    ErrorCode::PriceTooStale
);
require_keys_eq!(pool.price_account, price_account.key(), ErrorCode::WrongPriceFeed);
let opening_price = price_account.price;
```

Keep all existing logic: solvency check (pool must cover max possible payout), min/max stake, bet PDA creation with `opening_price` snapshot, direction, stake, and expiry timestamp.

### 4.4 Modify `settle`

Same pattern: read `PriceAccount`, enforce staleness, compare `opening_price` vs settlement price, pay out `stake * payout_multiplier` on win (house edge via `payout_bps`, e.g. 1.9x instead of 2.0x), push/pay from pool PDA. Keep `settle` permissionless so anyone (our keeper bot) can crank it.

### 4.5 Multi-asset pools

Generalize `initialize` so each pool stores:

```rust
pub struct Pool {
    pub price_account: Pubkey,   // which asset this pool settles against
    pub bet_duration_seconds: i64,
    pub min_stake: u64,
    pub max_stake: u64,
    pub max_open_exposure: u64,  // NEW: cap total unmatched stake per direction
    pub payout_bps: u64,         // e.g. 19000 = 1.9x
    pub house_authority: Pubkey,
    pub bump: u8,
}
```

PDA seeds: `[b"pool", price_account.key()]` — one pool per asset. Add the exposure cap check in `place_bet` (reject if accepting the bet would exceed `max_open_exposure` on that direction).

### 4.6 Ephemeral Rollup wiring

- Use the `ephemeral-rollups-sdk` and the `#[ephemeral]` attribute as in the base repo.
- On `initialize`: create pool + price account on base layer, then delegate BOTH to the ER (`delegate` instruction from the SDK).
- The oracle service sends `update_price` transactions to the **ER RPC endpoint**, not the base layer — the delegated price account lives in the ER during operation.
- Commit state back to base layer periodically (every N minutes or on inactivity) using the SDK's commit flow.

---

## 5. Phase 2 — Oracle Service (`oracle/`)

Node.js + TypeScript service. Dependencies: `ws`, `@solana/web3.js`, `@coral-xyz/anchor`, `dotenv`.

### 5.1 Hyperliquid connection

Mainnet: `wss://api.hyperliquid.xyz/ws` — Testnet: `wss://api.hyperliquid-testnet.xyz/ws`

Subscribe (exact message format — do not deviate):

```json
{ "method": "subscribe", "subscription": { "type": "allMids" } }
```

For non-crypto assets (equities, commodities, FX, indices — these live on builder-deployed perp dexes on Hyperliquid), subscribe per-dex:

```json
{ "method": "subscribe", "subscription": { "type": "allMids", "dex": "<dex-name>" } }
```

Incoming data shape: `{ "channel": "allMids", "data": { "mids": { "BTC": "67432.5", ... } } }` — prices are strings, keyed by coin symbol. Ignore keys starting with `@` (internal indices).

REST fallback (for startup snapshot + reconnect recovery):

```bash
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "allMids"}'
```

Testnet REST: `https://api.hyperliquid-testnet.xyz/info`.

### 5.2 Oracle service behavior

1. On startup: fetch `allMids` via REST to warm the price cache for every configured asset.
2. Maintain in-memory cache: `Map<symbol, { price: number, updatedAt: number }>`.
3. On each WS message, update the cache.
4. Every `UPDATE_INTERVAL_MS` (default 500ms), for each configured asset:
   - Convert price string → `u64` scaled by 1e6: `Math.round(parseFloat(px) * 1_000_000)`.
   - Skip the on-chain write if the price moved less than `MIN_CHANGE_BPS` (default 5 bps) AND the last on-chain write was < 2s ago (saves tx volume while staying within the 5s staleness window).
   - Otherwise send `update_price` to the ER RPC, signed by the oracle keypair.
5. Reliability:
   - Auto-reconnect the WS with exponential backoff (1s → 30s max); on reconnect, re-subscribe and REST-warm the cache.
   - If no price update for an asset in > 5s, log a warning — bets on that asset will fail staleness checks by design.
   - Never crash-loop on a failed tx; log, retry, continue.

### 5.3 Config (`oracle/config.json`)

```json
{
  "assets": [
    { "symbol": "BTC",       "dex": "",     "decimals": 6 },
    { "symbol": "ETH",       "dex": "",     "decimals": 6 },
    { "symbol": "SOL",       "dex": "",     "decimals": 6 },
    { "symbol": "EUR-USD",   "dex": "fx",   "decimals": 6 },
    { "symbol": "XAU-USD",   "dex": "commod", "decimals": 6 }
  ],
  "updateIntervalMs": 500,
  "minChangeBps": 5,
  "hyperliquidWs": "wss://api.hyperliquid-testnet.xyz/ws",
  "hyperliquidRest": "https://api.hyperliquid-testnet.xyz/info",
  "erRpc": "<MAGICBLOCK_DEVNET_ER_RPC>"
}
```

NOTE: exact dex names for FX/commodity markets must be confirmed against the live `allMids` response at implementation time — enumerate the response keys first, then fill config. Do not hardcode guesses.

### 5.4 Keypair management

- Oracle signer keypair from env: `ORACLE_KEYPAIR_PATH`.
- This pubkey must be passed as `authority` when initializing each `PriceAccount`.
- Fund it with devnet SOL before starting.

---

## 6. Phase 3 — Frontend (`app/`)

Next.js 14+ (App Router), TypeScript, Tailwind. Use `@magicblock-labs/ephemeral-rollups-sdk` TS package + `@solana/wallet-adapter`.

### 6.1 Pages/components

- **Asset selector**: grid of supported assets with live price (direct Hyperliquid WS subscription for display only — never use display prices for settlement logic).
- **Trading panel**: UP / DOWN buttons, stake input, payout display (`stake × payout_bps/10000`), leverage selector capped by pool config, round countdown timer.
- **Position feed**: user's open/closed bets, live PnL direction indicator, settle status.
- **Pool stats**: house liquidity, open exposure per direction, recent settlements.

### 6.2 Flow

1. Connect wallet → create session key via ER SDK (sign once, then gasless popup-free betting).
2. Deposit to ephemeral vault (follow the `binary-prediction` example's ephemeral SPL flow).
3. `place_bet` via ER RPC → show entry price snapshot + expiry countdown.
4. Keeper bot (simple cron in `oracle/` service) calls permissionless `settle` for expired bets; frontend also allows the user to settle their own bet.
5. Withdraw from vault back to wallet (undelegate/commit flow from the SDK).

### 6.3 UX requirements

- Show a clear "price feed: Hyperliquid" label and last-update timestamp per asset.
- If an asset's price is stale (WS gap), disable its UP/DOWN buttons client-side (the on-chain check is the backstop, not the UX).
- All times in the user's local timezone.

---

## 7. Asset Support & Market-Hours Rules

- Crypto (main perp dex): 24/7 — always tradeable.
- FX / commodities / indices / equities (builder dexes): these markets CLOSE (weekends, and equities outside US hours). Implement gating:
  - Oracle service: when a dex's mids stop updating (no change for > 60s), mark asset `marketClosed` and stop writing prices (staleness check then blocks bets naturally).
  - Frontend: gray out closed assets with a "market closed" badge.
- Start with crypto-only for the hackathon demo (BTC, ETH, SOL); structure config so FX/commodity assets are a config-only addition.

---

## 8. Security Requirements (non-negotiable)

1. `update_price` is oracle-authority-only (§4.2).
2. Every bet reads a price ≤ 5s old (§4.3).
3. Pool solvency check before accepting any bet: `pool_balance >= potential_payout + existing_liability`.
4. `max_open_exposure` per pool per direction (§4.5).
5. `settle` is permissionless and trustless — no admin path to alter outcomes.
6. No `unwrap()` in program code; use Anchor errors with a dedicated `ErrorCode` enum.
7. Never hardcode private keys; env vars only.
8. All arithmetic in the program: checked math (`checked_mul`/`checked_add`).

---

## 9. Local Development & Testing

### 9.1 Setup

```bash
# Terminal 1: base validator + ER + (their bundled oracle replaced by ours)
cd leveraged-prediction && yarn && yarn build && yarn setup

# Terminal 2: our oracle service
cd oracle && yarn && ORACLE_KEYPAIR_PATH=./oracle-keypair.json yarn dev

# Terminal 3: tests
cd leveraged-prediction && yarn test:local
```

### 9.2 Required tests (write before UI work)

- `place_bet` succeeds with fresh price; records opening price correctly.
- `place_bet` FAILS with price older than 5s (`PriceTooStale`).
- `place_bet` FAILS from wrong price account for the pool (`WrongPriceFeed`).
- `update_price` FAILS from non-authority signer (`UnauthorizedOracle`).
- `settle` pays out correctly on win; pool keeps stake on loss; tie (open == close) → refund stake.
- Multi-asset: two pools (BTC, ETH) settle independently.
- Exposure cap: bet rejected when it would exceed `max_open_exposure`.
- End-to-end: real Hyperliquid testnet WS → oracle → ER → bet → settle.

### 9.3 Deployment targets

1. Local (base validator + local ER).
2. MagicBlock devnet ER — get endpoints from MagicBlock docs; request hackathon devnet access if gated.
3. Do NOT deploy to mainnet. Hackathon scope only.

---

## 10. Work Plan for the Agent (execute in order)

1. **Clone + baseline**: clone `leveraged-prediction`, get the existing tests passing locally with `yarn setup` / `yarn test:local`. Do not modify anything until the baseline runs.
2. **Program**: implement §4 changes (PriceAccount, update_price, place_bet/settle oracle swap, multi-asset pools, exposure caps). Add §9.2 unit tests. Keep everything else from the base repo intact.
3. **Oracle service**: implement §5. First deliverable: a script that just prints live Hyperliquid testnet mids for configured symbols (validates API + symbols). Second deliverable: full on-chain writer against local ER.
4. **E2E**: wire oracle → local ER → place/settle bets from CLI scripts. Record tx signatures.
5. **Frontend**: §6 build, in this order: asset list w/ live prices → place bet → settle → history.
6. **Demo polish**: seed pools with house liquidity, create a 60-second demo script (open round on BTC, bet UP, settle, show payout).

---

## 11. Coding Conventions

- Rust: Anchor 0.30+ patterns; `declare_id!` unchanged from base repo; run `cargo fmt` and `anchor build` clean.
- TypeScript: strict mode; ESLint clean; no `any`.
- Commits: conventional commits (`feat:`, `fix:`, `test:`).
- Keep diffs minimal against the base repo — hackathon judges will diff; our value-add is the Hyperliquid oracle bridge + multi-asset pools, not rewrites.
- Document every deviation from this file in `DECISIONS.md` with a one-line rationale.

---

## 12. Reference Links

- Base repo: https://github.com/magicblock-labs/leveraged-prediction
- ER SDK: https://github.com/magicblock-labs/ephemeral-rollups-sdk
- Binary prediction reference: https://github.com/magicblock-labs/magicblock-engine-examples
- MagicBlock docs: https://docs.magicblock.gg
- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Hyperliquid WS subscriptions: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions
- Hyperliquid testnet: https://api.hyperliquid-testnet.xyz (REST), wss://api.hyperliquid-testnet.xyz/ws (WS)

---

## 13. Definition of Done (hackathon MVP)

- [ ] Local E2E passes: Hyperliquid testnet price → on-chain PriceAccount → bet → settle → payout
- [ ] At least 3 crypto assets live simultaneously (BTC, ETH, SOL)
- [ ] Staleness, authority, solvency, and exposure-cap tests all pass
- [ ] Frontend: connect wallet, session key, place UP/DOWN bet, watch countdown, auto-settle, see payout
- [ ] 60-second demo video scripted and reproducible
- [ ] No mainnet deploys, no real funds, no hardcoded keys
