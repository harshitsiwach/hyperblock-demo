"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { readClientLiveConfig } from "@/app/lib/live/client-config";

export interface WalletBalances {
  sol: number | null;
  erSol: number | null;
  usdcBase: number | null;
  usdcEr: number | null;
  buyingPower: number | null; // ER token balance (walletBalanceUsd)
  claimable: number | null;
  collateralMint: string | null;
  loading: boolean;
  error: string | null;
}

export function useWalletBalances(snapshot?: { walletBalanceUsd: number | null; fallbackClaimableUsd: number; collateralMint?: string; erEndpoint?: string } | null): WalletBalances {
  const { publicKey } = useWallet();
  const { connection: baseConnection } = useConnection();
  const [balances, setBalances] = useState<WalletBalances>({
    sol: null,
    erSol: null,
    usdcBase: null,
    usdcEr: null,
    buyingPower: snapshot?.walletBalanceUsd ?? null,
    claimable: snapshot?.fallbackClaimableUsd ?? null,
    collateralMint: snapshot?.collateralMint ?? null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    setBalances((b) => ({ ...b, buyingPower: snapshot?.walletBalanceUsd ?? b.buyingPower, claimable: snapshot?.fallbackClaimableUsd ?? b.claimable, collateralMint: snapshot?.collateralMint ?? b.collateralMint }));
  }, [snapshot?.walletBalanceUsd, snapshot?.fallbackClaimableUsd, snapshot?.collateralMint]);

  useEffect(() => {
    if (!publicKey) {
      setBalances((b) => ({ ...b, sol: null, erSol: null, usdcBase: null, usdcEr: null, loading: false }));
      return;
    }
    let cancelled = false;
    const fetch = async () => {
      try {
        setBalances((b) => ({ ...b, loading: true, error: null }));
        const config = readClientLiveConfig();
        const erEndpoint = snapshot?.erEndpoint ?? (config as any).erEndpoint ?? (config as any).ephemeralRpcEndpoint ?? "https://devnet-as.magicblock.app";
        const erConnection = new Connection(erEndpoint, "confirmed");
        const collateralMintStr = snapshot?.collateralMint;
        const collateralMint = collateralMintStr ? new PublicKey(collateralMintStr) : null;

        const [baseLamports, erLamports, baseToken, erToken] = await Promise.all([
          baseConnection.getBalance(publicKey, "confirmed").catch(() => null),
          erConnection.getBalance(publicKey, "confirmed").catch(() => null),
          collateralMint ? baseConnection.getTokenAccountBalance(getAssociatedTokenAddressSync(collateralMint, publicKey), "confirmed").catch(() => null) : Promise.resolve(null),
          collateralMint ? erConnection.getTokenAccountBalance(getAssociatedTokenAddressSync(collateralMint, publicKey), "confirmed").catch(() => null) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setBalances({
          sol: baseLamports !== null ? baseLamports / 1e9 : null,
          erSol: erLamports !== null ? erLamports / 1e9 : null,
          usdcBase: baseToken?.value.uiAmount ?? null,
          usdcEr: erToken?.value.uiAmount ?? null,
          buyingPower: snapshot?.walletBalanceUsd ?? erToken?.value.uiAmount ?? null,
          claimable: snapshot?.fallbackClaimableUsd ?? null,
          collateralMint: collateralMintStr ?? null,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setBalances((b) => ({ ...b, loading: false, error: e instanceof Error ? e.message : String(e) }));
      }
    };
    void fetch();
    const id = setInterval(() => void fetch(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicKey, baseConnection, snapshot?.erEndpoint, snapshot?.collateralMint, snapshot?.walletBalanceUsd, snapshot?.fallbackClaimableUsd]);

  return balances;
}
