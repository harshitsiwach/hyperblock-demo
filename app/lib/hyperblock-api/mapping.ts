import type { Play } from "@/app/lib/domain";
import { priceMovePercent } from "@/app/lib/domain";
import type { SettledBet } from "@/app/lib/hyperblock-api/client";

/** Map an onchain settled bet into a local Play so charts/positions reuse existing UI. */
export function settledBetToPlay(bet: SettledBet, marketId: number): Play {
  const openedAt = bet.expiresAt - 10_000;
  const exit = bet.exitPrice ?? bet.entryPrice;
  return {
    id: `onchain-${bet.id}`,
    marketId,
    direction: bet.direction,
    collateralUsd: bet.stakeTokens,
    entryPrice: bet.entryPrice,
    openedAt,
    expiresAt: bet.expiresAt,
    refundAt: bet.expiresAt + 20_000,
    status: bet.status === "pending" || bet.status === "settling" ? "settling" : bet.status,
    priceMovePercent: priceMovePercent(bet.entryPrice, exit, bet.direction),
    liveProfitUsd: bet.profitTokens ?? 0,
    payoutUsd: bet.payoutTokens ?? bet.stakeTokens,
  };
}
