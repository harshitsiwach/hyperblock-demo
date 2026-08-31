# TODO — Frontend Polish: BTC Hero Unification + Addictive Loop

> Keep payouts honest (4.5× profit / 5.5× payout), delete SmoothChart, fix market cap, bring addictive to Trade.

## Phase 1 — Unify all assets to BTC Pixi hero (1 day)
- [ ] Delete orphan `app/components/mock/SmoothChart.tsx` (190 lines, `useSmoothPrice` SVG) — no imports remain after hero
- [ ] Remove secondary sparkline inline SVG in `app/components/game-arena.tsx:292-314` (duplicate of hero)
- [ ] Fix market cap `app/components/game-arena.tsx:31` `validIds 13→26` via `SUPPORTED_ASSETS.map(m=>m.marketId)` (also `lever:selectedMarketId`)
- [ ] Audit `app/lib/markets.ts:12` single source — remove any hardcodes `read-snapshot.ts:161 labelMap`, `transaction-flow.ts:1269 symbolForMarket` already uses `MARKETS`
- [ ] Verify hero monochrome `var(--ink)` 2px + 5% fill for all assets `app/components/price-arena.tsx:237`, entry lines only colored
- [ ] Verify `app/assets/[symbol]/chart.tsx:37` already uses `PriceArena` — no SVG fallback remains
- [ ] Add `DECISIONS.md` entry for SmoothChart removal

## Phase 2 — Interactive detail (0.5 day)
- [ ] Ensure detail `app/assets/[symbol]/chart.tsx:110` 320h hero has drag pan `price-arena.tsx:124` + `↪ Return to live`
- [ ] Keep `nicePriceStep 70px` `app/lib/chart-geometry.ts:97` (not static 3 ticks)
- [ ] Remove/comment `hl-v2-ticks` duplicate if redundant vs hero labels

## Phase 3 — Position watching (0.5 day)
- [ ] Extend `MockArena hlHistory 90→120` `app/components/mock/MockArena.tsx:54` to cover 30s past window + 10s settlement
- [ ] Verify `CHART_PAST_MS 30s` vs 120 history does not clip `openedAt`; adjust to 120 or increase window
- [ ] Confirm hero draws all plays `price-arena.tsx:244 x(openedAt)→x(expiresAt) y(entry)` 2/3px + result r7+2.5 + celebrating rings

## Phase 4 — Winning addictive (1 day)
- [ ] Add streak badge `×Streak 🔥` + `NEW BEST` in `MockArena.tsx:301` settlement banner from `storage.ts:69 STREAK_KEY`/`updateStreak`
- [ ] Add countUp fly-to-balance for `mock.balance` `MockArena.tsx:200` (anim 400ms)
- [ ] Add MEGA WIN flash when `gross ≥ coll*5` `app/lib/mock/engine.ts:64` (capped) — extra burst vs normal 14 particles `price-arena.tsx:282`
- [ ] Bring addictive to Trade: enable `WinCelebration` haptic 880Hz + vibrate on `app/components/price-arena.tsx:354` celebratingId (keep DESIGN calm but add burst — approved)
- [ ] Near-miss copy `±0.02%` loss, 8/8 urgency already `MockArena.tsx:273`
- [ ] Escalating haptic `880+30Hz×streak` already `use-mock-trading.ts:99` — surface streak in banner

## Phase 5 — Ticket polish (0.5 day)
- [ ] Align honest payouts: `MockArena.tsx:96 amount*0.9*5 = 4.5× profit` (return 5.5×) matches `domain.ts:81 maximumProfit` — show profit vs return clearly `Win up to +$X profit (→ $Y return)`
- [ ] Add capped pulse at 90%→5× (profit near cap), keep fee 10% `domain.ts:70`
- [ ] Keep `engine.ts:5 MOCK_MAX_PAYOUT_MULTIPLIER 5` `MOCK_FEE_RATE 0.1` honest

## Verification
- [x] `pnpm typecheck` — pass
- [x] `pnpm test` — 110 passed
- [x] `pnpm build` — 36/36 pages, 26 assets SSG
- [x] `cargo test -p leveraged-prediction --lib --locked` — 46 passed
- [ ] Manual `pnpm dev` → `/` mock GOLD, `/assets/GOLD`, `/assets/BTC`, `/trade` all same Pixi hero
- [ ] `pnpm lint` — 55 errors (oracle-reference `any` + `Date.now` purity pre-existing) — not blocking build; fix in next pass if strict
