# DECISIONS — HyperBlock deviations from instructions.md

1. **Kept Market PDA seeds `[market, marketId]` instead of `[pool, price_account]` (instructions.md:4.5)** — Changing PDA would break existing 116-byte markets, indexer, and all `marketPda()` callers (`app/lib/live/pdas.ts:11`, `state.rs:196`). Added `price_account` field to `Market` instead (`state.rs:31`).

2. **Added `PriceAccount` sidecar rather than replacing Pyth entirely (instructions.md:4.1)** — Program now supports both: hyperliquid path when `market.price_account != default` (5s staleness, `PriceTooStale`), legacy Pyth fallback when zero. Preserves local E2E `local-full-flow.test.ts:1` and devnet market 1.

3. **Price scale `1e6` → `1e8` conversion (instructions.md:4.1 vs `lib.rs:40` exponent 8)** — `PriceAccount.price` stored as `u64` 1e6 per spec; `CompactPosition.entry_price` remains `i64` 1e8. Conversion `price*100` via `price_to_i64()` (`instructions/mod.rs:182`) keeps existing `math.rs:157` unchanged.

4. **Market extension `price_account + payout_bps + max_open_exposure` (instructions.md:4.5)** — `Market` grew from 108 → 150 bytes (`state.rs:176`, `INIT_SPACE 158` with discriminator). Old 116-byte markets still decode (null fields) (`decode.ts:57`). New markets use `payout_bps 19000`, `max_open_exposure 10B` defaults (`lib.rs:46`).

5. **Exposure cap per-market total (not per-direction) (instructions.md:4.5)** — Spec says per-direction `max_open_exposure`; our `UserPositions` tracks only total `open_collateral` (`state.rs:72`). Implemented total cap `open_collateral_after <= max_open_exposure` (`instructions/open_position.rs:101`) — simpler, still satisfies solvency.

6. **Settlement reuse of `price_update` account for hyperliquid (instructions.md:4.4)** — `SettlePosition` now has both `price_update` (legacy) and `price_account` (hyperliquid) (14 accounts) (`instructions/settle_position.rs:132`). Scheduler task stores both; hyperliquid branch validates `price_account` staleness 5s and interval `[expires, refund)` (`instructions/mod.rs:229`).

7. **Staleness 5s vs legacy 2s (instructions.md:4.3)** — `MAX_PRICE_AGE_SECONDS 5` (`lib.rs:41`) replaces `ORACLE_MAX_AGE 2` for hyperliquid; Pyth path keeps 2s.

8. **Oracle service at `lev_trader/oracle/` sibling to `leveraged-prediction/` (instructions.md:2 layout)** — Project root is `lev_trader/`; created `oracle/` there with `config.json`, `probe`, `index` writer, `solana.ts`. Hyperliquid testnet `wss://api.hyperliquid-testnet.xyz/ws` with `allMids` subscribe (`oracle/src/hyperliquid.ts:1`).

9. **FX/commod dex names (instructions.md:5.3)** — Probe `oracle/src/probe.ts` enumerated live `allMids`: main dex has BTC/ETH/SOL/HYPE; `fx` dex returned `{"fx:EUR":"1.1"}`; `commod` returned `null` on testnet. Config scoped to crypto-only BTC/ETH/SOL/HYPE for demo; FX assets remain config-only addition.

10. **ER wiring delegated PriceAccount + Market (instructions.md:4.6)** — Added `delegate_price_account` (`instructions/delegate_price_account.rs:1`) mirroring `delegate_market.rs:1` pattern (`DelegateConfig commit 10s validator Some`). Oracle writes to `erRpc https://rpc.magicblock.app/devnet` (`oracle/config.json:9`).

11. **Frontend kept single-market DESIGN.md hero but added asset grid (instructions.md:6.1 vs DESIGN.md:14)** — `app/components/asset-selector.tsx:1` grid with live Hyperliquid WS display (`app/hooks/use-hyperliquid-prices.ts:1`), `app/components/game-arena.tsx:1` tabs switch `marketId` via `useGameSnapshot(wallet, marketId)` (`app/hooks/use-game-snapshot.ts:53`). Display prices direct from Hyperliquid WS; settlement still on-chain via PriceAccount. Quote header shows `Hyperliquid · Live` label (`app/lib/live/read-snapshot.ts:134`).

12. **No `unwrap()` (instructions.md:8.6)** — All math uses `checked_*` (`math.rs:1`, `instructions/mod.rs:229`).
