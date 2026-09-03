"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchOnchainHistory,
  type HistoryRecord,
} from "@/app/lib/hyperblock-api/history";

interface UseOnchainBetHistoryArgs {
  userAta: string | null;
  houseAta: string | null;
  mint: string | null;
  decimals: number | null;
  rpcEndpoint: string | null;
  /** Re-fetch on this tick (e.g. after each settled bet). */
  refreshKey?: number;
  pollIntervalMs?: number;
}

/**
 * Chain-verified bet + claim record for the connected wallet.
 * Survives API restarts (no Redis needed) and works across devices —
 * everything is reconstructed from Token-2022 transfers on devnet.
 */
export function useOnchainBetHistory(args: UseOnchainBetHistoryArgs) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const cacheRef = useRef<Map<string, unknown>>(new Map());
  const key = [args.userAta, args.houseAta, args.mint, args.decimals, args.rpcEndpoint].join("|");

  const refresh = useCallback(async () => {
    if (!args.userAta || !args.houseAta || !args.mint || args.decimals === null) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { records: next, txCache } = await fetchOnchainHistory({
        userAta: args.userAta,
        houseAta: args.houseAta,
        mint: args.mint,
        decimals: args.decimals,
        rpcEndpoint: args.rpcEndpoint ?? undefined,
        txCache: cacheRef.current,
      });
      cacheRef.current = txCache;
      setRecords(next);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "history load failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, args.refreshKey]);

  useEffect(() => {
    cacheRef.current = new Map();
    void refresh();
  }, [refresh]);

  // Self-healing: while any bet is still "settling" (usually the payout tx just
  // isn't indexed yet), re-poll fast; otherwise poll slowly.
  const hasUnsettled = records.some((r) => r.kind === "bet" && r.status === "settling");
  useEffect(() => {
    if (!args.userAta) return;
    const iv = setInterval(() => void refresh(), hasUnsettled ? 5000 : (args.pollIntervalMs ?? 60_000));
    return () => clearInterval(iv);
  }, [refresh, args.userAta, args.pollIntervalMs, hasUnsettled]);

  const bets = records.filter((r) => r.kind === "bet");
  const claims = records.filter((r) => r.kind === "claim");

  return { records, bets, claims, loading, error, updatedAt, refresh };
}
