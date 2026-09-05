"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { ArrowDown, ArrowUp, Zap, Info } from "lucide-react";
import type { MarketInfo } from "@/app/lib/markets";
import { TypewriterNumber } from "@/app/components/terminal/typewriter-number";

interface TradingTicketProps {
  asset: MarketInfo;
  amount: number;
  onAmountChange: (amt: number) => void;
  onBet: (dir: "up" | "down") => void;
  disabled?: boolean;
  activeCount: number;
  maxPositions?: number;
  betFlash: "up" | "down" | null;
}

const PRESETS = [5, 10, 25, 100];

export function TradingTicket({
  asset,
  amount,
  onAmountChange,
  onBet,
  disabled = false,
  activeCount,
  maxPositions = 8,
  betFlash,
}: TradingTicketProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; dir: "up" | "down" }[]>([]);

  // 1000x capped profit math: capped at 5x before 10% fee = 4.5x
  const maxProfit = useMemo(() => amount * 5 * 0.9, [amount]);
  const maxReturn = useMemo(() => amount + maxProfit, [amount, maxProfit]);

  const handleButtonClick = (e: MouseEvent<HTMLButtonElement>, dir: "up" | "down") => {
    if (disabled || activeCount >= maxPositions) return;

    // Create ripple at click coordinate
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { id, x, y, dir }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onBet(dir);
  };

  return (
    <div className="ticket-edge-shimmer relative rounded-2xl overflow-hidden group/ticket transition-all duration-300">
      {/* Animated Rotating Laser Edge Beam masked strictly to 1.5px border */}
      <div className="ticket-beam-mask">
        <div className="ticket-border-beam" />
      </div>

      {/* Top Specular Glint that sweeps automatically every few seconds and on hover */}
      <div className="ticket-specular-glint" />

      {/* Inner Liquid Glass Card Body */}
      <div className="terminal-card relative z-10 w-full h-full flex flex-col p-4 lg:p-4.5 space-y-3.5 rounded-[18px]">
        {/* Top Header: Title & Info */}
        <div className="flex items-center justify-between border-b border-[var(--glass-panel-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-extrabold tracking-tight text-[var(--ink)] uppercase flex items-center gap-1.5">
            10-Second Order Ticket · <span className="text-[var(--ui-tint-color)] font-mono">{asset.symbol}</span>
          </h3>
          <span className="hidden sm:inline-block rounded-full bg-[var(--glass-card-bg)] px-2 py-0.5 text-[9px] font-bold text-[var(--ink-secondary)] border border-[var(--glass-card-border)]">
            1000x Price Sensitivity · Capped Risk
          </span>
        </div>

        <span className="rounded-lg border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-2.5 py-1 text-[10px] font-mono font-bold text-[var(--ink-secondary)]">
          {activeCount}/{maxPositions} Active
        </span>
      </div>

      {/* Main Console: Left Stake & Info + Right UP/DOWN Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        {/* Left Column: Stake Input & Presets & Metrics */}
        <div className="md:col-span-7 flex flex-col gap-2.5">
          {/* Stake Input & Quick Presets */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 rounded-xl border border-[var(--glass-input-border)] bg-[var(--glass-input-bg)] px-3.5 py-2 focus-within:border-[var(--ui-tint-border)] transition-all shadow-inner">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--ink-muted)]">$</span>
              <input
                id="stake-amount"
                type="number"
                min={1}
                max={1000}
                value={amount}
                onChange={(e) => onAmountChange(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full bg-transparent pl-4 text-sm sm:text-base font-mono font-extrabold text-[var(--ink)] outline-none"
                placeholder="Stake"
              />
            </div>

            <div className="flex gap-1.5 flex-shrink-0">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAmountChange(preset)}
                  className={`rounded-xl px-2.5 py-2 font-mono text-xs font-bold transition-all ${
                    amount === preset
                      ? "bg-[var(--ink)] text-[var(--bg)] shadow-md font-extrabold"
                      : "border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-secondary)] hover:bg-[var(--glass-card-hover-bg)] hover:text-[var(--ink)]"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Return & Payout Estimation Strip */}
          <div className="rounded-xl border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] px-3 py-2 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--ink-muted)]">Max Capped Profit:</span>
              <TypewriterNumber value={maxProfit} prefix="+$" decimals={2} className="text-emerald-400 font-extrabold text-xs font-mono" />
            </div>
            <div className="h-3 w-[1px] bg-[var(--glass-card-border)]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--ink-muted)]">Potential Return:</span>
              <TypewriterNumber value={maxReturn} prefix="$" decimals={2} className="text-[var(--ink)] font-extrabold text-xs font-mono" />
            </div>
          </div>
        </div>

        {/* Right Column: Prominent UP / DOWN Trigger Buttons */}
        <div className="md:col-span-5 grid grid-cols-2 gap-2.5">
          {/* UP BUTTON */}
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, "up")}
            disabled={disabled || activeCount >= maxPositions}
            className="trigger-btn-up group h-14 sm:h-16 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm sm:text-base tracking-wide uppercase disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-lg"
          >
            {/* Energy Sweep on Action */}
            {betFlash === "up" && <span className="energy-beam-up" />}

            {/* Click Ripples */}
            {ripples
              .filter((r) => r.dir === "up")
              .map((r) => (
                <span
                  key={r.id}
                  className="btn-ripple"
                  style={{ left: r.x, top: r.y, width: 20, height: 20 }}
                />
              ))}

            <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" />
            <span className="tracking-wider">UP</span>
          </button>

          {/* DOWN BUTTON */}
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, "down")}
            disabled={disabled || activeCount >= maxPositions}
            className="trigger-btn-down group h-14 sm:h-16 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm sm:text-base tracking-wide uppercase disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-lg"
          >
            {/* Energy Sweep on Action */}
            {betFlash === "down" && <span className="energy-beam-down" />}

            {/* Click Ripples */}
            {ripples
              .filter((r) => r.dir === "down")
              .map((r) => (
                <span
                  key={r.id}
                  className="btn-ripple"
                  style={{ left: r.x, top: r.y, width: 20, height: 20 }}
                />
              ))}

            <ArrowDown className="h-5 w-5 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:scale-110" />
            <span className="tracking-wider">DOWN</span>
          </button>
        </div>
      </div>

      {activeCount >= maxPositions && (
        <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 text-center text-xs font-semibold text-amber-300">
          Max {maxPositions} active positions reached. Awaiting settlement…
        </div>
      )}
      </div>
    </div>
  );
}
