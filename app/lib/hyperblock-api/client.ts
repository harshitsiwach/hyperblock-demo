"use client";

/**
 * Typed client for the Hyperblock betting API (Vercel serverless).
 * Base URL override: NEXT_PUBLIC_HYPERBLOCK_API_URL (defaults to production).
 * Docs: https://github.com/NikoSAN02/hyperblock-api
 */

export const HYPERBLOCK_API_BASE =
  (process.env.NEXT_PUBLIC_HYPERBLOCK_API_URL ?? "https://hyperblock-api.vercel.app").replace(/\/$/, "");

export interface HyperblockApiConfig {
  tokenMint: string;
  tokenDecimals: number;
  erRpcEndpoint: string;
  baseRpcEndpoint: string;
  executionLayer: "base" | "er";
  houseWallet: string;
  claimAmountTokens: number;
  betDurationMs: number;
  settleMaxWaitMs: number;
  suggestedAllowanceTokens: number;
  minStakeTokens: number;
  maxStakeTokens: number;
}

export interface ClaimResponse {
  ok: boolean;
  userWallet: string;
  userAta: string;
  amountTokens: number;
  amountMinor: string;
  signature: string;
  layer: string;
  explorer: string;
}

export interface ApproveParams {
  userWallet: string;
  mint: string;
  tokenDecimals: number;
  delegateWallet: string;
  suggestedAllowanceTokens: number;
  suggestedAllowanceMinor: string;
  rpcEndpoint: string;
  executionLayer: string;
}

export interface ApproveStatus {
  userWallet: string;
  ata: string;
  delegate: string | null;
  delegatedAmountTokens: number;
  layer: string;
  isDelegate: boolean;
}

export interface BalancesResponse {
  executionLayer: string;
  houseWallet: string;
  houseAta: string;
  houseBalanceTokens: number | null;
  userAta: string | null;
  userBalanceTokens: number | null;
}

export type BetDirection = "up" | "down";
export type BetStatus = "pending" | "settling" | "won" | "lost" | "breakeven" | "refunded";

export interface SettledBet {
  id: string;
  userWallet: string;
  token: string;
  direction: BetDirection;
  stakeTokens: number;
  entryPrice: number;
  exitPrice?: number | null;
  payoutTokens?: number | null;
  profitTokens?: number | null;
  feeTokens?: number | null;
  status: BetStatus;
  stakeMinor?: string;
  stakeSignature?: string | null;
  payoutSignature?: string | null;
  expiresAt: number;
  settledAt?: number | null;
  note?: string | null;
}

export interface PlaceResponse extends SettledBet {
  ok: boolean;
}

export class HyperblockApiError extends Error {
  status: number;
  details?: unknown;
  retryAfterMs?: number;
  constructor(status: number, message: string, details?: unknown, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.details = details;
    this.retryAfterMs = retryAfterMs;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HYPERBLOCK_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error ??
      (data as { message?: string })?.message ??
      `Hyperblock API ${res.status}`;
    const details = (data as { details?: unknown })?.details;
    const retryAfterMs =
      (details as { retryAfterMs?: number } | undefined)?.retryAfterMs ??
      (data as { retryAfterMs?: number })?.retryAfterMs;
    throw new HyperblockApiError(res.status, msg, details, retryAfterMs);
  }
  return data as T;
}

export function getApiConfig(): Promise<HyperblockApiConfig> {
  return request<HyperblockApiConfig>("/api/config");
}

export function claimTokens(userWallet: string): Promise<ClaimResponse> {
  return request<ClaimResponse>("/api/claim", {
    method: "POST",
    body: JSON.stringify({ userWallet }),
  });
}

export function getApproveParams(userWallet: string): Promise<ApproveParams> {
  return request<ApproveParams>(`/api/approve-params?userWallet=${encodeURIComponent(userWallet)}`);
}

export function getApproveStatus(userWallet: string): Promise<ApproveStatus> {
  return request<ApproveStatus>(`/api/approve-status?userWallet=${encodeURIComponent(userWallet)}`);
}

export function getBalances(userWallet?: string): Promise<BalancesResponse> {
  const qs = userWallet ? `?userWallet=${encodeURIComponent(userWallet)}` : "";
  return request<BalancesResponse>(`/api/balances${qs}`);
}

export interface PlaceBetArgs {
  userWallet: string;
  token: string;
  direction: BetDirection;
  betAmount: number;
  currentPrice: number;
}

export function placeBet(args: PlaceBetArgs): Promise<PlaceResponse> {
  return request<PlaceResponse>("/api/bets/place", {
    method: "POST",
    // Server enforces a long in-request settlement (~10-30s); do not cache.
    body: JSON.stringify(args),
    cache: "no-store",
  });
}

export function getBetHistory(userWallet: string, limit = 20): Promise<{ bets: SettledBet[] }> {
  return request<{ bets: SettledBet[] }>(
    `/api/bets?userWallet=${encodeURIComponent(userWallet)}&limit=${limit}`,
  );
}

export function formatClaimCooldown(retryAfterMs?: number): string {
  if (!retryAfterMs || !Number.isFinite(retryAfterMs)) return "claim cooldown active";
  return `claim cooldown — try again in ${Math.ceil(retryAfterMs / 1000)}s`;
}
