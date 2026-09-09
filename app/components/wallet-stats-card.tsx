"use client";

import { useState } from "react";
import { useGameWallet } from "@/app/hooks/use-game-wallet";
import { useGameSession } from "@/app/hooks/use-game-session";
import { useWalletBalances } from "@/app/hooks/use-wallet-balances";
import type { MarketSnapshot } from "@/app/lib/domain";

function compactAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}
function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatSol(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(4)} SOL`;
}

export function WalletStatsCard({
  snapshot,
  variant = "popover",
  onClose,
}: {
  snapshot?: MarketSnapshot | null;
  variant?: "popover" | "inline";
  onClose?: () => void;
}) {
  const wallet = useGameWallet();
  const session = useGameSession();
  const balances = useWalletBalances(snapshot as any);
  const [copied, setCopied] = useState(false);

  const activePositions = snapshot?.activePositions ?? 0;
  const plays = snapshot?.plays ?? [];
  const wins = plays.filter((p) => p.status === "won").length;
  const losses = plays.filter((p) => p.status === "lost").length;
  const totalProfit = plays.reduce((s, p) => s + (p.liveProfitUsd ?? 0), 0);
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : null;

  const copy = async () => {
    if (!wallet.address) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (!wallet.address) {
    return (
      <div
        style={{
          padding: variant === "popover" ? 16 : 16,
          borderRadius: 14,
          background: "#0c0f17",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: variant === "popover" ? "0 24px 64px -8px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)" : "none",
          minWidth: variant === "popover" ? 320 : undefined,
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8" }}>Wallet</div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "#ffffff" }}>Not connected</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Connect Phantom / Solflare to see SOL, USDC, buying power, session & positions.</div>
        <button onClick={() => void wallet.connect()} style={{ marginTop: 14, width: "100%", minHeight: 40, borderRadius: 10, background: "var(--color-neon-orange)", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 0,
        borderRadius: 14,
        background: "#0c0f17",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        boxShadow: variant === "popover" ? "0 24px 64px -8px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)" : "none",
        overflow: "hidden",
        minWidth: variant === "popover" ? 360 : undefined,
        color: "#ffffff",
      }}
    >
      {/* header */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "#101522" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-neon-orange)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>{wallet.address.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "#00f076", display: "inline-block" }} /> Connected · devnet
            {onClose && variant === "popover" && (
              <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", color: "#94a3b8", padding: 4, background: "none", border: "none", cursor: "pointer" }}>
                ✕
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="num" title={wallet.address} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ffffff" }}>
              {compactAddress(wallet.address)}
            </span>
            <button onClick={copy} style={{ fontSize: 11, fontWeight: 700, color: copied ? "#00f076" : "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: 999, padding: "2px 8px", background: "#182030", cursor: "pointer" }}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => void wallet.disconnect?.()} style={{ fontSize: 11, fontWeight: 700, color: "#ff3358", marginLeft: 2, background: "none", border: "none", cursor: "pointer" }}>
              Disconnect
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={wallet.address}>
            {wallet.address}
          </div>
        </div>
      </div>

      {/* balances */}
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#141926", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8" }}>SOL — Base</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "#ffffff" }}>{balances.loading ? "…" : formatSol(balances.sol)}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>for fees · {balances.error ? "error" : "confirmed"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#141926", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8" }}>SOL — ER</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "#ffffff" }}>{balances.loading ? "…" : formatSol(balances.erSol)}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>ephemeral · gasless</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#141926", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8" }}>USDC — Base</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "#ffffff" }}>{balances.loading ? "…" : formatUsd(balances.usdcBase)}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={balances.collateralMint ?? ""}>{balances.collateralMint ? `${balances.collateralMint.slice(0, 4)}…${balances.collateralMint.slice(-4)}` : "collateral"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#141926", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8" }}>Buying power — ER</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: "var(--color-neon-orange)" }}>{balances.loading && balances.buyingPower === null ? "…" : formatUsd(balances.buyingPower)}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>arena · {activePositions} open</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#141926", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8" }}>Session allowance</div>
            <div className="num" style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: "#ffffff" }}>{session.remainingAllowanceUsd !== null && session.remainingAllowanceUsd !== undefined ? formatUsd(session.remainingAllowanceUsd) : "—"}</div>
            <div style={{ fontSize: 10, color: session.ready ? "#00f076" : "var(--wait)", marginTop: 2, fontWeight: 700 }}>{session.ready ? "● Active · gasless" : session.busy ? "Setting up…" : "Inactive"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(234, 179, 8, 0.12)", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--wait)" }}>Claimable</div>
            <div className="num" style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: "#ffffff" }}>{formatUsd(balances.claimable)}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>escrow · fallback</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "#141926", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Trades</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: "#ffffff" }}>{plays.length}</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(0, 240, 118, 0.10)", border: "1px solid rgba(0, 240, 118, 0.3)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00f076", textTransform: "uppercase", letterSpacing: 0.5 }}>Wins</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, color: "#00f076", marginTop: 2 }}>{wins}</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255, 51, 88, 0.10)", border: "1px solid rgba(255, 51, 88, 0.3)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#ff3358", textTransform: "uppercase", letterSpacing: 0.5 }}>Losses</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, color: "#ff3358", marginTop: 2 }}>{losses}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "10px 12px", borderRadius: 8, background: totalProfit >= 0 ? "rgba(0, 240, 118, 0.12)" : "rgba(255, 51, 88, 0.12)", border: `1px solid ${totalProfit >= 0 ? "rgba(0, 240, 118, 0.4)" : "rgba(255, 51, 88, 0.4)"}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>Session P&L</span>
          <span className="num" style={{ fontSize: 15, fontWeight: 800, color: totalProfit >= 0 ? "#00f076" : "#ff3358" }}>
            {totalProfit >= 0 ? "+" : ""}
            {formatUsd(totalProfit)} {winRate !== null ? `· ${winRate}% WR` : ""}
          </span>
        </div>
        {balances.error && <div style={{ marginTop: 8, fontSize: 11, color: "#ff3358", background: "rgba(255, 51, 88, 0.12)", padding: "8px 10px", borderRadius: 8 }}>{balances.error}</div>}
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 8, textAlign: "center" }}>Base RPC {process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.replace("https://", "") ?? "rpc.magicblock.app/devnet"} · ER {snapshot?.erEndpoint?.replace("https://", "") ?? "devnet-as"} · auto-refresh 5s</div>
      </div>
    </div>
  );
}
