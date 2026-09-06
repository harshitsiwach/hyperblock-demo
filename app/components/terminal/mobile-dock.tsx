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
    <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-[var(--hair)] bg-[var(--card)]">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Trade Tab */}
        <button
          onClick={() => onTabChange("trade")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "trade" ? "text-[var(--color-neon-orange)]" : "text-[var(--ink-muted)]"
          }`}
        >
          <Zap className="h-5 w-5" />
          <span>Trade</span>
        </button>

        {/* Markets / Asset Browser Trigger */}
        <button
          onClick={onOpenAssetSheet}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-[var(--ink-muted)] active:text-[var(--color-neon-orange)]"
        >
          <Compass className="h-5 w-5" />
          <span>Markets</span>
        </button>

        {/* Center Quick Ticket Trigger Button */}
        <button
          onClick={onOpenTradeSheet}
          className="relative -top-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-neon-orange)] text-white active:scale-95 transition-transform"
          aria-label="Open Trading Ticket"
        >
          <Zap className="h-6 w-6 fill-current" />
        </button>

        {/* Positions Tab */}
        <button
          onClick={() => onTabChange("positions")}
          className={`relative flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "positions" ? "text-[var(--color-neon-orange)]" : "text-[var(--ink-muted)]"
          }`}
        >
          <Layers className="h-5 w-5" />
          <span>Orders</span>
          {activeCount > 0 && (
            <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-[9px] font-extrabold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* Activity Tab */}
        <button
          onClick={() => onTabChange("activity")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "activity" ? "text-[var(--color-neon-orange)]" : "text-[var(--ink-muted)]"
          }`}
        >
          <Activity className="h-5 w-5" />
          <span>Activity</span>
        </button>
      </div>
    </div>
  );
}
