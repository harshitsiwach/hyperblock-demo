"use client";

import { motion } from "motion/react";
import { Activity, Coins, Layers, Zap } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";

interface MobileDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAssetSheet: () => void;
  onOpenTradeSheet?: () => void;
  activeCount: number;
}

export function MobileDock({
  activeTab,
  onTabChange,
  onOpenAssetSheet,
  activeCount,
}: MobileDockProps) {
  const { mode } = useTheme();

  const tabs = [
    { id: "trade", label: "Trade", icon: Zap, action: () => onTabChange("trade") },
    { id: "asset", label: "Asset", icon: Coins, action: onOpenAssetSheet },
    { id: "positions", label: "Orders", icon: Layers, action: () => onTabChange("positions"), badge: activeCount },
    { id: "activity", label: "Activity", icon: Activity, action: () => onTabChange("activity") },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-[var(--hair)] bg-[var(--card)]/95 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
      {/* 4-Item Liquid Water Sliding Segmented Dock (exact aesthetic to Demo & Leaderboard tabs) */}
      <nav
        className="flex h-14 items-center justify-around px-3 py-1.5"
        aria-label="Mobile Bottom Navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={tab.action}
              type="button"
              className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-bold select-none focus:outline-none transition-colors cursor-pointer"
            >
              {isActive && (
                <motion.div
                  layoutId="active-mobile-dock-pill"
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.6,
                  }}
                >
                  {/* Masked Border Beam strictly on 1.5px border track */}
                  <div className="border-beam-ring rounded-xl">
                    <span className="rotating-glow-border" />
                  </div>

                  {/* Solid inner background */}
                  <span
                    className="absolute inset-0 rounded-xl border border-[var(--color-neon-orange)]/40 -z-10 shadow-[0_0_14px_rgba(255,95,31,0.25)]"
                    style={{ backgroundColor: mode === "dark" ? "#0c0f17" : "#ffffff" }}
                  />
                </motion.div>
              )}

              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="relative">
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors duration-200 ${
                      isActive
                        ? mode === "dark"
                          ? "text-white"
                          : "text-[var(--color-neon-orange)]"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    }`}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-neon-orange)] text-[8.5px] font-black text-white shadow-[0_0_8px_rgba(255,95,31,0.8)]">
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-wide transition-colors duration-200 ${
                    isActive
                      ? mode === "dark"
                        ? "text-white font-black"
                        : "text-[var(--color-neon-orange)] font-black"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] font-semibold"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
