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

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
    <div className="terminal-card flex flex-col p-4 lg:p-5 bg-[#121620] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div>
          <h3 className="text-sm font-extrabold tracking-tight text-white uppercase flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-[#00f076]" />
            10-Second Order Ticket
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            1000x Price Sensitivity · Capped Risk
          </span>
        </div>

        <span className="rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
          {activeCount}/{maxPositions} Active
        </span>
      </div>

      {/* Stake Amount Selector */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <label htmlFor="stake-amount" className="font-bold text-slate-300 uppercase text-[11px] tracking-wider">
            Ticket Stake (USD)
          </label>
          <span className="text-[11px] font-mono text-slate-400">Min $1 · Max $1,000</span>
        </div>

        {/* Input & Quick Presets */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 rounded-xl border border-white/[0.12] bg-[#0b0d12] px-3.5 py-2.5 focus-within:border-[#00f076] transition-colors">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
            <input
              id="stake-amount"
              type="number"
              min={1}
              max={1000}
              value={amount}
              onChange={(e) => onAmountChange(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full bg-transparent pl-4 text-base font-mono font-extrabold text-white outline-none"
            />
          </div>

          <div className="flex gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAmountChange(preset)}
                className={`rounded-xl px-2.5 py-2 font-mono text-xs font-bold transition-all ${
                  amount === preset
                    ? "bg-white text-[#0b0d12] shadow-sm font-extrabold"
                    : "border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Return & Payout Estimation Box */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0b0d12]/70 p-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Max Capped Profit:</span>
          <TypewriterNumber value={maxProfit} prefix="+$" decimals={2} className="text-[#00f076] font-extrabold text-xs" />
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Potential Return:</span>
          <TypewriterNumber value={maxReturn} prefix="$" decimals={2} className="text-white font-extrabold text-xs" />
        </div>
        <div className="pt-1 border-t border-white/[0.06] text-[10px] text-slate-400 flex items-center gap-1">
          <Info className="h-3 w-3 flex-shrink-0" />
          <span>Settles in 10s via Hyperliquid price movement · 10% fee on net profits</span>
        </div>
      </div>

      {/* Primary UP / DOWN Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* UP BUTTON */}
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, "up")}
          disabled={disabled || activeCount >= maxPositions}
          className="trigger-btn-up group h-14 rounded-xl flex items-center justify-center gap-2.5 font-extrabold text-base tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed"
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

          <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-1" />
          <span>UP</span>
        </button>

        {/* DOWN BUTTON */}
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, "down")}
          disabled={disabled || activeCount >= maxPositions}
          className="trigger-btn-down group h-14 rounded-xl flex items-center justify-center gap-2.5 font-extrabold text-base tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed"
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

          <ArrowDown className="h-5 w-5 transition-transform duration-200 group-hover:translate-y-1" />
          <span>DOWN</span>
        </button>
      </div>

      {activeCount >= maxPositions && (
        <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-center text-xs font-semibold text-amber-300">
          Max {maxPositions} active positions reached. Awaiting settlement…
        </div>
      )}
    </div>
  );
}
