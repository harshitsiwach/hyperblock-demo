/**
 * On-chain bet record, reconstructed purely from RPC data (no API dependency).
 *
 * Every onchain round leaves two Token-2022 `transferChecked` transfers between
 * the user's ATA and the house ATA:
 *   1. stake pull  user ATA -> house ATA (authority = house delegate)
 *   2. payout      house ATA -> user ATA (authority = house)
 * Faucet claims are also house -> user transfers, identified by having no open
 * stake ahead of them when walking oldest -> newest.
 */

export interface ChainTransfer {
  signature: string;
  slot: number;
  blockTime: number | null;
  source: string;
  destination: string;
  authority: string;
  rawAmount: bigint;
}

export interface OnchainBetRecord {
  kind: "bet";
  stakeTokens: number;
  payoutTokens: number;
  pnlTokens: number;
  stakeSignature: string;
  payoutSignature: string | null;
  /** "settling" when the stake pull is seen but no payout yet. */
  status: "settled" | "settling";
  stakeTime: number;
  payoutTime: number | null;
}

export interface FaucetClaimRecord {
  kind: "claim";
  amountTokens: number;
  signature: string;
  time: number;
}

export type HistoryRecord = OnchainBetRecord | FaucetClaimRecord;

const DEVNET_RPC_FALLBACK = "https://rpc.magicblock.app/devnet";

export function resolveHistoryRpc(): string {
  const env = (process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT ?? "").trim();
  return (env || DEVNET_RPC_FALLBACK).replace(/\/$/, "");
}

async function rpc<T>(endpoint: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} -> HTTP ${res.status}`);
  const data = (await res.json()) as { result?: T; error?: { message?: string } };
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message ?? "unknown error"}`);
  return data.result as T;
}

interface SigInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
}

function toTokens(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

/** Extract userATA<->houseATA transferChecked legs from one parsed transaction. */
function extractLegs(
  tx: {
    meta?: { err?: unknown; preTokenBalances?: unknown; postTokenBalances?: unknown } | null;
    transaction?: { message?: { instructions?: Array<{ program?: string; parsed?: { type?: string; info?: Record<string, unknown> } }> } } | null;
  } | null,
  sig: SigInfo,
  userAta: string,
  houseAta: string,
  mint: string,
  decimals: number,
): ChainTransfer[] {
  if (!tx || tx.meta?.err) return [];
  const ixs = tx.transaction?.message?.instructions ?? [];
  const legs: ChainTransfer[] = [];
  for (const ix of ixs) {
    const parsed = ix.parsed;
    if (!parsed || parsed.type !== "transferChecked") continue;
    const info = parsed.info ?? {};
    const source = typeof info.source === "string" ? info.source : "";
    const destination = typeof info.destination === "string" ? info.destination : "";
    const authority = typeof info.authority === "string" ? info.authority : "";
    const txMint = typeof info.mint === "string" ? info.mint : "";
    if (txMint !== mint) continue;
    const involvesUser =
      (source === userAta && destination === houseAta) ||
      (source === houseAta && destination === userAta);
    if (!involvesUser) continue;
    const rawAmt = info.tokenAmount ?? info.amount;
    let raw: bigint | null = null;
    if (typeof rawAmt === "string" && /^\d+$/.test(rawAmt)) raw = BigInt(rawAmt);
    else if (rawAmt && typeof rawAmt === "object") {
      const amt = (rawAmt as Record<string, unknown>).amount;
      if (typeof amt === "string" && /^\d+$/.test(amt)) raw = BigInt(amt);
    }
    if (raw === null) continue;
    legs.push({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
      source,
      destination,
      authority,
      rawAmount: raw,
    });
  }
  return legs;
}

export interface HistoryInput {
  userAta: string;
  houseAta: string;
  mint: string;
  decimals: number;
  /** RPC endpoint; defaults to NEXT_PUBLIC_SOLANA_RPC_ENDPOINT. */
  rpcEndpoint?: string;
  /** Max signatures to scan (covers ~limit/2 rounds). Default 30. */
  limit?: number;
  /** Fetch details for signatures not in this cache (sig -> tx json). */
  txCache?: Map<string, unknown>;
}

/**
 * Fetch + pair the on-chain record for a user's ATA.
 * Returns records newest-first, plus the (possibly updated) tx cache.
 */
export async function fetchOnchainHistory(input: HistoryInput): Promise<{
  records: HistoryRecord[];
  txCache: Map<string, unknown>;
}> {
  const endpoint = (input.rpcEndpoint ?? resolveHistoryRpc()).replace(/\/$/, "");
  const limit = input.limit ?? 30;
  const txCache = input.txCache ?? new Map<string, unknown>();
  const { userAta, houseAta, mint, decimals } = input;

  const sigs = await rpc<SigInfo[]>(endpoint, "getSignaturesForAddress", [userAta, { limit }]);
  const okSigs = (sigs ?? []).filter((s) => !s.err);
  const missing = okSigs.filter((s) => !txCache.has(s.signature));
  // Bounded parallelism to stay polite to public RPCs.
  const CONCURRENCY = 6;
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const chunk = missing.slice(i, i + CONCURRENCY);
    const txs = await Promise.all(
      chunk.map((s) =>
        rpc<unknown>(endpoint, "getTransaction", [
          s.signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ]).catch(() => null),
      ),
    );
    chunk.forEach((s, j) => {
      // Never cache failures: a null right after settlement is usually RPC lag,
      // and caching it would pin the stake as "settling" forever.
      if (txs[j]) txCache.set(s.signature, txs[j]);
      else txCache.delete(s.signature);
    });
  }

  // Walk oldest -> newest, pairing each stake pull with the next house payout.
  const chronological = [...okSigs].reverse();
  const records: HistoryRecord[] = [];
  let openStake: { amountTokens: number; signature: string; time: number } | null = null;
  const txTime = (sig: SigInfo) => (sig.blockTime ? sig.blockTime * 1000 : Date.now());

  for (const sig of chronological) {
    const legs = extractLegs(
      txCache.get(sig.signature) as Parameters<typeof extractLegs>[0],
      sig,
      userAta,
      houseAta,
      mint,
      decimals,
    );
    for (const leg of legs) {
      const tokens = toTokens(leg.rawAmount, decimals);
      if (leg.source === userAta && leg.destination === houseAta) {
        // New stake pull. If a previous stake never paid out, close it as settling.
        if (openStake) {
          records.push({
            kind: "bet",
            stakeTokens: openStake.amountTokens,
            payoutTokens: 0,
            pnlTokens: -openStake.amountTokens,
            stakeSignature: openStake.signature,
            payoutSignature: null,
            status: "settling",
            stakeTime: openStake.time,
            payoutTime: null,
          });
        }
        openStake = { amountTokens: tokens, signature: leg.signature, time: txTime(sig) };
      } else {
        // house -> user: payout for the open stake, otherwise a faucet claim.
        if (openStake) {
          records.push({
            kind: "bet",
            stakeTokens: openStake.amountTokens,
            payoutTokens: tokens,
            pnlTokens: tokens - openStake.amountTokens,
            stakeSignature: openStake.signature,
            payoutSignature: leg.signature,
            status: "settled",
            stakeTime: openStake.time,
            payoutTime: txTime(sig),
          });
          openStake = null;
        } else {
          records.push({ kind: "claim", amountTokens: tokens, signature: leg.signature, time: txTime(sig) });
        }
      }
    }
  }
  if (openStake) {
    records.push({
      kind: "bet",
      stakeTokens: openStake.amountTokens,
      payoutTokens: 0,
      pnlTokens: -openStake.amountTokens,
      stakeSignature: openStake.signature,
      payoutSignature: null,
      status: "settling",
      stakeTime: openStake.time,
      payoutTime: null,
    });
  }

  return { records: records.reverse(), txCache };
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
