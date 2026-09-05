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
import { useTheme } from "@/app/providers/theme-provider";

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
  height = 600,
}: TerminalChartProps) {
  const { mode, activeTintConfig } = useTheme();

  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [activeTf, setActiveTf] = useState<string>("5s");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);
  const [hoverData, setHoverData] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Flow animation controller when switching tokens or toggling chart types (line vs candle)
  const flowProgressRef = useRef(1);
  const prevSymbolRef = useRef(symbol);
  const prevChartTypeRef = useRef(chartType);

  useEffect(() => {
    const isSymbolChange = symbol !== prevSymbolRef.current;
    const isTypeChange = chartType !== prevChartTypeRef.current;

    if (isSymbolChange || isTypeChange) {
      prevSymbolRef.current = symbol;
      prevChartTypeRef.current = chartType;
      flowProgressRef.current = 0;
      const startTime = performance.now();
      const duration = isTypeChange ? 650 : 750; // 650ms entry sweep on mode toggle

      const step = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / duration);
        // Ease-out cubic: fast fluid surge that flows across
        flowProgressRef.current = 1 - Math.pow(1 - p, 3);
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          flowProgressRef.current = 1;
        }
      };
      requestAnimationFrame(step);
    }
  }, [symbol, chartType]);

  // Selected timeframe window duration
  const activeWindowSec = TIMEFRAMES.find((tf) => tf.id === activeTf)?.sec ?? 45;

  // Synthesize realistic, high-polish OHLC bars if in candle mode
  const candles = useMemo(() => {
    if (data.length === 0) return [];
    const bucketMs = Math.max(1500, (activeWindowSec * 1000) / 28);
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

    const raw = Array.from(map.values()).sort((a, b) => a.time - b.time);
    if (raw.length === 0) return [];

    // Ensure authentic financial candle anatomy:
    // 1. Each candle opens at the previous candle's close
    // 2. Add natural upper and lower shadow wicks so candles don't look like flat horizontal slits
    const smoothed: typeof raw = [];
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      const prevClose = i > 0 ? smoothed[i - 1].close : c.open;
      const open = prevClose;
      const close = c.close;
      const spread = Math.abs(close - open);
      const minWick = Math.max(spread * 0.45, (c.high || close) * 0.0002);

      const high = Math.max(c.high, Math.max(open, close) + minWick);
      const low = Math.min(c.low, Math.min(open, close) - minWick);

      smoothed.push({
        time: c.time,
        open,
        high,
        low,
        close,
        vol: c.vol,
      });
    }

    return smoothed;
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

      // Margins - optimized to maximize drawable canvas space
      const topMargin = 14;
      const bottomMargin = 26;
      const rightMargin = 66; // for Y-axis scale
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
      const padding = span * 0.07;
      const yMin = minP - padding;
      const yMax = maxP + padding;

      const getY = (val: number) => topMargin + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

      // Draw Grid Lines (Horizontal & Vertical)
      ctx.strokeStyle = mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)";
      ctx.lineWidth = 1;

      // Horizontal price grid ticks
      const gridTicks = 6;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = mode === "dark" ? "#8492a6" : "#475569";
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

      // Render Candlesticks or Smooth Line with Flow Animation
      const flow = Math.max(0.01, Math.min(1, flowProgressRef.current));
      const tNow = Date.now();

      // =========================================================================
      // BOTTOM VISUALIZATION:
      // - Line Chart Mode: Animated Volume Equalizer Bars with Laser Caps
      // - Candle Chart Mode: Animated Flowing Momentum Wave Line
      // =========================================================================
      const volH = plotH * 0.15;
      const volBaseY = topMargin + plotH;

      if (chartType === "line") {
        // LINE MODE: Animated Kinetic Volume Histogram Bars with Laser Caps
        const nBars = 42;
        const barW = (plotW / nBars) * 0.72;

        for (let i = 0; i < nBars; i++) {
          const bx = (plotW / nBars) * i + (plotW / nBars - barW) / 2;

          // Multi-frequency wave simulation with live price tick reactivity
          const wave1 = Math.sin(i * 0.38 + tNow * 0.0022);
          const wave2 = Math.cos(i * 0.15 - tNow * 0.0015);
          const wave3 = Math.sin((i + (pts.length % 20)) * 0.5 + tNow * 0.004);
          const combined = Math.max(0.1, (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2 + 1) / 2);

          // Staggered entry spring surge
          const barSurge = Math.max(0.04, Math.min(1, (flow - (i / nBars) * 0.35) * 2.8));
          const barH = (combined * volH * 0.88 + 5) * barSurge;
          const isUp = i % 3 !== 0;

          // Hover detection
          const isHovered = hoverData && hoverData.x >= bx && hoverData.x <= bx + barW;

          // Vertical gradient for each bar - futuristic silver-ice translucent bars matching Image 1
          const barGrad = ctx.createLinearGradient(0, volBaseY, 0, volBaseY - barH);
          if (isUp) {
            barGrad.addColorStop(0, "rgba(220, 235, 255, 0.02)");
            barGrad.addColorStop(0.7, isHovered ? "rgba(180, 230, 255, 0.45)" : "rgba(200, 225, 255, 0.22)");
            barGrad.addColorStop(1, isHovered ? "rgba(255, 255, 255, 0.85)" : "rgba(220, 240, 255, 0.45)");
          } else {
            barGrad.addColorStop(0, "rgba(255, 180, 200, 0.02)");
            barGrad.addColorStop(0.7, isHovered ? "rgba(255, 100, 130, 0.45)" : "rgba(255, 120, 150, 0.22)");
            barGrad.addColorStop(1, isHovered ? "rgba(255, 220, 230, 0.85)" : "rgba(255, 140, 170, 0.45)");
          }

          ctx.fillStyle = barGrad;
          ctx.fillRect(bx, volBaseY - barH, barW, barH);

          // Luminous Laser Cap at the tip of each volume bar
          ctx.fillStyle = isUp ? "rgba(210, 240, 255, 0.95)" : "rgba(255, 140, 170, 0.95)";
          ctx.shadowColor = isUp ? "rgba(140, 210, 255, 0.8)" : "rgba(255, 90, 120, 0.8)";
          ctx.shadowBlur = isHovered ? 8 : 4;
          ctx.fillRect(bx, volBaseY - barH, barW, 2);
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = mode === "dark" ? "rgba(255, 255, 255, 0.35)" : "rgba(15, 23, 42, 0.45)";
        ctx.font = "9px monospace";
        ctx.fillText("VOLUME EQUALIZER · 1s TICKS", 10, volBaseY - 6);
      } else {
        // CANDLE MODE: Animated Flowing Momentum Wave Line
        const wavePointsCount = 64;
        const waveStepX = plotW / (wavePointsCount - 1);
        const waveCoords: { x: number; y: number }[] = [];

        for (let i = 0; i < wavePointsCount; i++) {
          const wx = i * waveStepX;
          const normX = i / wavePointsCount;

          const wave1 = Math.sin(normX * 8 + tNow * 0.0022);
          const wave2 = Math.cos(normX * 16 - tNow * 0.003) * 0.5;
          const wave3 = Math.sin(normX * 28 + tNow * 0.0045) * 0.25;
          const combined = Math.max(0.1, Math.min(0.95, (wave1 + wave2 + wave3 + 1.75) / 3.5));

          const waveSurge = Math.max(0.05, Math.min(1, (flow - normX * 0.3) * 2));
          const wy = volBaseY - (combined * volH * 0.85 + 4) * waveSurge;
          waveCoords.push({ x: wx, y: wy });
        }

        // Draw glowing gradient area below the wave line
        const waveAreaGrad = ctx.createLinearGradient(0, volBaseY - volH, 0, volBaseY);
        waveAreaGrad.addColorStop(0, "rgba(0, 240, 118, 0.16)");
        waveAreaGrad.addColorStop(0.5, "rgba(0, 229, 255, 0.06)");
        waveAreaGrad.addColorStop(1, "rgba(0, 240, 118, 0.0)");

        ctx.beginPath();
        ctx.moveTo(waveCoords[0].x, volBaseY);
        ctx.lineTo(waveCoords[0].x, waveCoords[0].y);
        for (let i = 1; i < waveCoords.length; i++) {
          const prev = waveCoords[i - 1];
          const curr = waveCoords[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        ctx.lineTo(waveCoords[waveCoords.length - 1].x, waveCoords[waveCoords.length - 1].y);
        ctx.lineTo(waveCoords[waveCoords.length - 1].x, volBaseY);
        ctx.closePath();
        ctx.fillStyle = waveAreaGrad;
        ctx.fill();

        // Draw glowing neon wave stroke line
        const waveLineGrad = ctx.createLinearGradient(0, 0, plotW, 0);
        waveLineGrad.addColorStop(0, "rgba(0, 240, 118, 0.4)");
        waveLineGrad.addColorStop(0.5, "#00f076");
        waveLineGrad.addColorStop(1, "#00e5ff");

        ctx.beginPath();
        ctx.moveTo(waveCoords[0].x, waveCoords[0].y);
        for (let i = 1; i < waveCoords.length; i++) {
          const prev = waveCoords[i - 1];
          const curr = waveCoords[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        ctx.lineTo(waveCoords[waveCoords.length - 1].x, waveCoords[waveCoords.length - 1].y);

        ctx.strokeStyle = waveLineGrad;
        ctx.lineWidth = 2.0;
        ctx.shadowColor = "rgba(0, 240, 118, 0.5)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Flowing energy particle traveling along the wave
        const particleProgress = (tNow % 3600) / 3600;
        const pIdx = Math.min(waveCoords.length - 2, Math.floor(particleProgress * (waveCoords.length - 1)));
        const pFrac = particleProgress * (waveCoords.length - 1) - pIdx;
        const px = waveCoords[pIdx].x + (waveCoords[pIdx + 1].x - waveCoords[pIdx].x) * pFrac;
        const py = waveCoords[pIdx].y + (waveCoords[pIdx + 1].y - waveCoords[pIdx].y) * pFrac;

        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = mode === "dark" ? "rgba(255, 255, 255, 0.35)" : "rgba(15, 23, 42, 0.45)";
        ctx.font = "9px monospace";
        ctx.fillText("MOMENTUM STREAM · 1s LIVE", 10, volBaseY - 6);
      }

      // =========================================================================
      // MAIN CHART VISUALIZATION:
      // - Candlestick View with laser sweep entry & rounded dual-gradient bodies
      // - Line View with fluid wave comet flow
      // =========================================================================
      if (chartType === "candle" && candles.length > 1) {
        const candleCount = candles.length;
        const slotW = plotW / candleCount;
        const candleW = Math.max(4, Math.min(15, slotW * 0.62));
        const maxCandleIdx = Math.floor(flow * candleCount);

        // Cool Laser Scanline Sweep on Entry Animation
        if (flow < 0.98) {
          const scanX = plotW * flow;
          const scanGrad = ctx.createLinearGradient(scanX - 36, 0, scanX + 6, 0);
          scanGrad.addColorStop(0, "rgba(0, 240, 118, 0)");
          scanGrad.addColorStop(0.85, "rgba(0, 240, 118, 0.12)");
          scanGrad.addColorStop(1, "rgba(0, 240, 118, 0.75)");

          ctx.fillStyle = scanGrad;
          ctx.fillRect(scanX - 36, topMargin, 42, plotH);

          ctx.strokeStyle = "#00f076";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#00f076";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(scanX, topMargin);
          ctx.lineTo(scanX, topMargin + plotH);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        candles.forEach((c, idx) => {
          if (idx > maxCandleIdx) return;
          const cx = slotW * idx + slotW / 2;
          const openY = getY(c.open);
          const closeY = getY(c.close);
          const highY = getY(c.high);
          const lowY = getY(c.low);
          const isUp = c.close >= c.open;
          const isLatest = idx === candleCount - 1;

          // Scaling factor as the entry wave hits this candle
          const candleEntryProgress = Math.max(0.05, Math.min(1, (flow - (idx / candleCount) * 0.8) * 3));

          // 1. High-Precision Centered Wick (Shadow)
          const midY = (openY + closeY) / 2;
          const scaledHighY = midY - (midY - highY) * candleEntryProgress;
          const scaledLowY = midY + (lowY - midY) * candleEntryProgress;

          ctx.beginPath();
          ctx.moveTo(cx, scaledHighY);
          ctx.lineTo(cx, scaledLowY);
          ctx.strokeStyle = isUp ? "rgba(0, 240, 118, 0.85)" : "rgba(255, 51, 88, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 2. High-Polish Candlestick Body with subtle rounded corners & dual-stop gradient
          const rawTop = Math.min(openY, closeY);
          const rawH = Math.abs(closeY - openY);
          const bodyH = Math.max(3, rawH) * candleEntryProgress;
          const top = midY - bodyH / 2;
          const bodyX = cx - candleW / 2;

          const cGrad = ctx.createLinearGradient(0, top, 0, top + bodyH);
          if (isUp) {
            cGrad.addColorStop(0, "rgba(0, 255, 128, 0.95)");
            cGrad.addColorStop(1, "rgba(0, 175, 80, 0.82)");
          } else {
            cGrad.addColorStop(0, "rgba(255, 75, 110, 0.95)");
            cGrad.addColorStop(1, "rgba(200, 30, 65, 0.82)");
          }

          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(bodyX, top, candleW, bodyH, 2);
          } else {
            ctx.rect(bodyX, top, candleW, bodyH);
          }

          if (isLatest) {
            ctx.shadowColor = isUp ? "rgba(0, 240, 118, 0.6)" : "rgba(255, 51, 88, 0.6)";
            ctx.shadowBlur = 8;
          }

          ctx.fillStyle = cGrad;
          ctx.fill();

          // Crisp neon border stroke
          ctx.strokeStyle = isUp ? "#00f076" : "#ff3358";
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // 3. Live pulsating beacon for the latest active candle
          if (isLatest && flow > 0.8) {
            const activeY = closeY;
            const pulse = Math.sin(tNow * 0.006) * 2 + 5;
            ctx.beginPath();
            ctx.arc(cx, activeY, pulse, 0, Math.PI * 2);
            ctx.fillStyle = isUp ? "rgba(0, 240, 118, 0.35)" : "rgba(255, 51, 88, 0.35)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, activeY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          }
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
        grad.addColorStop(0, activeTintConfig.subtleBg.replace("0.08", "0.22"));
        grad.addColorStop(0.6, activeTintConfig.subtleBg);
        grad.addColorStop(1, "transparent");

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
        ctx.strokeStyle = activeTintConfig.color;
        ctx.lineWidth = 2.6;
        ctx.shadowColor = activeTintConfig.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Flowing Comet Head / Energy Tip
        const pulse = Math.sin(Date.now() * 0.005) * 4 + 10;
        const radial = ctx.createRadialGradient(headX, headY, 1, headX, headY, pulse * (flow < 0.98 ? 1.4 : 1));
        radial.addColorStop(0, activeTintConfig.color);
        radial.addColorStop(0.5, activeTintConfig.subtleBg);
        radial.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(headX, headY, pulse * (flow < 0.98 ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = radial;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(headX, headY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Flow wave ripple while actively flowing
        if (flow < 0.98) {
          ctx.strokeStyle = activeTintConfig.borderColor;
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
        ctx.strokeStyle = activeTintConfig.borderColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, curY);
        ctx.lineTo(plotW, curY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing price badge on the right axis
        ctx.fillStyle = activeTintConfig.color;
        ctx.beginPath();
        ctx.roundRect(plotW + 2, curY - 11, rightMargin - 4, 22, 5);
        ctx.fill();

        // Price text inside badge
        ctx.fillStyle = mode === "dark" ? "#07090e" : "#ffffff";
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
        ctx.fillStyle = mode === "dark" ? "#0f172a" : "#ffffff";
        ctx.beginPath();
        ctx.roundRect(plotW + 2, hoverData.y - 10, rightMargin - 4, 20, 4);
        ctx.fill();
        ctx.strokeStyle = mode === "dark" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.15)";
        ctx.stroke();

        ctx.fillStyle = mode === "dark" ? "#ffffff" : "#090d16";
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
  }, [data, currentPrice, activePlays, chartType, candles, activeWindowSec, hoverData, mode, activeTintConfig]);

  return (
    <div
      ref={containerRef}
      className={`terminal-card flex flex-col overflow-hidden relative w-full ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none h-screen"
          : "min-h-[460px] sm:min-h-[520px] lg:min-h-[590px]"
      }`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      {/* Chart Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--glass-card-border)] px-3 py-2 bg-[var(--glass-card-bg)] backdrop-blur-md">
        {/* Left Toolbar Items: Type Toggle & Timeframes */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {/* Chart Type (Line / Candle) */}
          <div className="flex items-center rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] p-0.5 mr-2">
            <button
              onClick={() => setChartType("line")}
              title="Line Chart"
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all ${
                chartType === "line"
                  ? "bg-[var(--ink)] text-[var(--bg)] font-extrabold shadow-sm"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChartType("candle")}
              title="Candlestick Chart"
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all ${
                chartType === "candle"
                  ? "bg-[var(--ink)] text-[var(--bg)] font-extrabold shadow-sm"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <CandleIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => {
              const isSelected = activeTf === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => setActiveTf(tf.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide transition-all border ${
                    isSelected
                      ? "shadow-sm"
                      : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-card-hover-bg)]"
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: activeTintConfig.subtleBg,
                          color: activeTintConfig.color,
                          borderColor: activeTintConfig.borderColor,
                        }
                      : undefined
                  }
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Toolbar Items: Indicators, Screenshot, Fullscreen */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all border ${
              showIndicators
                ? "bg-[var(--glass-card-hover-bg)] text-[var(--ink)] border-[var(--glass-card-hover-border)] shadow-sm"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-card-hover-bg)]"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span className="hidden sm:inline">Indicators</span>
          </button>

          <button
            onClick={handleScreenshot}
            title="Download Chart Snapshot"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--glass-card-hover-bg)] hover:text-[var(--ink)] transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--glass-card-hover-bg)] hover:text-[var(--ink)] transition-colors"
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
          <div className="absolute left-3 top-3 z-10 flex items-center gap-3 rounded-xl border border-[var(--glass-panel-border)] glass-panel-elevated px-3 py-1.5 text-xs text-[var(--ink)] shadow-xl">
            <span className="font-mono text-[var(--ink-muted)]">{formatTime(hoverData.time)}</span>
            <span className="font-mono font-extrabold" style={{ color: activeTintConfig.color }}>
              ${formatPrice(hoverData.price)}
            </span>
          </div>
        )}

        {/* Connecting overlay state if no data */}
        {data.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-full border border-[var(--glass-panel-border)] glass-panel-elevated px-4 py-2 text-xs font-bold text-[var(--ink)] shadow-xl">
              <span className="live-pulse-dot" />
              <span>Connecting to Hyperliquid Live Feed…</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Readout Bar */}
      <div className="flex items-center justify-between border-t border-[var(--glass-card-border)] px-4 py-2 text-[11px] font-medium text-[var(--ink-muted)] bg-[var(--glass-card-bg)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: activeTintConfig.color }}>
            <span className="live-pulse-dot" />
            1s Streaming Updates
          </span>
          <span className="hidden sm:inline text-[var(--ink-faint)]">·</span>
          <span className="hidden sm:inline">{data.length} Real-Time Ticks</span>
        </div>

        <div className="flex items-center gap-2">
          {activePlays.length > 0 ? (
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-400 border border-emerald-500/20">
              {activePlays.length} Active Positions Projected
            </span>
          ) : (
            <span className="text-[var(--ink-muted)]">Ready for order placement</span>
          )}
        </div>
      </div>
    </div>
  );
}
