"use client";

import { useEffect, useRef } from "react";

export function WinCelebration({ profit, show, onDone }: { profit: number; show: boolean; onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    // haptic + sound
    try {
      navigator.vibrate?.([30, 50, 30, 80]);
      // tiny beep via WebAudio
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = profit > 0 ? 880 : 220;
      o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.12, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      o.start(); o.stop(ac.currentTime + 0.5);
    } catch {}

    const particles: any[] = [];
    const colors = profit > 0 ? ["#00a862", "#2bd186", "#f5a623", "#fff"] : ["#e5484d", "#ff6b6e", "#6e7076"];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * 120,
        y: H / 3,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 10 - 2,
        r: Math.random() * 4 + 2,
        c: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
      });
    }
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 16;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.vx *= 0.99; p.rot += p.vr; p.life -= p.decay;
        if (p.life <= 0) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      }
      if (alive > 0 && t < 3200) raf = requestAnimationFrame(draw);
      else onDone?.();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [show, profit, onDone]);

  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          transform: "translate(-50%, -50%)",
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
          border: `1px solid ${profit > 0 ? "var(--up)" : "var(--down)"}`,
          borderRadius: 20,
          padding: "18px 26px",
          textAlign: "center",
          boxShadow: `0 20px 60px rgba(0,0,0,0.18), 0 0 0 8px color-mix(in srgb, ${profit > 0 ? "var(--up)" : "var(--down)"} 14%, transparent)`,
          backdropFilter: "blur(12px)",
          animation: "win-pop 0.7s cubic-bezier(.16,1,.3,1)",
          minWidth: 260,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: profit > 0 ? "var(--up)" : "var(--down)" }}>
          {profit > 0 ? "You won" : profit < 0 ? "You lost" : "Breakeven"}
        </div>
        <div className="num" style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, margin: "4px 0", color: profit > 0 ? "var(--up)" : profit < 0 ? "var(--down)" : "var(--ink)" }}>
          {profit > 0 ? "+" : ""}${profit.toFixed(2)}
        </div>
        <div style={{ fontSize: 12, color: "var(--mut)", fontWeight: 700 }}>{profit > 0 ? "Satisfying! Keep the streak." : "Close one — next tick is yours."}</div>
      </div>
      <style>{`@keyframes win-pop { 0% { transform: translate(-50%,-44%) scale(0.85); opacity: 0; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; } }`}</style>
    </div>
  );
}
