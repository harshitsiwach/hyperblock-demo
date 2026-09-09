"use client";

import { useEffect, useState } from "react";
import { useGameWallet } from "@/app/hooks/use-game-wallet";
import { WalletStatsCard } from "@/app/components/wallet-stats-card";

function compactAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

export function WalletButton({ variant = "pill", showStats = false, snapshot }: { variant?: "pill" | "compact"; showStats?: boolean; snapshot?: import("@/app/lib/domain").MarketSnapshot | null }) {
  const wallet = useGameWallet();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = !mounted
    ? "Connect wallet"
    : wallet.address
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
      <div className="relative inline-flex items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105">
        {/* Masked Border Beam — strictly confined to 1.5px border track */}
        <div className="border-beam-ring rounded-xl">
          <span className="rotating-glow-border" />
        </div>

        <button
          onClick={handleClick}
          disabled={wallet.connecting}
          type="button"
          title={wallet.address ? `Connected: ${wallet.address} — click for balances` : "Connect Solana wallet (Phantom, Solflare, Ledger, Torus)"}
          className="relative z-10 flex items-center gap-1.5 rounded-xl border border-[var(--color-neon-orange)]/35 px-3 py-1 text-xs font-bold text-white hover:bg-white/[0.08] transition-all focus:outline-none"
          style={{
            backgroundColor: "#0c0f17",
            minHeight: variant === "compact" ? 30 : undefined,
            fontSize: 12,
          }}
        >
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${wallet.address ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-slate-400 animate-pulse"}`} />
          <span className="font-mono font-extrabold text-white">{label}</span>
          {wallet.address && showStats && <span className="text-[10px] text-slate-300 ml-0.5">{open ? "▴" : "▾"}</span>}
        </button>
      </div>
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


