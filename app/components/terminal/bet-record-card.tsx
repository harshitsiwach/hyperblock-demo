"use client";

import { useMemo } from "react";
import { ExternalLink, RefreshCw, Receipt } from "lucide-react";
import { MARKETS as SUPPORTED_ASSETS } from "@/app/lib/markets";
import type { Play } from "@/app/lib/domain";
import { explorerTxUrl, type HistoryRecord, type OnchainBetRecord } from "@/app/lib/hyperblock-api/history";

interface BetRecordCardProps {
  records?: HistoryRecord[];
  historyPlays: Play[];
  now: number;
  walletConnected?: boolean;
  historyLoading?: boolean;
  onRefreshHistory?: () => void;
}

function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface EnrichedBet extends OnchainBetRecord {
  symbol?: string;
  direction?: "up" | "down";
  entryPrice?: number;
}

export function BetRecordCard({
  records = [],
  historyPlays,
  now,
  walletConnected = false,
  historyLoading = false,
  onRefreshHistory,
}: BetRecordCardProps) {
  // Attach direction/symbol/entry from local mirrored plays (matched by stake + time).
  const enriched = useMemo<EnrichedBet[]>(() => {
    const bets = records.filter((r): r is OnchainBetRecord => r.kind === "bet");
    return bets.map((b) => {
      const local = historyPlays.find(
        (p) =>
          Math.abs(p.collateralUsd - b.stakeTokens) < 1e-6 &&
          Math.abs(p.openedAt - b.stakeTime) < 180_000,
      );
      if (!local) return b;
      const asset = SUPPORTED_ASSETS.find((a) => a.marketId === local.marketId);
      return { ...b, symbol: asset?.symbol, direction: local.direction, entryPrice: local.entryPrice };
    });
  }, [records, historyPlays]);

  const claims = useMemo(() => records.filter((r) => r.kind === "claim"), [records]);
  const claimedTotal = useMemo(() => claims.reduce((s, c) => s + c.amountTokens, 0), [claims]);

  return (
    <div className="terminal-card flex flex-col p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
          <Receipt className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
          <span>Bet Record</span>
          <span className="rounded-full bg-[var(--card)] border border-[var(--hair)] px-1.5 py-px text-[10px] font-mono text-[var(--ink-muted)]">
            on-chain
          </span>
        </div>
        {onRefreshHistory && (
          <button
            onClick={onRefreshHistory}
            disabled={historyLoading || !walletConnected}
            className="flex items-center gap-1 rounded-md border border-[var(--hair)] bg-[var(--card)] px-2 py-1 text-[10px] font-bold text-[var(--ink-secondary)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)] disabled:opacity-40"
            title="Reload bet record from devnet"
          >
            <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} />
            {historyLoading ? "Loading…" : "Refresh"}
          </button>
        )}
      </div>

      {!walletConnected ? (
        <p className="rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] px-3 py-3 text-center text-[11px] text-[var(--ink-muted)]">
          Connect a wallet to load your verified on-chain bet record.
        </p>
      ) : enriched.length === 0 && claims.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--hair)] bg-[var(--card)] px-3 py-3 text-center text-[11px] text-[var(--ink-muted)]">
          {historyLoading ? "Scanning devnet transfers…" : "No bets yet — your settled rounds will appear here with tx links."}
        </p>
      ) : (
        <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
          {claims.length > 0 && (
            <div className="rounded-lg border border-[var(--hair)] bg-[var(--card)] px-2.5 py-1.5 text-[10px] font-mono text-[var(--ink-muted)]">
              Faucet: +{claimedTotal.toFixed(2)} tUSD across {claims.length} claim{claims.length === 1 ? "" : "s"}
            </div>
          )}
          {enriched.map((b) => {
            const isSettling = b.status === "settling";
            const profit = isSettling ? null : b.pnlTokens >= 0;
            const t = b.payoutTime ?? b.stakeTime;
            return (
              <div
                key={b.stakeSignature}
                className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                  isSettling
                    ? "border-amber-400/25 bg-amber-400/[0.05]"
                    : profit
                      ? "border-[#00f076]/20 bg-[#00f076]/[0.03]"
                      : "border-[#ff3358]/20 bg-[#ff3358]/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`rounded px-1.5 py-px text-[9px] font-black uppercase ${
                        isSettling
                          ? "bg-amber-400/20 text-amber-300"
                          : profit
                            ? "bg-[#00f076]/20 text-[#00f076]"
                            : "bg-[#ff3358]/20 text-[#ff3358]"
                      }`}
                    >
                      {isSettling ? "settling" : profit ? "won" : "lost"}
                    </span>
                    <span className="truncate font-bold text-[var(--ink)]">
                      {b.symbol ? `${b.symbol} ${b.direction?.toUpperCase() ?? ""}` : "tUSD round"}
                    </span>
                    <span className="font-mono text-[var(--ink-muted)]">{timeAgo(t, now)}</span>
                  </div>
                  <span
                    className={`font-mono font-extrabold ${
                      isSettling ? "text-amber-300" : profit ? "text-[#00f076]" : "text-[#ff3358]"
                    }`}
                  >
                    {isSettling ? `−${b.stakeTokens} tUSD` : `${b.pnlTokens >= 0 ? "+" : "−"}${Math.abs(b.pnlTokens).toFixed(2)} tUSD`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--ink-muted)]">
                  <span>
                    stake {b.stakeTokens} → payout {isSettling ? "…" : b.payoutTokens.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-2">
                    <a
                      href={explorerTxUrl(b.stakeSignature)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-0.5 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                      title="Stake transaction"
                    >
                      stake <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    {b.payoutSignature && (
                      <a
                        href={explorerTxUrl(b.payoutSignature)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-0.5 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                        title="Payout transaction"
                      >
                        payout <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
