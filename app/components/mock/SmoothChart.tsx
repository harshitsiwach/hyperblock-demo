"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Point { t: number; p: number }

export function useSmoothPrice(rawPrice: number | null, intervalMs = 1000) {
  const [display, setDisplay] = useState(rawPrice ?? 0);
  const targetRef = useRef(rawPrice ?? 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rawPrice != null) targetRef.current = rawPrice;
  }, [rawPrice]);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / intervalMs;
      last = now;
      setDisplay((prev) => {
        const diff = targetRef.current - prev;
        // lerp 0.12 per frame ~ smooth 1s
        const next = prev + diff * Math.min(1, 0.18 + dt * 0.6);
        if (Math.abs(diff) < 0.005) return targetRef.current;
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [intervalMs]);

  return display;
}

export function SmoothLiveChart({
  history,
  currentPrice,
  color,
  height = 120,
  showGrid = true,
  showEntry,
  isUp,
}: {
  history: Point[];
  currentPrice: number | null;
  color: string;
  height?: number;
  showGrid?: boolean;
  showEntry?: number | null;
  isUp?: boolean;
}) {
  const smooth = useSmoothPrice(currentPrice, 1000);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 600, H = height;
  const PAD = 10;

  const { line, area, points, min, max } = useMemo(() => {
    const pts = history.length ? history : currentPrice ? [{ t: Date.now(), p: currentPrice }] : [];
    if (pts.length < 2) return { line: "", area: "", points: [] as any, min: 0, max: 1 };
    const vals = pts.map((x) => x.p);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const pad = (maxV - minV) * 0.12 || maxV * 0.01 || 1;
    const lo = minV - pad;
    const hi = maxV + pad;
    const range = hi - lo || 1;
    const pts2 = pts.map((pt, i) => {
      const x = PAD + (i / (pts.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((pt.p - lo) / range) * (H - PAD * 2 - 10);
      return { x, y, p: pt.p, t: pt.t };
    });
    // smooth the last segment towards smooth price
    if (pts2.length > 1 && currentPrice != null) {
      const last = pts2[pts2.length - 1];
      const targetY = H - PAD - ((smooth - lo) / range) * (H - PAD * 2 - 10);
      last.y += (targetY - last.y) * 0.35;
    }
    let d = `M ${pts2[0].x.toFixed(1)} ${pts2[0].y.toFixed(1)}`;
    for (let i = 1; i < pts2.length; i++) {
      const cx = (pts2[i - 1].x + pts2[i].x) / 2;
      d += ` C ${cx.toFixed(1)} ${pts2[i - 1].y.toFixed(1)}, ${cx.toFixed(1)} ${pts2[i].y.toFixed(1)}, ${pts2[i].x.toFixed(1)} ${pts2[i].y.toFixed(1)}`;
    }
    const areaD = `${d} L ${pts2[pts2.length - 1].x.toFixed(1)} ${H - PAD} L ${pts2[0].x.toFixed(1)} ${H - PAD} Z`;
    return { line: d, area: areaD, points: pts2, min: lo, max: hi };
  }, [history, smooth, currentPrice]);

  const yTicks = useMemo(() => {
    if (!history.length) return [];
    const vals = history.map((x) => x.p);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mid = (min + max) / 2;
    return [max, mid, min].map((v) => ({
      v,
      y: H - PAD - ((v - (min - (max - min) * 0.12 || 0)) / ((max - min) * 1.24 || 1)) * (H - PAD * 2 - 10),
    }));
  }, [history]);

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height, display: "block", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--hair)" }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((x - PAD) / (W - PAD * 2)) * (history.length - 1));
          setHover(Math.max(0, Math.min(history.length - 1, idx)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="smoothFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
        </defs>
        {showGrid && (
          <g opacity="0.5">
            {[0, 1, 2].map((i) => (
              <line key={i} x1={PAD} x2={W - PAD} y1={PAD + (i * (H - PAD * 2 - 10)) / 2} y2={PAD + (i * (H - PAD * 2 - 10)) / 2} stroke="var(--hair)" strokeWidth="1" strokeDasharray={i === 1 ? "4 6" : undefined} />
            ))}
          </g>
        )}
        {/* y labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={W - PAD - 2} y={t.y - 4} textAnchor="end" fontSize="10" fontWeight="700" fill="var(--mut)" style={{ fontVariantNumeric: "tabular-nums" }}>
            ${t.v.toFixed(t.v > 1000 ? 0 : 2)}
          </text>
        ))}
        {/* entry line */}
        {showEntry != null && history.length > 0 && (() => {
          const vals = history.map((x) => x.p);
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          const padR = (max - min) * 0.12 || 1;
          const lo = min - padR;
          const hi = max + padR;
          const y = H - PAD - ((showEntry - lo) / (hi - lo || 1)) * (H - PAD * 2 - 10);
          return <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke={isUp ? "var(--up)" : "var(--down)"} strokeWidth="1.2" strokeDasharray="6 4" opacity="0.9" />;
        })()}
        {area && <path d={area} fill="url(#smoothFill)" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" style={{ transition: "d 0.2s linear" }} />}
        {/* hover */}
        {hover != null && (points as any)[hover] && (
          <g>
            <line x1={(points as any)[hover].x} x2={(points as any)[hover].x} y1={PAD} y2={H - PAD} stroke="var(--hair)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx={(points as any)[hover].x} cy={(points as any)[hover].y} r="5" fill="var(--card)" stroke={color} strokeWidth="2" />
          </g>
        )}
        {/* live dot */}
        {(points as any).length > 0 && hover == null && (
          <g>
            {(() => {
              const p: any = (points as any)[(points as any).length - 1];
              return (
                <>
                  <circle cx={p.x} cy={p.y} r="12" fill={color} opacity="0.14" style={{ animation: "mock-pulse 1.2s ease-out infinite" }} />
                  <circle cx={p.x} cy={p.y} r="5" fill="var(--card)" stroke={color} strokeWidth="2" />
                  <circle cx={p.x} cy={p.y} r="2.4" fill={color} />
                </>
              );
            })()}
          </g>
        )}
      </svg>
      {hover != null && (points as any)[hover] && (
        <div
          className="hl-v2-tooltip"
          style={{
            left: `clamp(12px, ${(points as any)[hover].x / W * 100}%, calc(100% - 140px))`,
            top: `${(points as any)[hover].y - 8}px`,
          }}
        >
          <span className="num">${(points as any)[hover].p.toFixed(2)}</span>
          <small>{new Date(history[hover].t).toLocaleTimeString()}</small>
        </div>
      )}
    </div>
  );
}
