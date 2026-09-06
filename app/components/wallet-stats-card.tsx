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
          padding: variant === "popover" ? 14 : 16,
          borderRadius: 8,
          background: "var(--card)",
          border: "1px solid var(--hair)",
          boxShadow: variant === "popover" ? "0 16px 48px rgba(0,0,0,0.16)" : "none",
          minWidth: variant === "popover" ? 320 : undefined,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--mut)" }}>Wallet</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "var(--ink)" }}>Not connected</div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>Connect Phantom / Solflare to see SOL, USDC, buying power, session & positions.</div>
        <button onClick={() => void wallet.connect()} style={{ marginTop: 12, width: "100%", minHeight: 38, borderRadius: 8, background: "var(--color-neon-orange)", color: "#fff", fontWeight: 800, fontSize: 13 }}>
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: variant === "popover" ? 0 : 16,
        borderRadius: 8,
        background: variant === "popover" ? "var(--card)" : "var(--card)",
        border: variant === "popover" ? "1px solid var(--hair)" : "1px solid var(--hair)",
        boxShadow: variant === "popover" ? "0 16px 48px rgba(0,0,0,0.14)" : "none",
        overflow: "hidden",
        minWidth: variant === "popover" ? 360 : undefined,
      }}
    >
      {/* header */}
      <div style={{ padding: variant === "popover" ? "14px 14px 12px" : "16px 16px 12px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid var(--hair)", background: "var(--card)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-neon-orange)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>{wallet.address.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--up)", display: "inline-block" }} /> Connected · devnet
            {onClose && variant === "popover" && (
              <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", color: "var(--mut)", padding: 4 }}>
                ✕
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="num" title={wallet.address} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {compactAddress(wallet.address)}
            </span>
            <button onClick={copy} style={{ fontSize: 11, fontWeight: 700, color: copied ? "var(--up)" : "var(--mut)", border: "1px solid var(--hair)", borderRadius: 999, padding: "2px 8px", background: "var(--bg)" }}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => void wallet.disconnect?.()} style={{ fontSize: 11, fontWeight: 700, color: "var(--down)", marginLeft: 2 }}>
              Disconnect
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={wallet.address}>
            {wallet.address}
          </div>
        </div>
      </div>

      {/* balances */}
      <div style={{ padding: variant === "popover" ? 12 : 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: "12px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>SOL — Base</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{balances.loading ? "…" : formatSol(balances.sol)}</div>
            <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>for fees · {balances.error ? "error" : "confirmed"}</div>
          </div>
          <div style={{ padding: "12px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>SOL — ER</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{balances.loading ? "…" : formatSol(balances.erSol)}</div>
            <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>ephemeral · gasless</div>
          </div>
          <div style={{ padding: "12px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>USDC — Base</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{balances.loading ? "…" : formatUsd(balances.usdcBase)}</div>
            <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={balances.collateralMint ?? ""}>{balances.collateralMint ? `${balances.collateralMint.slice(0, 4)}…${balances.collateralMint.slice(-4)}` : "collateral"}</div>
          </div>
          <div style={{ padding: "12px 12px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>Buying power — ER</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>{balances.loading && balances.buyingPower === null ? "…" : formatUsd(balances.buyingPower)}</div>
            <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>arena · {activePositions} open</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>Session allowance</div>
            <div className="num" style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{session.remainingAllowanceUsd !== null && session.remainingAllowanceUsd !== undefined ? formatUsd(session.remainingAllowanceUsd) : "—"}</div>
            <div style={{ fontSize: 10, color: session.ready ? "var(--up)" : "var(--wait)", marginTop: 2, fontWeight: 700 }}>{session.ready ? "● Active · gasless" : session.busy ? "Setting up…" : "Inactive"}</div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--wait-tint)", border: "1px solid var(--hair)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--mut)" }}>Claimable</div>
            <div className="num" style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{formatUsd(balances.claimable)}</div>
            <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>escrow · fallback</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
          <div style={{ padding: "10px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--hair)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: 0.5 }}>Trades</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{plays.length}</div>
          </div>
          <div style={{ padding: "10px 10px", borderRadius: 8, background: "var(--up-tint)", border: "1px solid var(--hair)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: 0.5 }}>Wins</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, color: "var(--up)", marginTop: 2 }}>{wins}</div>
          </div>
          <div style={{ padding: "10px 10px", borderRadius: 8, background: "var(--down-tint)", border: "1px solid var(--hair)", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: 0.5 }}>Losses</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, color: "var(--down)", marginTop: 2 }}>{losses}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "10px 12px", borderRadius: 8, background: totalProfit >= 0 ? "var(--up-tint)" : "var(--down-tint)", border: `1px solid ${totalProfit >= 0 ? "var(--up)" : "var(--down)"}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: 0.5 }}>Session P&L</span>
          <span className="num" style={{ fontSize: 16, fontWeight: 800, color: totalProfit >= 0 ? "var(--up)" : "var(--down)" }}>
            {totalProfit >= 0 ? "+" : ""}
            {formatUsd(totalProfit)} {winRate !== null ? `· ${winRate}% WR` : ""}
          </span>
        </div>
        {balances.error && <div style={{ marginTop: 8, fontSize: 11, color: "var(--down)", background: "var(--down-tint)", padding: "8px 10px", borderRadius: 8 }}>{balances.error}</div>}
        <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 8, textAlign: "center" }}>Base RPC {process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.replace("https://", "") ?? "rpc.magicblock.app/devnet"} · ER {snapshot?.erEndpoint?.replace("https://", "") ?? "devnet-as"} · auto-refresh 5s</div>
      </div>
    </div>
  );
}
