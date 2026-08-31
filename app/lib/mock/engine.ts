import type { Direction, Play } from "@/app/lib/domain";
import { estimateProfit, priceMovePercent } from "@/app/lib/domain";

export const MOCK_ROUND_SECONDS = 10;
export const MOCK_REFUND_SECONDS = 10;
export const MOCK_MAX_POSITIONS = 8;
export const MOCK_FEE_RATE = 0.1;
export const MOCK_MAX_PAYOUT_MULTIPLIER = 5;

export function createMockPlay(params: {
  marketId: number;
  direction: Direction;
  collateralUsd: number;
  entryPrice: number;
  now?: number;
}): Play {
  const now = params.now ?? Date.now();
  return {
    id: `mock-${params.marketId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    marketId: params.marketId,
    direction: params.direction,
    collateralUsd: params.collateralUsd,
    entryPrice: params.entryPrice,
    openedAt: now,
    expiresAt: now + MOCK_ROUND_SECONDS * 1000,
    refundAt: now + (MOCK_ROUND_SECONDS + MOCK_REFUND_SECONDS) * 1000,
    status: "active",
    priceMovePercent: 0,
    liveProfitUsd: 0,
  };
}

export function settleMockPlay(
  play: Play,
  settlePrice: number,
  now: number,
): { play: Play; payoutUsd: number; profitUsd: number } {
  if (now < play.expiresAt) {
    // not yet expired - just update live
    return {
      play: { ...play, ...updateLive(play, settlePrice, now) },
      payoutUsd: 0,
      profitUsd: 0,
    };
  }
  if (now >= play.refundAt) {
    // refund window passed - refund stake
    return {
      play: { ...play, status: "refunded", payoutUsd: play.collateralUsd, priceMovePercent: 0, liveProfitUsd: 0 },
      payoutUsd: play.collateralUsd,
      profitUsd: 0,
    };
  }
  // tie
  if (settlePrice === play.entryPrice) {
    return {
      play: { ...play, status: "breakeven", payoutUsd: play.collateralUsd, priceMovePercent: 0, liveProfitUsd: 0 },
      payoutUsd: play.collateralUsd,
      profitUsd: 0,
    };
  }
  const gross = play.collateralUsd * 1000 * ((play.direction === "up" ? settlePrice - play.entryPrice : play.entryPrice - settlePrice) / play.entryPrice);
  if (gross >= 0) {
    const capped = Math.min(gross, play.collateralUsd * MOCK_MAX_PAYOUT_MULTIPLIER);
    const fee = capped * MOCK_FEE_RATE;
    const payout = play.collateralUsd + capped - fee;
    const profit = capped - fee;
    return {
      play: { ...play, status: "won", payoutUsd: payout, priceMovePercent: priceMovePercent(play.entryPrice, settlePrice, play.direction), liveProfitUsd: profit },
      payoutUsd: payout,
      profitUsd: profit,
    };
  } else {
    const loss = Math.min(Math.abs(gross), play.collateralUsd);
    const payout = play.collateralUsd - loss;
    const profit = -loss;
    const status = payout === 0 ? "lost" : "lost";
    return {
      play: { ...play, status, payoutUsd: payout, priceMovePercent: priceMovePercent(play.entryPrice, settlePrice, play.direction), liveProfitUsd: profit },
      payoutUsd: payout,
      profitUsd: profit,
    };
  }
}

function updateLive(play: Play, currentPrice: number, now: number): Partial<Play> {
  if (play.status !== "active" && play.status !== "settling" && play.status !== "refunding") return {};
  return {
    priceMovePercent: priceMovePercent(play.entryPrice, currentPrice, play.direction),
    liveProfitUsd: estimateProfit(play.collateralUsd, play.entryPrice, currentPrice, play.direction),
    status: now < play.expiresAt ? "active" : now < play.refundAt ? "settling" : "refunding",
  };
}

export function updateMockPlayLive(play: Play, currentPrice: number, now: number): Play {
  if (["won", "lost", "breakeven", "refunded", "submitting"].includes(play.status)) return play;
  const move = priceMovePercent(play.entryPrice, currentPrice, play.direction);
  const profit = estimateProfit(play.collateralUsd, play.entryPrice, currentPrice, play.direction);
  const nextStatus = now < play.expiresAt ? "active" : now < play.refundAt ? "settling" : "refunding";

  if (play.priceMovePercent === move && play.liveProfitUsd === profit && play.status === nextStatus) {
    return play;
  }
  return {
    ...play,
    priceMovePercent: move,
    liveProfitUsd: profit,
    status: nextStatus as Play["status"],
  };
}
