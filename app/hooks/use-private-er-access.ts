"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { authorizeErAccess, type AuthorizedErAccess } from "@/app/lib/live/er-access";

export function usePrivateErAccess() {
  const wallet = useWallet();
  const [privateTxEnabled, setPrivateTxEnabled] = useState(true);
  const [lastAuthToken, setLastAuthToken] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);

  const getAuthorizedAccess = useCallback(
    async (rpcEndpoint: string, wsEndpoint?: string): Promise<AuthorizedErAccess | null> => {
      if (!wallet.publicKey || !wallet.signMessage) {
        return null;
      }
      setAuthorizing(true);
      try {
        const access = await authorizeErAccess(
          rpcEndpoint,
          wsEndpoint,
          wallet.publicKey,
          wallet.signMessage,
        );
        const url = new URL(access.rpcEndpoint);
        const token = url.searchParams.get("token");
        if (token) setLastAuthToken(token);
        return access;
      } catch (err) {
        console.warn("Private ER Access token authorization warning:", err);
        return null;
      } finally {
        setAuthorizing(false);
      }
    },
    [wallet.publicKey, wallet.signMessage],
  );

  return {
    privateTxEnabled,
    setPrivateTxEnabled,
    lastAuthToken,
    authorizing,
    getAuthorizedAccess,
    isWalletConnected: Boolean(wallet.publicKey),
  };
}
