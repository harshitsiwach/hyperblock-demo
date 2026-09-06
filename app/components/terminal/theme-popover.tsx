"use client";

import { motion } from "motion/react";
import { Sun, Moon, X } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";

interface ThemePopoverProps {
  onClose: () => void;
}

export function ThemePopover({ onClose }: ThemePopoverProps) {
  const { mode, setMode, activeTintConfig } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-11 z-50 w-84 sm:w-96 rounded-lg p-4 border border-[var(--hair)] bg-[var(--card)] text-[var(--ink)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-lg"
            style={{ backgroundColor: activeTintConfig.subtleBg }}
          >
            <span
              className="block h-3 w-3 rounded-sm"
              style={{ backgroundColor: activeTintConfig.color }}
            />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink)]">
              Appearance
            </h4>
            <span className="text-[10px] text-[var(--ink-muted)] font-medium">Light / dark · neon-orange accent</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-card-hover-bg)] transition-colors"
          aria-label="Close theme settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3.5 space-y-4">
        {/* Section A: Appearance (Dark / Light) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-secondary)]">
              Appearance
            </span>
            <span className="text-[10px] font-mono text-[var(--ink-muted)] capitalize">
              {mode} Mode
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[var(--card)] border border-[var(--hair)]">
            <button
              type="button"
              onClick={() => setMode("dark")}
              className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                mode === "dark"
                  ? "bg-[var(--color-neon-orange)] text-white font-extrabold"
                  : "text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)]"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
              {mode === "dark" && (
                <span
                  className="h-1.5 w-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: "#fff" }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode("light")}
              className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                mode === "light"
                  ? "bg-[var(--color-neon-orange)] text-white font-extrabold"
                  : "text-[var(--ink-muted)] hover:text-[var(--color-neon-orange)]"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
              {mode === "light" && (
                <span
                  className="h-1.5 w-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: "#fff" }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Section B: Brand accent (fixed) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-secondary)]">
              Brand accent
            </span>
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
              style={{
                color: activeTintConfig.color,
                borderColor: activeTintConfig.borderColor,
                backgroundColor: activeTintConfig.subtleBg,
              }}
            >
              Neon Orange
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--ink-muted)]">
            Orange is rationed to the logo, primary actions, and selected states. Market direction
            keeps its own green/red semantics.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
