"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createApproveCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  claimTokens,
  getApiConfig,
  getApproveParams,
  getApproveStatus,
  getBalances,
  placeBet as apiPlaceBet,
  type ApproveParams,
  type ApproveStatus,
  type BalancesResponse,
  type BetDirection,
  type HyperblockApiConfig,
  type PlaceResponse,
  HyperblockApiError,
} from "@/app/lib/hyperblock-api/client";

interface UseHyperblockAccountOptions {
  /** Poll onchain tUSD balance while mounted. Default true. */
  pollBalances?: boolean;
  pollIntervalMs?: number;
}

export function useHyperblockAccount(opts?: UseHyperblockAccountOptions) {
  const { publicKey, sendTransaction } = useWallet();
  const address = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  const [config, setConfig] = useState<HyperblockApiConfig | null>(null);
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [approveStatus, setApproveStatus] = useState<ApproveStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [approving, setApproving] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Client-side faucet cooldown (server enforces 30s; 429s self-correct this). */
  const [claimCooldownUntil, setClaimCooldownUntil] = useState<number | null>(null);

  const pollBalances = opts?.pollBalances ?? true;
  const pollIntervalMs = opts?.pollIntervalMs ?? 15_000;

  // Public integration config (mint, decimals, claim size, limits) — once.
  useEffect(() => {
    let cancelled = false;
    getApiConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalances(null);
      setApproveStatus(null);
      return;
    }
    try {
      const [b, a] = await Promise.all([getBalances(address), getApproveStatus(address)]);
      setBalances(b);
      setApproveStatus(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "balance refresh failed");
    }
  }, [address]);

  useEffect(() => {
    void refresh();
    if (!pollBalances || !address) return;
    const id = setInterval(() => void refresh(), pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollBalances, pollIntervalMs, address]);

  const tusdBalance = balances?.userBalanceTokens ?? null;

  // ---- Faucet cooldown (persists per wallet so refresh doesn't reset it) ----
  const claimCooldownKey = address ? `hyperblock:claim-cooldown:${address}` : null;
  useEffect(() => {
    if (!claimCooldownKey) {
      setClaimCooldownUntil(null);
      return;
    }
    try {
      const v = Number(localStorage.getItem(claimCooldownKey));
      setClaimCooldownUntil(Number.isFinite(v) && v > Date.now() ? v : null);
    } catch {
      setClaimCooldownUntil(null);
    }
  }, [claimCooldownKey]);

  // Tick while cooling down so the countdown re-renders, then clear.
  useEffect(() => {
    if (!claimCooldownUntil) return;
    if (claimCooldownUntil <= Date.now()) {
      setClaimCooldownUntil(null);
      return;
    }
    const id = setInterval(() => {
      setClaimCooldownUntil((u) => (u && u > Date.now() ? u : null));
    }, 500);
    return () => clearInterval(id);
  }, [claimCooldownUntil]);

  const claimCooldownSec = claimCooldownUntil
    ? Math.max(0, Math.ceil((claimCooldownUntil - Date.now()) / 1000))
    : 0;

  const rememberClaimCooldown = useCallback(
    (ms: number) => {
      const until = Date.now() + ms;
      setClaimCooldownUntil(until);
      try {
        if (claimCooldownKey) localStorage.setItem(claimCooldownKey, String(until));
      } catch {}
    },
    [claimCooldownKey],
  );

  /** True when the server is an SPL delegate for at least `amount` tokens. */
  const isApprovedFor = useCallback(
    (amount: number) => {
      if (!approveStatus?.isDelegate) return false;
      return (approveStatus.delegatedAmountTokens ?? 0) >= amount;
    },
    [approveStatus],
  );

  /** Claim faucet tUSD to the connected wallet. */
  const claim = useCallback(async (): Promise<{ signature: string; amountTokens: number }> => {
    if (!address) throw new Error("Connect a Solana wallet to claim tUSD");
    setClaiming(true);
    setError(null);
    try {
      const res = await claimTokens(address);
      // Server default cooldown is 30s (CLAIM_COOLDOWN_MS); 429s correct this if different.
      rememberClaimCooldown(30_000);
      await refresh();
      return { signature: res.signature, amountTokens: res.amountTokens };
    } catch (e) {
      if (e instanceof HyperblockApiError && e.status === 429) {
        if (e.retryAfterMs && Number.isFinite(e.retryAfterMs)) rememberClaimCooldown(e.retryAfterMs);
        const msg = `Claim cooldown — try again in ${e.retryAfterMs ? Math.ceil(e.retryAfterMs / 1000) : claimCooldownSec || "?"}s`;
        setError(msg);
        throw new Error(msg);
      }
      const msg = e instanceof Error ? e.message : "Claim failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setClaiming(false);
    }
  }, [address, refresh, rememberClaimCooldown, claimCooldownSec]);

/**
 * Walk a wallet-adapter error chain (WalletSendTransactionError wraps the real
 * cause, defaulting to the useless "Unexpected error") and build a readable message.
 */
function describeTxError(e: unknown): string {
  // eslint-disable-next-line no-console
  console.error("[hyperblock approve] raw error:", e);
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = e;
  while (cur && (typeof cur === "object" || typeof cur === "string") && !seen.has(cur)) {
    seen.add(cur);
    if (typeof cur === "string") {
      if (cur && !parts.includes(cur)) parts.push(cur);
      break;
    }
    const rec = cur as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message && !parts.includes(rec.message)) {
      parts.push(rec.message);
    }
    if (Array.isArray(rec.logs) && rec.logs.length > 0) {
      parts.push(`logs: ${(rec.logs as unknown[]).slice(-6).join(" | ")}`);
    }
    cur = rec.cause ?? rec.error ?? null;
  }
  const msg = parts.filter((p) => !/^unexpected error$/i.test(p.trim())).join(" · ").trim();
  return msg || "Wallet failed to send the approval transaction";
}
  /**
   * One-time SPL delegate approval: user signs a single approveChecked tx
   * authorizing the house wallet as delegate. Afterwards bets need no popup.
   */
  const approve = useCallback(async (): Promise<string> => {
    if (!address) throw new Error("Connect a Solana wallet first");
    if (!publicKey) throw new Error("Wallet not ready");
    setApproving(true);
    setError(null);
    try {
      const params: ApproveParams = await getApproveParams(address);
      const owner = new PublicKey(address);
      const mint = new PublicKey(params.mint);
      const delegate = new PublicKey(params.delegateWallet);
      const userAta = getAssociatedTokenAddressSync(mint, owner);
      const allowance = BigInt(params.suggestedAllowanceMinor);

      const conn = new Connection(params.rpcEndpoint, "confirmed");

      // The user pays gas for this one tx — a fresh wallet with 0 SOL fails
      // inside the wallet with an opaque error, so check first with a clear message.
      const solLamports = await conn.getBalance(owner, "confirmed").catch(() => null);
      if (solLamports !== null && solLamports < 50_000) {
        throw new Error(
          "Not enough devnet SOL for gas — fund your wallet at https://faucet.solana.com (devnet), then retry approval",
        );
      }

      const ixs = [
        createAssociatedTokenAccountIdempotentInstruction(owner, userAta, owner, mint),
        createApproveCheckedInstruction(
          userAta,
          mint,
          delegate,
          owner,
          allowance,
          params.tokenDecimals,
        ),
      ];
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
      const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash });
      tx.add(...ixs);
      let sig: string;
      try {
        sig = await sendTransaction(tx, conn, { skipPreflight: false });
      } catch (e) {
        throw new Error(describeTxError(e));
      }
      await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed").catch(() => {});
      await refresh();
      return sig;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setApproving(false);
    }
  }, [address, publicKey, sendTransaction, refresh]);

  /**
   * Place an onchain bet. The API pulls the stake as SPL delegate, waits ~10s
   * for the Hyperliquid exit price, settles, and returns the settled result.
   * This call blocks for the full round — callers should show a settling UI.
   */
  const placeOnchainBet = useCallback(
    async (args: { token: string; direction: BetDirection; betAmount: number; currentPrice: number }): Promise<PlaceResponse> => {
      if (!address) throw new Error("Connect a Solana wallet to bet tUSD");
      setPlacing(true);
      setError(null);
      try {
        const settled = await apiPlaceBet({ userWallet: address, ...args });
        await refresh();
        return settled;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Bet failed";
        setError(msg);
        throw e instanceof Error ? e : new Error(msg);
      } finally {
        setPlacing(false);
      }
    },
    [address, refresh],
  );

  return {
    address,
    config,
    balances,
    approveStatus,
    tusdBalance,
    isApprovedFor,
    claiming,
    claimCooldownSec,
    approving,
    placing,
    error,
    claim,
    approve,
    placeOnchainBet,
    refresh,
  };
}
