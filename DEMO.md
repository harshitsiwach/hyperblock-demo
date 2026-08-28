# HyperBlock — 60s Demo Script (MagicBlock Hackathon, devnet)

**Stack:** Solana devnet + MagicBlock ER (devnet) + Hyperliquid testnet oracle + Next.js

### Pre-reqs

```bash
# 1. Build program (Rust available)
cargo test -p leveraged-prediction --lib --locked   # 46 passed
# anchor build --ignore-keys  # requires Anchor CLI; cargo test is sufficient for CI

# 2. Frontend deps
cd leveraged-prediction && pnpm install && pnpm test # 110 passed
cd ../oracle && pnpm install
```

### 1. Fund oracle keypair (devnet)

```bash
# generate or reuse
solana-keygen new --no-outfile --silent --no-bip39-passphrase > /tmp/oracle.json
# ORACLE_KEYPAIR_PATH must match PriceAccount.authority
export ORACLE_KEYPAIR_PATH=/tmp/oracle.json
solana airdrop 2 $(solana-keygen pubkey $ORACLE_KEYPAIR_PATH) --url https://rpc.magicblock.app/devnet
```

### 2. Probe Hyperliquid (validates API + symbols, instructions.md:5.3 first deliverable)

```bash
cd oracle
pnpm probe
# expect:
#   BTC=~79500  ETH=~2450 SOL=~97.5 HYPE=~54
#   fx dex -> fx:EUR 1.1 (symbol “EUR” not “EUR-USD” — documented in DECISIONS.md:9)
```

### 3. Initialize PriceAccounts + Markets (devnet, delegated to ER)

PriceAccounts per asset (BTC, ETH, SOL, HYPE) + Markets 1-4:

```bash
# init price accounts (one per asset, PDA [price, symbol])
cd oracle
ORACLE_KEYPAIR_PATH=./oracle-keypair.json pnpm exec tsx src/init.ts
# delegates: delegate_price_account for each symbol with validator from Router
#   get validator via: curl -X POST https://devnet-router.magicblock.app/ -d '{"jsonrpc":"2.0","id":1,"method":"getDelegationStatus","params":["<marketPda>"]}'
# markets: initialize_market_with_price_account  marketId 1 (BTC), 2 (ETH), 3 (SOL), 4 (HYPE)
#   payout_bps 19000 (1.9x), max_open_exposure 10B (10k USDC)
# delegate_market for each marketId with same validator (pin same ER)
# seed liquidity:
#   deposit_liquidity 101_000_000_000 (101k USDC) via erConnection
```

> The repo ships `oracle/src/init.ts` as a minimal initializer; full delegation + ATA seeding mirrors `leveraged-prediction/scripts/bootstrap-devnet.mjs:1` (uses `delegateSpl`, `initEphemeralAtaIx`). For a clean demo, run the existing bootstrap then `init.ts` to add hyperliquid markets 2-4.

### 4. Start oracle writer (second deliverable, instructions.md:5.2)

```bash
cd oracle
ORACLE_KEYPAIR_PATH=./oracle-keypair.json pnpm dev
# every 500ms:
#   fetch allMids, priceToU64(*1e6), bps diff >=5 or 2s elapsed → update_price on ER RPC
# logs: [write] BTC 79573.5 -> 79573500000 sig=...
# stale warning: [warn] BTC price age 6000ms >5s
```

The writer sends `update_price` to `erRpc https://rpc.magicblock.app/devnet` (delegated PriceAccount lives on ER). `PriceAccount.timestamp` is clock.unix_timestamp.

### 5. Frontend

```bash
cd leveraged-prediction
NEXT_PUBLIC_MARKET_ID=1 pnpm dev
# open http://127.0.0.1:3000?market=1
# - asset selector: BTC/ETH/SOL/HYPE tabs, live price from Hyperliquid WS (display only), “Hyperliquid · Live”
# - quote: “BTC / USD · Hyperliquid” pill
# - ticket: Play up / Play down disabled when feed stale (>5s) or market close-only
# - Connect wallet (devnet) → SessionGate: 1) Deposit to arena (base + delegate) 2) Activate session (ER approve)
# - Get test funds -> faucet mints test USDC on ER
```

### 6. 60s live round

1. **0s** – Pick BTC tab (marketId 1), stake $10, click **Play up** → `open_position` via ER session signer. Entry price snapshot from `PriceAccount` (5s staleness check `instructions/open_position.rs:32`), next nonce, 10s expiry.
2. **0-10s** – Chart shows entry line, countdown, live Hyperliquid price ticks (direct WS) and on-chain price history from ER `PriceAccount` WS.
3. **10s** – `expires_at` → MagicBlock scheduler retries `settle_position` every 1s ×25 (`instructions/open_position.rs:152`). Keeper also cranks permissionless `settle` (every 2s in `oracle/src/index.ts` if enabled).
4. **10-12s** – Settlement reads `PriceAccount` again, checks staleness 5s, age within `[expires, refund)` (10s buffer), computes `calculate_settlement` (`math.rs:157`), capped 5× before 10% fee → payout `stake*1.9` on win, refund on tie (`open==close`), 0 on loss. Pool solvency checked before bet (`math.rs:118`), exposure cap `max_open_exposure` (`state.rs:31`).
5. **12s** – `YourPlays` row flips to **Won +$9.00 / Lost / Breakeven**; `PositionClosed` event emitted (`lib.rs:88`). Payout transferred from `pool_token_account` (market PDA `MARKET_SEED`) to `user_token_account` or fallback escrow (`payout_escrow_token_account` `instructions/settle_position.rs:75`).

Repeat on ETH tab (marketId 2) to show multi-asset pools settle independently.

### 7. Verify

```bash
cargo test -p leveraged-prediction --lib --locked
pnpm test
pnpm typecheck
pnpm build # Next.js production
```

### 8. Notes

- **Solvency:** `pool >= existing + after*5 + pool*10%` (`math.rs:118`).
- **Authority:** `update_price` signer == `PriceAccount.authority` (`instructions/update_price.rs:1`).
- **Staleness:** 5s (`lib.rs:41` `MAX_PRICE_AGE_SECONDS`), on-chain check `instructions/mod.rs:190`, client disables buttons when `feedHealth != live`.
- **Commit:** `DelegateConfig commit 10s` (`instructions/mod.rs:70`), validator pinned to same ER for PriceAccount + Market + UserPositions.
- No mainnet deploys, no hardcoded keys (`dotenv` only).
