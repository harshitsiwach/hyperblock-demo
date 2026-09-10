"use client";

import { Activity, Compass, Layers, Zap } from "lucide-react";

interface MobileDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAssetSheet: () => void;
  onOpenTradeSheet: () => void;
  activeCount: number;
}

export function MobileDock({
  activeTab,
  onTabChange,
  onOpenAssetSheet,
  onOpenTradeSheet,
  activeCount,
}: MobileDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-[var(--hair)] bg-[var(--card)]/95 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex h-15 items-center justify-around px-2">
        {/* Trade Tab */}
        <button
          onClick={() => onTabChange("trade")}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold py-1 px-3 rounded-lg transition-colors ${
            activeTab === "trade"
              ? "text-[var(--color-neon-orange)] bg-[var(--color-neon-orange-soft)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Zap className="h-4.5 w-4.5" />
          <span>Trade</span>
        </button>

        {/* Markets / Asset Browser Trigger */}
        <button
          onClick={onOpenAssetSheet}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold py-1 px-3 rounded-lg text-[var(--ink-muted)] active:text-[var(--color-neon-orange)] active:bg-[var(--panel)] transition-colors"
        >
          <Compass className="h-4.5 w-4.5" />
          <span>Markets</span>
        </button>

        {/* Center Quick Ticket Trigger Button */}
        <button
          onClick={onOpenTradeSheet}
          className="relative -top-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-neon-orange)] text-white shadow-[0_4px_18px_rgba(255,95,31,0.5)] active:scale-90 transition-transform cursor-pointer"
          aria-label="Open Trading Ticket"
        >
          <Zap className="h-6 w-6 fill-current" />
        </button>

        {/* Positions Tab */}
        <button
          onClick={() => onTabChange("positions")}
          className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-bold py-1 px-3 rounded-lg transition-colors ${
            activeTab === "positions"
              ? "text-[var(--color-neon-orange)] bg-[var(--color-neon-orange-soft)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Layers className="h-4.5 w-4.5" />
          <span>Orders</span>
          {activeCount > 0 && (
            <span className="absolute -top-0.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,95,31,0.8)]">
              {activeCount}
            </span>
          )}
        </button>

        {/* Activity Tab */}
        <button
          onClick={() => onTabChange("activity")}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold py-1 px-3 rounded-lg transition-colors ${
            activeTab === "activity"
              ? "text-[var(--color-neon-orange)] bg-[var(--color-neon-orange-soft)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Activity className="h-4.5 w-4.5" />
          <span>Activity</span>
        </button>
      </div>
    </div>
  );
}
