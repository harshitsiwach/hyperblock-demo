"use client";

import { useState } from "react";
import { useGameWallet } from "@/app/hooks/use-game-wallet";
import { WalletStatsCard } from "@/app/components/wallet-stats-card";

function compactAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

export function WalletButton({ variant = "pill", showStats = false, snapshot }: { variant?: "pill" | "compact"; showStats?: boolean; snapshot?: import("@/app/lib/domain").MarketSnapshot | null }) {
  const wallet = useGameWallet();
  const [open, setOpen] = useState(false);
  const label = wallet.address
    ? compactAddress(wallet.address)
    : wallet.available
      ? wallet.connecting
        ? "Connecting…"
        : "Connect wallet"
      : "Install wallet";

  const handleClick = () => {
    if (wallet.address && showStats) {
      setOpen((v) => !v);
      return;
    }
    void wallet.connect();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="wallet"
        onClick={handleClick}
        disabled={wallet.connecting}
        type="button"
        title={wallet.address ? `Connected: ${wallet.address} — click for balances` : "Connect Solana wallet (Phantom, Solflare, Ledger, Torus)"}
        style={variant === "compact" ? { minHeight: 32, padding: "0 10px", fontSize: 12 } : undefined}
      >
        <span className={`dot ${wallet.address ? "is-connected" : ""}`} />
        <span className="wallet-label">{label}</span>
        {wallet.address && showStats && <span style={{ fontSize: 10, marginLeft: 2 }}>{open ? "▴" : "▾"}</span>}
      </button>
      {open && wallet.address && showStats && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} aria-hidden />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 41, width: 380, maxWidth: "min(380px, 96vw)" }}>
            <WalletStatsCard snapshot={snapshot ?? null} variant="popover" onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}


