"use client";

import { motion } from "motion/react";
import { Sun, Moon, Check, Sparkles, X } from "lucide-react";
import { useTheme, TINT_OPTIONS } from "@/app/providers/theme-provider";

interface ThemePopoverProps {
  onClose: () => void;
}

export function ThemePopover({ onClose }: ThemePopoverProps) {
  const { mode, tint, setMode, setTint, activeTintConfig } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-11 z-50 w-84 sm:w-96 rounded-2xl glass-panel-elevated p-4 shadow-2xl border border-[var(--glass-panel-border)] text-[var(--ink)]"
      style={{
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-panel-border-subtle)]">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-lg"
            style={{ backgroundColor: activeTintConfig.subtleBg }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: activeTintConfig.color }} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink)]">
              Terminal Appearance
            </h4>
            <span className="text-[10px] text-[var(--ink-muted)] font-medium">Liquid Glass & Accent Tints</span>
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

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--glass-input-bg)] border border-[var(--glass-card-border)]">
            <button
              type="button"
              onClick={() => setMode("dark")}
              className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                mode === "dark"
                  ? "bg-[var(--ink)] text-[var(--bg)] shadow-md font-extrabold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-card-hover-bg)]"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark Glass</span>
              {mode === "dark" && (
                <span
                  className="h-1.5 w-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: activeTintConfig.color }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode("light")}
              className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                mode === "light"
                  ? "bg-[var(--ink)] text-[var(--bg)] shadow-md font-extrabold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-card-hover-bg)]"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light Glass</span>
              {mode === "light" && (
                <span
                  className="h-1.5 w-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: activeTintConfig.color }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Section B: UI Tint */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-secondary)]">
              UI Tint
            </span>
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
              style={{
                color: activeTintConfig.color,
                borderColor: activeTintConfig.borderColor,
                backgroundColor: activeTintConfig.subtleBg,
              }}
            >
              {activeTintConfig.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {TINT_OPTIONS.map((t) => {
              const isSelected = tint === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTint(t.id)}
                  className={`group relative flex items-center gap-2 rounded-xl p-2 text-left border transition-all ${
                    isSelected
                      ? "bg-[var(--glass-card-hover-bg)] shadow-sm"
                      : "bg-[var(--glass-card-bg)] border-[var(--glass-card-border)] hover:bg-[var(--glass-card-hover-bg)] hover:border-[var(--glass-card-hover-border)]"
                  }`}
                  style={{
                    borderColor: isSelected ? t.borderColor : undefined,
                    boxShadow: isSelected ? `0 0 12px ${t.glowColor}` : undefined,
                  }}
                >
                  {/* Swatch Dot */}
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full border shadow-inner flex-shrink-0"
                    style={{
                      backgroundColor: t.color,
                      borderColor: "rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-black stroke-[3]" />}
                  </span>

                  <span
                    className={`text-[11px] font-semibold truncate ${
                      isSelected ? "text-[var(--ink)] font-bold" : "text-[var(--ink-secondary)] group-hover:text-[var(--ink)]"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section C: Live Mini Preview */}
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Material Live Preview
          </span>

          <div
            className="rounded-xl border p-3 transition-all relative overflow-hidden"
            style={{
              backgroundColor: mode === "dark" ? "rgba(18, 24, 38, 0.7)" : "rgba(255, 255, 255, 0.85)",
              borderColor: activeTintConfig.borderColor,
              boxShadow: `0 4px 20px -2px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`,
            }}
          >
            {/* Top specular reflection */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activeTintConfig.color }}
                />
                <span className="text-xs font-mono font-bold text-[var(--ink)]">
                  BTC / USD
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                +1.84% Live
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-mono font-extrabold text-[var(--ink)]">
                $94,280.50
              </span>
              <div className="flex gap-1.5">
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-secondary)]">
                  UP
                </span>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] text-[var(--ink-secondary)]">
                  DOWN
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
