"use client";

import { useState } from "react";
import { useGameWallet } from "@/app/hooks/use-game-wallet";
import { useWalletBalances } from "@/app/hooks/use-wallet-balances";
import { useGameSession } from "@/app/hooks/use-game-session";
import type { MarketSnapshot } from "@/app/lib/domain";

function compactAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

function formatSol(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toFixed(3);
}

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WalletStatsCard({
  snapshot,
  variant = "inline",
  onClose,
}: {
  snapshot?: MarketSnapshot | null;
  variant?: "inline" | "popover";
  onClose?: () => void;
}) {
  const wallet = useGameWallet();
  const balances = useWalletBalances(snapshot as any);
  const session = useGameSession();
  const [copied, setCopied] = useState(false);

  const plays = snapshot?.plays ?? [];
  const wins = plays.filter((p) => p.status === "won").length;
  const losses = plays.filter((p) => p.status === "lost").length;
  const totalSettled = wins + losses;
  const winRate = totalSettled > 0 ? Math.round((wins / totalSettled) * 100) : null;
  const totalProfit = plays.reduce((acc, p) => acc + (p.liveProfitUsd ?? 0), 0);
  const activePositions = snapshot?.activePositions ?? plays.filter((p) => p.status === "submitting" || p.status === "settling").length;

  const copy = () => {
    if (!wallet.address) return;
    navigator.clipboard?.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!wallet.address) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          background: "var(--card)",
          border: "1px solid var(--hair)",
          boxShadow: variant === "popover" ? "0 24px 64px -8px rgba(0,0,0,0.35), 0 0 0 1px var(--hair)" : "none",
          minWidth: variant === "popover" ? 320 : undefined,
          color: "var(--ink)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ink-muted)" }}>Wallet</div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>Not connected</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>Connect Phantom / Solflare to see SOL, USDC, buying power, session & positions.</div>
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
        background: "var(--card)",
        border: "1px solid var(--hair)",
        boxShadow: variant === "popover" ? "0 24px 64px -8px rgba(0,0,0,0.35), 0 0 0 1px var(--hair)" : "none",
        overflow: "hidden",
        minWidth: variant === "popover" ? 360 : undefined,
        color: "var(--ink)",
      }}
    >
      {/* header */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid var(--hair)", background: "var(--panel)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-neon-orange)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>{wallet.address.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "#00f076", display: "inline-block" }} /> Connected · devnet
            {onClose && variant === "popover" && (
              <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", color: "var(--ink-muted)", padding: 4, background: "none", border: "none", cursor: "pointer" }}>
                ✕
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="num" title={wallet.address} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>
              {compactAddress(wallet.address)}
            </span>
            <button onClick={copy} style={{ fontSize: 11, fontWeight: 700, color: copied ? "#00f076" : "var(--ink-secondary)", border: "1px solid var(--hair)", borderRadius: 999, padding: "2px 8px", background: "var(--card)", cursor: "pointer" }}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => void wallet.disconnect?.()} style={{ fontSize: 11, fontWeight: 700, color: "#ff3358", marginLeft: 2, background: "none", border: "none", cursor: "pointer" }}>
              Disconnect
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={wallet.address}>
            {wallet.address}
          </div>
        </div>
      </div>

      {/* balances */}
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-muted)" }}>SOL — Base</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>{balances.loading ? "…" : formatSol(balances.sol)}</div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>for fees · {balances.error ? "error" : "confirmed"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-muted)" }}>SOL — ER</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>{balances.loading ? "…" : formatSol(balances.erSol)}</div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>ephemeral · gasless</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-muted)" }}>USDC — Base</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>{balances.loading ? "…" : formatUsd(balances.usdcBase)}</div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={balances.collateralMint ?? ""}>{balances.collateralMint ? `${balances.collateralMint.slice(0, 4)}…${balances.collateralMint.slice(-4)}` : "collateral"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-muted)" }}>Buying power — ER</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: "var(--color-neon-orange)" }}>{balances.loading && balances.buyingPower === null ? "…" : formatUsd(balances.buyingPower)}</div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>arena · {activePositions} open</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-muted)" }}>Session allowance</div>
            <div className="num" style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>{session.remainingAllowanceUsd !== null && session.remainingAllowanceUsd !== undefined ? formatUsd(session.remainingAllowanceUsd) : "—"}</div>
            <div style={{ fontSize: 10, color: session.ready ? "#00f076" : "var(--wait)", marginTop: 2, fontWeight: 700 }}>{session.ready ? "● Active · gasless" : session.busy ? "Setting up…" : "Inactive"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(234, 179, 8, 0.12)", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--wait)" }}>Claimable</div>
            <div className="num" style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>{formatUsd(balances.claimable)}</div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>escrow · fallback</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--hair)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Trades</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: "var(--ink)" }}>{plays.length}</div>
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
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.5 }}>Session P&L</span>
          <span className="num" style={{ fontSize: 15, fontWeight: 800, color: totalProfit >= 0 ? "#00f076" : "#ff3358" }}>
            {totalProfit >= 0 ? "+" : ""}
            {formatUsd(totalProfit)} {winRate !== null ? `· ${winRate}% WR` : ""}
          </span>
        </div>
        {balances.error && !balances.error.includes("Endpoint URL") && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#ff3358", background: "rgba(255, 51, 88, 0.12)", padding: "8px 10px", borderRadius: 8 }}>
            {balances.error}
          </div>
        )}
        <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 8, textAlign: "center" }}>
          Base RPC {process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.replace("https://", "").replace("http://", "") ?? "rpc.magicblock.app/devnet"} · ER {snapshot?.erEndpoint?.replace("https://", "").replace("http://", "") ?? "devnet-as.magicblock.app"} · auto-refresh 5s
        </div>
      </div>
    </div>
  );
}
