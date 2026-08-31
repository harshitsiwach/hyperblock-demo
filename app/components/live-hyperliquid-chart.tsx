"use client";

import { LiveLineChart } from "@/components/charts/live-line-chart";
import { LiveLine } from "@/components/charts/live-line";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { LiveXAxis } from "@/components/charts/live-x-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import type { Play } from "@/app/lib/domain";

interface LiveHyperliquidChartProps {
  data: { time: number; value: number }[]; // time = unix seconds
  value: number;
  plays?: Play[];
  height?: number;
  window?: number;
}

/**
 * Reuses @bklit/live-line-chart for Hyperliquid graphs.
 * Demo + Real both use mainnet WS (wss://api.hyperliquid.xyz/ws), graph driven from WS — same calm design, big smooth hero.
 */
export function LiveHyperliquidChart({ data, value, plays, height = 520, window = 45 }: LiveHyperliquidChartProps) {
  const hasData = data.length > 1 && Number.isFinite(value) && value > 0;
  const displayData = hasData ? data : [{ time: Date.now() / 1000 - 1, value: value || 100 }, { time: Date.now() / 1000, value: value || 100 }];
  const displayValue = hasData ? value : 0;
  return (
    <div style={{ height, borderRadius: 16, overflow: "hidden", border: "1px solid var(--hair)", background: "var(--card)", position: "relative" }}>
      {!hasData && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 2, background: "color-mix(in srgb, var(--card) 80%, transparent)", backdropFilter: "blur(2px)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mut)", background: "var(--bg)", padding: "8px 14px", borderRadius: 999, border: "1px solid var(--hair)" }}>● connecting to Hyperliquid…</span>
        </div>
      )}
      <LiveLineChart
        data={displayData}
        value={displayValue}
        window={window}
        numXTicks={5}
        lerpSpeed={0.08}
        className="w-full h-full"
        style={{ height: "100%" }}
      >
        <LiveLine dataKey="value" stroke="var(--ink)" strokeWidth={2.6} curve={undefined} fill={true} pulse={true} dotSize={3.5} badge={true} formatValue={(v) => `$${v.toFixed(2)}`} />
        <LiveYAxis />
        <LiveXAxis />
        <ChartTooltip />
      </LiveLineChart>
      {/* Quiet entry lines overlay — calm, not loud — only active plays, not closed */}
      {plays && plays.filter((p) => ["active", "settling", "refunding"].includes(p.status)).length > 0 && (
        <div style={{ position: "absolute", bottom: 10, left: 14, right: 14, display: "flex", gap: 6, flexWrap: "wrap", pointerEvents: "none" }}>
          {plays.filter((p) => ["active", "settling", "refunding"].includes(p.status)).slice(0, 3).map((p) => (
            <span key={p.id} style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 999, background: p.direction === "up" ? "var(--up-tint)" : "var(--down-tint)", color: p.direction === "up" ? "var(--up)" : "var(--down)", border: `1px solid ${p.direction === "up" ? "var(--up)" : "var(--down)"}` }}>
              {p.direction === "up" ? "▲" : "▼"} ${p.collateralUsd} @ ${p.entryPrice.toFixed(2)} · live
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
