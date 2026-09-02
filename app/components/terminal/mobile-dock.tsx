"use client";

import { Activity, BarChart2, Compass, Home, Layers, User, Zap } from "lucide-react";

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
    <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-white/[0.08] bg-[#0b0d12]/95 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Trade Tab */}
        <button
          onClick={() => onTabChange("trade")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "trade" ? "text-[#00f076]" : "text-slate-400"
          }`}
        >
          <Zap className="h-5 w-5" />
          <span>Trade</span>
        </button>

        {/* Markets / Asset Browser Trigger */}
        <button
          onClick={onOpenAssetSheet}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 active:text-[#00f076]"
        >
          <Compass className="h-5 w-5" />
          <span>Markets</span>
        </button>

        {/* Center Quick Ticket Trigger Button */}
        <button
          onClick={onOpenTradeSheet}
          className="relative -top-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#00f076] text-[#090a0f] shadow-[0_0_20px_rgba(0,240,118,0.4)] active:scale-95 transition-transform"
          aria-label="Open Trading Ticket"
        >
          <Zap className="h-6 w-6 fill-current" />
        </button>

        {/* Positions Tab */}
        <button
          onClick={() => onTabChange("positions")}
          className={`relative flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "positions" ? "text-[#00f076]" : "text-slate-400"
          }`}
        >
          <Layers className="h-5 w-5" />
          <span>Orders</span>
          {activeCount > 0 && (
            <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#00f076] text-[9px] font-extrabold text-[#090a0f]">
              {activeCount}
            </span>
          )}
        </button>

        {/* Activity Tab */}
        <button
          onClick={() => onTabChange("activity")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "activity" ? "text-[#00f076]" : "text-slate-400"
          }`}
        >
          <Activity className="h-5 w-5" />
          <span>Activity</span>
        </button>
      </div>
    </div>
  );
}
