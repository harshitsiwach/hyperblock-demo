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

13. **Removed `SmoothChart.tsx` SVG dual-chart (vs `MockArena.tsx:204` + `game-arena.tsx:292`)** — Pixi `PriceArena` hero is single renderer for all assets (monochrome `var(--ink)` per `DESIGN.md:42`, entry lines time-bound `x(openedAt)→x(expiresAt)` `price-arena.tsx:258`). Svg `index-based x=i/(n-1)` hid wall-clock and entry timing. Deleted 190-line orphan; both `/` mock and `/assets/[symbol]` detail + `/trade` now share wall-clock 45s window (`chart-geometry.ts:3`) — verifies monochrome + history as truth.

14. **Fixed `validIds 13→26` `game-arena.tsx:31` via `SUPPORTED_ASSETS.map(m=>m.marketId)` (`app/lib/markets.ts:12` single source)** — prior cap hid DOGE/AVAX/ARB/AAVE + 12 xyz assets (AAPL…DXY). Now all 26 MARKETS selectable; matches `oracle-reference/config.json` 26 assets.

15. **Honest payouts 4.5× profit / 5.5× payout (`app/lib/domain.ts:81` 5× capped before 10% fee) kept for both mock + Trade** — `MockArena.tsx:96` `amount*5*0.9` equals engine `app/lib/mock/engine.ts:64` + program `math.rs:157`. Ticket now shows `Win up to +$X profit → $Y return` not misleading 1.9×. `DESIGN.md:29` 1.9× was pre-leverage story; corrected to leverage model.

16. **Addictive on both mock + Trade (user-approved)** — `WinCelebration` haptics 880Hz+vibrate + `price-arena.tsx:269` 14 particles on `celebratingId` now enabled for Trade via `persistent.celebratingIds` (`game-arena.tsx:286`) as well as MockArena, contrary to `DESIGN.md:207` calm-only. Streak `storage.ts:69` still mock-only.

17. **Extended `generateStaticParams` `app/assets/[symbol]/page.tsx:4` 13→26** — added DOGE/AVAX/ARB/AAVE/MSFT/GOOGL/AMZN/META/COPPER/PLATINUM/PALLADIUM/SP500/DXY so all `MARKETS` have SSG.

18. **Extended `hlHistory 90→120` `MockArena.tsx:54` + detail already 120 `chart.tsx:19`** — covers 30s past + 15s future + 10s settlement without clipping entry lines at `CHART_PAST_MS 30s` edge.

19. **Mock balance countUp 420ms + `is-bump` + `mock-capped` pulse + MEGA WIN `capped 5×` flash + streak `×N 🔥`/`NEW BEST` + near-miss `0.01%` (`MockArena.tsx:138-172`, `app/hooks/use-mock-trading.ts:86`)** — addictive loop; honest `maxProfit $`/`maxReturn $` ticket, `Win up to +$X` now `maxProfit` not payout confusion.
