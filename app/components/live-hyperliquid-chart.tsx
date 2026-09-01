"use client";

import { useMemo, useState } from "react";
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

function formatPriceByValue(val: number): string {
  if (val < 10) return `$${val.toFixed(4)}`;
  if (val < 100) return `$${val.toFixed(3)}`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LiveHyperliquidChart({
  data,
  value,
  plays,
  height = 560,
  window: defaultWindow = 45,
}: LiveHyperliquidChartProps) {
  const [activeWindow, setActiveWindow] = useState<number>(defaultWindow);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const hasData = data.length > 1 && Number.isFinite(value) && value > 0;
  const displayData = hasData
    ? data
    : [
        { time: Date.now() / 1000 - 1, value: value || 100 },
        { time: Date.now() / 1000, value: value || 100 },
      ];
  const displayValue = hasData ? value : (displayData[displayData.length - 1]?.value ?? 100);

  // Calculate High, Low, Volatility, Delta, and Gauge Metrics
  const metrics = useMemo(() => {
    if (data.length === 0) {
      return {
        high: displayValue,
        low: displayValue,
        pctChange: "0.00",
        diff: 0,
        volatility: "0.01%",
        volLabel: "⚡ Calm Range",
        gaugePct: 50,
        bullPct: 55,
      };
    }
    const prices = data.map((d) => d.value);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const start = prices[0] ?? displayValue;
    const diff = displayValue - start;
    const pctChange = start > 0 ? ((diff / start) * 100).toFixed(3) : "0.000";

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const rangePct = (high - low) / (avg || 1);
    const gaugePct = high > low ? Math.min(100, Math.max(0, ((displayValue - low) / (high - low)) * 100)) : 50;

    let volLabel = "⚡ Calm Range";
    if (rangePct > 0.0015) volLabel = "🚀 High Volatility";
    else if (rangePct > 0.0006) volLabel = "🔥 Active Volatility";

    // Bullish sentiment derived from gauge position + trend direction
    const bullPct = Math.round(Math.min(85, Math.max(15, gaugePct * 0.7 + (diff >= 0 ? 20 : 5))));

    return {
      high,
      low,
      pctChange,
      diff,
      volatility: `${(rangePct * 100).toFixed(2)}%`,
      volLabel,
      gaugePct,
      bullPct,
    };
  }, [data, displayValue]);

  const activePlays = useMemo(() => {
    if (!plays) return [];
    return plays.filter((p) => ["active", "settling", "refunding"].includes(p.status));
  }, [plays]);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--hair)",
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Upper Main Section: Left Parameter Column + Right Graph Canvas */}
      <div style={{ display: "flex", height: height - 90, position: "relative" }}>
        {/* Left Parameters Readouts Column (180px) */}
        <aside
          style={{
            width: 180,
            borderRight: "1px solid var(--hair)",
            padding: "14px 12px",
            background: "color-mix(in srgb, var(--card) 95%, var(--bg))",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            zIndex: 5,
          }}
        >
          {/* Live Quote & Delta */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--mut)" }}>
              Price Readout
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
              {formatPriceByValue(displayValue)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: metrics.diff >= 0 ? "var(--up)" : "var(--down)",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{metrics.diff >= 0 ? "▲" : "▼"}</span>
              <span>${Math.abs(metrics.diff).toFixed(2)} ({metrics.diff >= 0 ? "+" : ""}{metrics.pctChange}%)</span>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--hair)" }} />

          {/* 45s High & Low Bounds */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--mut)" }}>
              45s Range Bounds
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--mut)", fontWeight: 600 }}>High</span>
              <strong style={{ color: "var(--up)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {formatPriceByValue(metrics.high)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--mut)", fontWeight: 600 }}>Low</span>
              <strong style={{ color: "var(--down)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {formatPriceByValue(metrics.low)}
              </strong>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--hair)" }} />

          {/* Volatility & Momentum */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--mut)" }}>
              Analytics
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>
              {metrics.volLabel}
            </div>
            <div style={{ fontSize: 10, color: "var(--mut)", fontWeight: 600 }}>
              Vol Index: <b style={{ color: "var(--ink)" }}>{metrics.volatility}</b>
            </div>
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--up)", display: "flex", alignItems: "center", gap: 4 }}>
              <i style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--up)" }} />
              Hyperliquid Mainnet
            </div>
            <div style={{ fontSize: 10, color: "var(--mut)", fontWeight: 600 }}>
              Latency: 22ms · 1s ticks
            </div>
          </div>
        </aside>

        {/* Main Hero Graph Canvas */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Top Controls Overlay: Timeframe Zoom Pills */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 14,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 3,
              borderRadius: 999,
              background: "color-mix(in srgb, var(--card) 85%, transparent)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--hair)",
            }}
          >
            {[
              { label: "10s", sec: 15 },
              { label: "30s", sec: 35 },
              { label: "1m", sec: 65 },
            ].map((tf) => (
              <button
                key={tf.label}
                type="button"
                onClick={() => {
                  setActiveWindow(tf.sec);
                  setAutoScroll(false);
                }}
                style={{
                  border: 0,
                  background: activeWindow === tf.sec && !autoScroll ? "var(--ink)" : "transparent",
                  color: activeWindow === tf.sec && !autoScroll ? "var(--bg)" : "var(--mut)",
                  borderRadius: 999,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {tf.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setActiveWindow(defaultWindow);
                setAutoScroll(true);
              }}
              style={{
                border: 0,
                background: autoScroll ? "var(--up)" : "transparent",
                color: autoScroll ? "#fff" : "var(--mut)",
                borderRadius: 999,
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ● Live
            </button>
          </div>

          {!hasData && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                zIndex: 2,
                background: "color-mix(in srgb, var(--card) 80%, transparent)",
                backdropFilter: "blur(2px)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--mut)",
                  background: "var(--bg)",
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--hair)",
                }}
              >
                ● connecting to Hyperliquid…
              </span>
            </div>
          )}

          <LiveLineChart
            data={displayData}
            value={displayValue}
            window={activeWindow}
            numXTicks={5}
            lerpSpeed={0.08}
            className="w-full h-full"
            style={{ height: "100%" }}
          >
            <LiveLine
              dataKey="value"
              stroke="var(--ink)"
              strokeWidth={2.6}
              curve={undefined}
              fill={true}
              pulse={true}
              dotSize={3.5}
              badge={true}
              formatValue={(v) => formatPriceByValue(v)}
            />
            <LiveYAxis />
            <LiveXAxis />
            <ChartTooltip />
          </LiveLineChart>
        </div>
      </div>

      {/* Bottom Parameters Panel (Range Gauge + Sentiment Bar + Target Zone) */}
      <div
        style={{
          borderTop: "1px solid var(--hair)",
          padding: "10px 14px",
          background: "color-mix(in srgb, var(--card) 98%, var(--bg))",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 16,
          alignItems: "center",
          fontSize: 11,
        }}
      >
        {/* 1. Visual Range Position Gauge */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "var(--mut)", marginBottom: 4 }}>
            <span>Low {formatPriceByValue(metrics.low)}</span>
            <span style={{ color: "var(--ink)", fontWeight: 800 }}>45s Range Position</span>
            <span>High {formatPriceByValue(metrics.high)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--bg)", border: "1px solid var(--hair)", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${metrics.gaugePct}%`,
                background: "linear-gradient(90deg, var(--down), var(--up))",
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* 2. Bull vs Bear Sentiment Ratio */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: "var(--up)" }}>Bulls {metrics.bullPct}%</span>
            <span style={{ color: "var(--mut)" }}>Order Sentiment</span>
            <span style={{ color: "var(--down)" }}>Bears {100 - metrics.bullPct}%</span>
          </div>
          <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", border: "1px solid var(--hair)" }}>
            <div style={{ width: `${metrics.bullPct}%`, background: "var(--up)", transition: "width 0.3s ease" }} />
            <div style={{ width: `${100 - metrics.bullPct}%`, background: "var(--down)", transition: "width 0.3s ease" }} />
          </div>
        </div>

        {/* 3. 10s Play Target Window & Active Plays */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          {activePlays.length > 0 ? (
            <div style={{ display: "flex", gap: 4 }}>
              {activePlays.slice(0, 2).map((p) => (
                <span
                  key={p.id}
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: p.direction === "up" ? "var(--up-tint)" : "var(--down-tint)",
                    color: p.direction === "up" ? "var(--up)" : "var(--down)",
                    border: `1px solid ${p.direction === "up" ? "var(--up)" : "var(--down)"}`,
                  }}
                >
                  {p.direction === "up" ? "▲" : "▼"} ${p.collateralUsd} · ⏱️ {Math.max(0, Math.ceil((p.expiresAt - Date.now()) / 1000))}s
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mut)", display: "flex", alignItems: "center", gap: 4 }}>
              <span>Target:</span>
              <strong style={{ color: "var(--ink)", fontWeight: 800 }}>
                {formatPriceByValue(metrics.low)} – {formatPriceByValue(metrics.high)}
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
