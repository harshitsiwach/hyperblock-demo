"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { 
  BarChart2, 
  CandlestickChart as CandleIcon, 
  LineChart as LineIcon, 
  Maximize2, 
  Minimize2, 
  Camera, 
  Layers, 
  Activity, 
  Zap, 
  Clock 
} from "lucide-react";
import type { Play } from "@/app/lib/domain";

interface TerminalChartProps {
  data: { t: number; p: number }[]; // timestamp ms, price
  currentPrice: number | null;
  activePlays: Play[];
  symbol: string;
  height?: number;
}

const TIMEFRAMES = [
  { id: "1s", label: "1s", sec: 20 },
  { id: "5s", label: "5s", sec: 45 },
  { id: "15s", label: "15s", sec: 90 },
  { id: "1m", label: "1m", sec: 180 },
  { id: "5m", label: "5m", sec: 300 },
  { id: "15m", label: "15m", sec: 600 },
  { id: "1h", label: "1h", sec: 1800 },
  { id: "4h", label: "4h", sec: 3600 },
  { id: "1D", label: "1D", sec: 7200 },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatPrice(val: number): string {
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TerminalChart({
  data,
  currentPrice,
  activePlays,
  symbol,
  height = 540,
}: TerminalChartProps) {
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [activeTf, setActiveTf] = useState<string>("5s");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);
  const [hoverData, setHoverData] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Flow animation controller when switching tokens
  const flowProgressRef = useRef(1);
  const prevSymbolRef = useRef(symbol);

  useEffect(() => {
    if (symbol !== prevSymbolRef.current) {
      prevSymbolRef.current = symbol;
      flowProgressRef.current = 0;
      const startTime = performance.now();
      const duration = 750; // 750ms flowing wave reveal

      const step = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / duration);
        // Ease-out cubic: fast fluid surge that flows gracefully across to the actual price
        flowProgressRef.current = 1 - Math.pow(1 - p, 3);
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          flowProgressRef.current = 1;
        }
      };
      requestAnimationFrame(step);
    }
  }, [symbol]);

  // Selected timeframe window duration
  const activeWindowSec = TIMEFRAMES.find((tf) => tf.id === activeTf)?.sec ?? 45;

  // Synthesize realistic OHLC bars if in candle mode, grouped by bucket
  const candles = useMemo(() => {
    if (data.length === 0) return [];
    const bucketMs = Math.max(2000, (activeWindowSec * 1000) / 35);
    const map = new Map<number, { time: number; open: number; high: number; low: number; close: number; vol: number }>();

    data.forEach((pt) => {
      const bKey = Math.floor(pt.t / bucketMs) * bucketMs;
      const existing = map.get(bKey);
      if (!existing) {
        map.set(bKey, { time: bKey, open: pt.p, high: pt.p, low: pt.p, close: pt.p, vol: Math.random() * 15 + 5 });
      } else {
        existing.high = Math.max(existing.high, pt.p);
        existing.low = Math.min(existing.low, pt.p);
        existing.close = pt.p;
        existing.vol += Math.random() * 5 + 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }, [data, activeWindowSec]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Screenshot capture handler
  const handleScreenshot = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${symbol}-terminal-chart-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // Handle Mouse movement for crosshair
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const prices = data.map((d) => d.p);
      const minP = prices.length ? Math.min(...prices) : (currentPrice ?? 100) * 0.99;
      const maxP = prices.length ? Math.max(...prices) : (currentPrice ?? 100) * 1.01;
      const padding = (maxP - minP) * 0.1 || 1;
      const effectiveMin = minP - padding;
      const effectiveMax = maxP + padding;

      const price = effectiveMax - (y / rect.height) * (effectiveMax - effectiveMin);
      const time = Date.now() - (1 - x / rect.width) * (activeWindowSec * 1000);

      setHoverData({ x, y, price, time });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Canvas Drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const cHeight = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== cHeight * dpr) {
        canvas.width = width * dpr;
        canvas.height = cHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, cHeight);

      // Margins
      const topMargin = 20;
      const bottomMargin = 40;
      const rightMargin = 72; // for Y-axis scale
      const plotW = width - rightMargin;
      const plotH = cHeight - topMargin - bottomMargin;

      // Determine price scale range
      const prices = data.map((d) => d.p);
      const cur = currentPrice ?? (data[data.length - 1]?.p || 100);
      let minP = prices.length ? Math.min(...prices, cur) : cur * 0.995;
      let maxP = prices.length ? Math.max(...prices, cur) : cur * 1.005;

      // Include active position entry prices in scale so lines are never clipped
      activePlays.forEach((p) => {
        minP = Math.min(minP, p.entryPrice);
        maxP = Math.max(maxP, p.entryPrice);
      });

      const span = maxP - minP || 1;
      const padding = span * 0.12;
      const yMin = minP - padding;
      const yMax = maxP + padding;

      const getY = (val: number) => topMargin + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

      // Draw Grid Lines (Horizontal & Vertical)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;

      // Horizontal price grid ticks
      const gridTicks = 6;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "left";

      for (let i = 0; i <= gridTicks; i++) {
        const pVal = yMin + ((yMax - yMin) / gridTicks) * i;
        const y = getY(pVal);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();

        // Right axis price label
        ctx.fillText(`$${formatPrice(pVal)}`, plotW + 8, y + 3);
      }

      // Vertical time grid ticks
      const timeTicks = 5;
      for (let i = 0; i <= timeTicks; i++) {
        const x = (plotW / timeTicks) * i;
        ctx.beginPath();
        ctx.moveTo(x, topMargin);
        ctx.lineTo(x, topMargin + plotH);
        ctx.stroke();

        const tLabel = formatTime(Date.now() - (1 - i / timeTicks) * (activeWindowSec * 1000));
        ctx.textAlign = "center";
        ctx.fillText(tLabel, x, cHeight - 12);
      }

      // Render data points slice
      const pts = data.slice(-Math.min(data.length, 120));

      // Enhanced Kinetic Volume Histogram (Bottom 20% of chart)
      const volH = plotH * 0.22;
      const volBaseY = topMargin + plotH;
      const nBars = 42;
      const barW = (plotW / nBars) * 0.72;
      const tNow = Date.now();

      for (let i = 0; i < nBars; i++) {
        const bx = (plotW / nBars) * i + (plotW / nBars - barW) / 2;
        
        // Multi-frequency wave simulation with real tick reactivity
        const wave1 = Math.sin(i * 0.38 + tNow * 0.0022);
        const wave2 = Math.cos(i * 0.15 - tNow * 0.0015);
        const wave3 = Math.sin((i + (pts.length % 20)) * 0.5 + tNow * 0.004);
        const combined = Math.max(0.1, (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2 + 1) / 2);
        
        const barH = combined * volH * 0.88 + 5;
        const isUp = i % 3 !== 0;

        // Check if cursor is hovering near this bar
        const isHovered = hoverData && hoverData.x >= bx && hoverData.x <= bx + barW;

        // Vertical gradient for each bar
        const barGrad = ctx.createLinearGradient(0, volBaseY, 0, volBaseY - barH);
        if (isUp) {
          barGrad.addColorStop(0, "rgba(0, 240, 118, 0.05)");
          barGrad.addColorStop(0.7, isHovered ? "rgba(0, 240, 118, 0.6)" : "rgba(0, 240, 118, 0.25)");
          barGrad.addColorStop(1, isHovered ? "rgba(0, 240, 118, 0.95)" : "rgba(0, 240, 118, 0.5)");
        } else {
          barGrad.addColorStop(0, "rgba(255, 51, 88, 0.05)");
          barGrad.addColorStop(0.7, isHovered ? "rgba(255, 51, 88, 0.6)" : "rgba(255, 51, 88, 0.25)");
          barGrad.addColorStop(1, isHovered ? "rgba(255, 51, 88, 0.95)" : "rgba(255, 51, 88, 0.5)");
        }

        ctx.fillStyle = barGrad;
        ctx.fillRect(bx, volBaseY - barH, barW, barH);

        // Luminous Laser Cap at the tip of each volume bar
        ctx.fillStyle = isUp ? "#00f076" : "#ff3358";
        ctx.shadowColor = isUp ? "rgba(0, 240, 118, 0.8)" : "rgba(255, 51, 88, 0.8)";
        ctx.shadowBlur = isHovered ? 8 : 4;
        ctx.fillRect(bx, volBaseY - barH, barW, 2);
        ctx.shadowBlur = 0; // reset shadow
      }

      // Render Candlesticks or Smooth Line with Flow Animation
      const flow = Math.max(0.01, Math.min(1, flowProgressRef.current));

      if (chartType === "candle" && candles.length > 1) {
        const candleW = Math.max(3, (plotW / candles.length) * 0.65);
        const maxCandleIdx = Math.floor(flow * candles.length);

        candles.forEach((c, idx) => {
          if (idx > maxCandleIdx) return;
          const cx = (plotW / (candles.length - 1 || 1)) * idx;
          const openY = getY(c.open);
          const closeY = getY(c.close);
          const highY = getY(c.high);
          const lowY = getY(c.low);
          const isUp = c.close >= c.open;

          ctx.strokeStyle = isUp ? "#00f076" : "#ff3358";
          ctx.fillStyle = isUp ? "rgba(0, 240, 118, 0.8)" : "rgba(255, 51, 88, 0.8)";

          // Wick
          ctx.beginPath();
          ctx.moveTo(cx, highY);
          ctx.lineTo(cx, lowY);
          ctx.stroke();

          // Body
          const top = Math.min(openY, closeY);
          const bodyH = Math.max(2, Math.abs(closeY - openY));
          ctx.fillRect(cx - candleW / 2, top, candleW, bodyH);
        });
      } else if (pts.length > 1) {
        // Line & Glowing Gradient Area with Flowing Wave Animation
        const stepX = plotW / (pts.length - 1);
        const maxTarget = (pts.length - 1) * flow;
        const maxIdx = Math.min(pts.length - 2, Math.floor(maxTarget));
        const frac = maxTarget - maxIdx;

        const pA = pts[maxIdx];
        const pB = pts[Math.min(pts.length - 1, maxIdx + 1)];
        const headX = (maxIdx + frac) * stepX;
        const headY = getY(pA.p + (pB.p - pA.p) * frac);

        // Fill area up to current flowing headX
        const grad = ctx.createLinearGradient(0, topMargin, 0, topMargin + plotH);
        grad.addColorStop(0, "rgba(0, 240, 118, 0.24)");
        grad.addColorStop(0.5, "rgba(0, 240, 118, 0.06)");
        grad.addColorStop(1, "rgba(0, 240, 118, 0.0)");

        ctx.beginPath();
        ctx.moveTo(0, getY(pts[0].p));
        for (let idx = 1; idx <= maxIdx; idx++) {
          ctx.lineTo(idx * stepX, getY(pts[idx].p));
        }
        ctx.lineTo(headX, headY);
        ctx.lineTo(headX, topMargin + plotH);
        ctx.lineTo(0, topMargin + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line up to current flowing headX
        ctx.beginPath();
        ctx.moveTo(0, getY(pts[0].p));
        for (let idx = 1; idx <= maxIdx; idx++) {
          ctx.lineTo(idx * stepX, getY(pts[idx].p));
        }
        ctx.lineTo(headX, headY);
        ctx.strokeStyle = "#00f076";
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Flowing Comet Head / Neon Energy Tip
        const pulse = Math.sin(Date.now() * 0.005) * 4 + 10;
        const radial = ctx.createRadialGradient(headX, headY, 1, headX, headY, pulse * (flow < 0.98 ? 1.4 : 1));
        radial.addColorStop(0, "rgba(0, 240, 118, 0.95)");
        radial.addColorStop(0.5, "rgba(0, 240, 118, 0.4)");
        radial.addColorStop(1, "rgba(0, 240, 118, 0)");

        ctx.beginPath();
        ctx.arc(headX, headY, pulse * (flow < 0.98 ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = radial;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(headX, headY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Flow wave ripple while actively flowing
        if (flow < 0.98) {
          ctx.strokeStyle = "rgba(0, 240, 118, 0.7)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(headX, headY, pulse * 1.8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Current Price Horizontal Dotted Ray & Live Badge on Y-axis (Fades in as flow completes)
      if (cur) {
        const curY = getY(cur);
        const rayAlpha = Math.min(1, flow * 1.2);

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = `rgba(0, 240, 118, ${0.6 * rayAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, curY);
        ctx.lineTo(plotW, curY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing price badge on the right axis
        ctx.fillStyle = "#00f076";
        ctx.beginPath();
        ctx.roundRect(plotW + 2, curY - 11, rightMargin - 4, 22, 5);
        ctx.fill();

        // Price text inside badge
        ctx.fillStyle = "#0b0d12";
        ctx.font = "bold 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`$${formatPrice(cur)}`, plotW + rightMargin / 2, curY + 3.5);
      }

      // Active Position Entry Rays Overlay
      activePlays.forEach((p) => {
        const eY = getY(p.entryPrice);
        const isUp = p.direction === "up";
        const col = isUp ? "#00f076" : "#ff3358";

        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, eY);
        ctx.lineTo(plotW, eY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small badge on entry line
        const remainingSec = Math.max(0, (p.expiresAt - Date.now()) / 1000).toFixed(1);
        ctx.fillStyle = isUp ? "rgba(0, 240, 118, 0.2)" : "rgba(255, 51, 88, 0.2)";
        ctx.beginPath();
        ctx.roundRect(8, eY - 10, 130, 20, 4);
        ctx.fill();

        ctx.strokeStyle = col;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(
          `${isUp ? "▲ UP" : "▼ DOWN"} $${p.collateralUsd} · ${remainingSec}s left`,
          14,
          eY + 4
        );
      });

      // Interactive Crosshair & Tooltips
      if (hoverData) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(hoverData.x, topMargin);
        ctx.lineTo(hoverData.x, topMargin + plotH);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, hoverData.y);
        ctx.lineTo(plotW, hoverData.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hover price pill on Y-axis
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(plotW + 2, hoverData.y - 10, rightMargin - 4, 20, 4);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`$${formatPrice(hoverData.price)}`, plotW + rightMargin / 2, hoverData.y + 3.5);
      }

      ctx.restore();
      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [data, currentPrice, activePlays, chartType, candles, activeWindowSec, hoverData]);

  return (
    <div
      ref={containerRef}
      className={`terminal-card flex flex-col overflow-hidden bg-[#121620] relative ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : ""
      }`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      {/* Chart Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] px-3 py-2 bg-[#0e1118]">
        {/* Left Toolbar Items: Type Toggle & Timeframes */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {/* Chart Type (Line / Candle) */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 mr-2">
            <button
              onClick={() => setChartType("line")}
              title="Line Chart"
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
                chartType === "line"
                  ? "bg-[#00f076] text-[#090a0f] font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChartType("candle")}
              title="Candlestick Chart"
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
                chartType === "candle"
                  ? "bg-[#00f076] text-[#090a0f] font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CandleIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setActiveTf(tf.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide transition-all ${
                  activeTf === tf.id
                    ? "bg-white/[0.12] text-[#00f076] shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Toolbar Items: Indicators, Screenshot, Fullscreen */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors ${
              showIndicators
                ? "bg-white/[0.08] text-slate-200 border border-white/[0.12]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span className="hidden sm:inline">Indicators</span>
          </button>

          <button
            onClick={handleScreenshot}
            title="Download Chart Snapshot"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas Area with Crosshair inspection */}
      <div
        className="relative flex-1 w-full cursor-crosshair overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full block" />

        {/* Hover inspection pill at top-left of canvas */}
        {hoverData && (
          <div className="absolute left-3 top-3 z-10 flex items-center gap-3 rounded-lg border border-white/[0.12] bg-[#0b0d12]/90 px-3 py-1.5 text-xs backdrop-blur-md">
            <span className="font-mono text-slate-400">{formatTime(hoverData.time)}</span>
            <span className="font-mono font-extrabold text-[#00f076]">${formatPrice(hoverData.price)}</span>
          </div>
        )}

        {/* Connecting overlay state if no data */}
        {data.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0d12]/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#141824] px-4 py-2 text-xs font-bold text-slate-300">
              <span className="live-pulse-dot" />
              <span>Connecting to Hyperliquid Live Feed…</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Readout Bar */}
      <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-2 text-[11px] font-medium text-slate-400 bg-[#0e1118]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#00f076] font-bold">
            <span className="live-pulse-dot" />
            1s Streaming Updates
          </span>
          <span className="hidden sm:inline text-slate-500">·</span>
          <span className="hidden sm:inline">{data.length} Real-Time Ticks</span>
        </div>

        <div className="flex items-center gap-2">
          {activePlays.length > 0 ? (
            <span className="rounded bg-[#00f076]/10 px-2 py-0.5 font-bold text-[#00f076] border border-[#00f076]/20">
              {activePlays.length} Active Positions Projected
            </span>
          ) : (
            <span className="text-slate-500">Ready for order placement</span>
          )}
        </div>
      </div>
    </div>
  );
}
