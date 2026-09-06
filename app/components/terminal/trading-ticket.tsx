"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Zap } from "lucide-react";
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
  /** Reserved: flash direction on bet (currently no visual effect; kept for API compat). */
  betFlash?: "up" | "down" | null;
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
}: TradingTicketProps) {
  // 1000x capped profit math: capped at 5x before 10% fee = 4.5x
  const maxProfit = useMemo(() => amount * 5 * 0.9, [amount]);
  const maxReturn = useMemo(() => amount + maxProfit, [amount, maxProfit]);

  const handleButtonClick = (dir: "up" | "down") => {
    if (disabled || activeCount >= maxPositions) return;
    onBet(dir);
  };

  return (
    <div className="relative rounded-lg border border-[var(--hair)] bg-[var(--card)] transition-colors flex-shrink-0 w-full shadow-sm">
      {/* Inner Flat Card Body */}
      <div className="relative z-10 w-full flex flex-col p-3.5 space-y-3 rounded-lg">
        {/* Top Header: Title & Info */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--hair)] pb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="h-4 w-4 text-[var(--color-neon-orange)] flex-shrink-0" />
            <h3 className="text-xs sm:text-sm font-extrabold tracking-tight text-[var(--ink)] uppercase truncate flex items-center gap-1">
              Order Ticket · <span className="text-[var(--color-neon-orange)] font-mono">{asset.symbol}</span>
            </h3>
            <span className="hidden xl:inline-block rounded-full bg-[var(--card)] px-2 py-0.5 text-[9px] font-bold text-[var(--ink-secondary)] border border-[var(--hair)] flex-shrink-0">
              1000x · Capped
            </span>
          </div>

          <span className="rounded-md border border-[var(--hair)] bg-[var(--card)] px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--ink-secondary)] flex-shrink-0">
            {activeCount}/{maxPositions} Active
          </span>
        </div>

        {/* Main Console: stacked — stake, metrics, then UP/DOWN triggers */}
        <div className="flex flex-col gap-2.5">
          {/* Stake Input & Presets */}
          <div className="flex flex-col gap-2">
            <div className="relative rounded-lg border border-[var(--hair)] bg-[var(--card)] px-3.5 py-2 focus-within:border-[var(--color-neon-orange)] transition-colors">
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

            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAmountChange(preset)}
                  className={`rounded-lg px-2 py-1.5 font-mono text-xs font-bold transition-all ${
                    amount === preset
                      ? "bg-[var(--color-neon-orange-soft)] border border-[var(--color-neon-orange)] text-[var(--color-neon-orange)] font-extrabold"
                      : "border border-[var(--hair)] bg-[var(--card)] text-[var(--ink-secondary)] hover:border-[var(--color-neon-orange)] hover:text-[var(--color-neon-orange)]"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Return & Payout Estimation Strip */}
          <div className="rounded-lg border border-[var(--hair)] bg-[var(--card)] px-3 py-2 text-xs flex items-center justify-between gap-x-2 gap-y-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--ink-muted)]">Max Capped Profit:</span>
              <TypewriterNumber value={maxProfit} prefix="+$" decimals={2} className="text-[var(--up)] font-extrabold text-xs font-mono" />
            </div>
            <div className="h-3 w-[1px] bg-[var(--hair)]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--ink-muted)]">Potential Return:</span>
              <TypewriterNumber value={maxReturn} prefix="$" decimals={2} className="text-[var(--ink)] font-extrabold text-xs font-mono" />
            </div>
          </div>

          {/* Prominent UP / DOWN Trigger Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            {/* UP BUTTON */}
            <button
              type="button"
              onClick={() => handleButtonClick("up")}
              disabled={disabled || activeCount >= maxPositions}
              className="trigger-btn-up group h-12 rounded-lg flex items-center justify-center gap-2 font-extrabold text-sm tracking-wide uppercase disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-all border border-[var(--hair)] hover:border-[var(--up)]"
            >
              <ArrowUp className="h-5 w-5 text-[var(--up)] group-hover:scale-110 transition-transform" />
              <span className="tracking-wider text-[var(--up)] font-black">UP</span>
            </button>

            {/* DOWN BUTTON */}
            <button
              type="button"
              onClick={() => handleButtonClick("down")}
              disabled={disabled || activeCount >= maxPositions}
              className="trigger-btn-down group h-12 rounded-lg flex items-center justify-center gap-2 font-extrabold text-sm tracking-wide uppercase disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-all border border-[var(--hair)] hover:border-[var(--down)]"
            >
              <ArrowDown className="h-5 w-5 text-[var(--down)] group-hover:scale-110 transition-transform" />
              <span className="tracking-wider text-[var(--down)] font-black">DOWN</span>
            </button>
          </div>
        </div>

        {activeCount >= maxPositions && (
          <div className="rounded-lg bg-[var(--wait-tint)] border border-[var(--wait)] px-3 py-1.5 text-center text-xs font-semibold text-[var(--wait)]">
            Max {maxPositions} active positions reached. Awaiting settlement…
          </div>
        )}
      </div>
    </div>
  );
}
