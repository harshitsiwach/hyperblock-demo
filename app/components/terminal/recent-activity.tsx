"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, ArrowUpRight, CheckCircle, Clock, Radio, Zap } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: "system" | "trade" | "settlement" | "switch";
  title: string;
  subtitle: string;
  timestamp: number;
  highlight?: "green" | "red" | "neutral";
}

interface RecentActivityProps {
  items: ActivityItem[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="terminal-card flex flex-col p-4 lg:p-5 bg-[#121620] h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[#00f076]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Recent Terminal Stream
          </h3>
        </div>
        <span className="live-pulse-dot" />
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {items.slice(0, 10).map((item, index) => {
            const isFresh = index === 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: isFresh ? 1 : 0.75, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex items-start gap-2.5 rounded-lg border p-2 text-xs transition-colors ${
                  isFresh
                    ? "border-white/[0.12] bg-white/[0.04]"
                    : "border-white/[0.04] bg-white/[0.01]"
                }`}
              >
                {/* Indicator dot */}
                <div className="mt-1 flex-shrink-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      item.highlight === "green"
                        ? "bg-[#00f076] shadow-[0_0_6px_#00f076]"
                        : item.highlight === "red"
                        ? "bg-[#ff3358] shadow-[0_0_6px_#ff3358]"
                        : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span
                      className={`font-semibold truncate ${
                        item.highlight === "green"
                          ? "text-[#00f076]"
                          : item.highlight === "red"
                          ? "text-[#ff3358]"
                          : "text-slate-200"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
