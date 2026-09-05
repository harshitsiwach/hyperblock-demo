"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type ThemeMode = "dark" | "light";

export type ThemeTint =
  | "sky"
  | "ice"
  | "silver"
  | "graphite"
  | "violet"
  | "green"
  | "amber";

export interface TintConfig {
  id: ThemeTint;
  label: string;
  color: string;
  rgb: string;
  subtleBg: string;
  borderColor: string;
  glowColor: string;
}

export const TINT_OPTIONS: TintConfig[] = [
  {
    id: "sky",
    label: "Sky Blue",
    color: "#38bdf8",
    rgb: "56, 189, 248",
    subtleBg: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.35)",
    glowColor: "rgba(56, 189, 248, 0.2)",
  },
  {
    id: "ice",
    label: "Ice Blue",
    color: "#7dd3fc",
    rgb: "125, 211, 252",
    subtleBg: "rgba(125, 211, 252, 0.08)",
    borderColor: "rgba(125, 211, 252, 0.35)",
    glowColor: "rgba(125, 211, 252, 0.2)",
  },
  {
    id: "silver",
    label: "Silver",
    color: "#e2e8f0",
    rgb: "226, 232, 240",
    subtleBg: "rgba(226, 232, 240, 0.08)",
    borderColor: "rgba(226, 232, 240, 0.35)",
    glowColor: "rgba(226, 232, 240, 0.18)",
  },
  {
    id: "graphite",
    label: "Graphite",
    color: "#94a3b8",
    rgb: "148, 163, 184",
    subtleBg: "rgba(148, 163, 184, 0.08)",
    borderColor: "rgba(148, 163, 184, 0.35)",
    glowColor: "rgba(148, 163, 184, 0.18)",
  },
  {
    id: "violet",
    label: "Soft Violet",
    color: "#a78bfa",
    rgb: "167, 139, 250",
    subtleBg: "rgba(167, 139, 250, 0.08)",
    borderColor: "rgba(167, 139, 250, 0.35)",
    glowColor: "rgba(167, 139, 250, 0.2)",
  },
  {
    id: "green",
    label: "Soft Green",
    color: "#34d399",
    rgb: "52, 211, 153",
    subtleBg: "rgba(52, 211, 153, 0.08)",
    borderColor: "rgba(52, 211, 153, 0.35)",
    glowColor: "rgba(52, 211, 153, 0.2)",
  },
  {
    id: "amber",
    label: "Soft Amber",
    color: "#fbbf24",
    rgb: "251, 191, 36",
    subtleBg: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.35)",
    glowColor: "rgba(251, 191, 36, 0.2)",
  },
];

interface ThemeContextType {
  mode: ThemeMode;
  tint: ThemeTint;
  setMode: (mode: ThemeMode) => void;
  setTint: (tint: ThemeTint) => void;
  activeTintConfig: TintConfig;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY_MODE = "hyperblock:theme:mode";
const STORAGE_KEY_TINT = "hyperblock:theme:tint";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode | null;
        if (saved === "dark" || saved === "light") return saved;
      } catch {}
    }
    return "dark";
  });
  const [tint, setTintState] = useState<ThemeTint>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TINT) as ThemeTint | null;
        if (saved && TINT_OPTIONS.some((t) => t.id === saved)) return saved;
      } catch {}
    }
    return "sky";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, newMode);
    } catch {}
  };

  const setTint = (newTint: ThemeTint) => {
    setTintState(newTint);
    try {
      localStorage.setItem(STORAGE_KEY_TINT, newTint);
    } catch {}
  };

  const activeTintConfig = useMemo(
    () => TINT_OPTIONS.find((t) => t.id === tint) ?? TINT_OPTIONS[0],
    [tint]
  );

  // Sync with document element
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.setAttribute("data-tint", tint);

    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }

    // Dynamic accent CSS variables
    root.style.setProperty("--ui-tint-color", activeTintConfig.color);
    root.style.setProperty("--ui-tint-rgb", activeTintConfig.rgb);
    root.style.setProperty("--ui-tint-bg", activeTintConfig.subtleBg);
    root.style.setProperty("--ui-tint-border", activeTintConfig.borderColor);
    root.style.setProperty("--ui-tint-glow", activeTintConfig.glowColor);

    // Visibly rich atmospheric background tint that reflects the selected theme color
    const isDark = mode === "dark";
    root.style.setProperty("--ui-tint-ambient-high", `rgba(${activeTintConfig.rgb}, ${isDark ? 0.18 : 0.16})`);
    root.style.setProperty("--ui-tint-ambient-mid", `rgba(${activeTintConfig.rgb}, ${isDark ? 0.12 : 0.11})`);
    root.style.setProperty("--ui-tint-ambient-low", `rgba(${activeTintConfig.rgb}, ${isDark ? 0.07 : 0.06})`);
    root.style.setProperty("--ui-tint-ambient-wash", `rgba(${activeTintConfig.rgb}, ${isDark ? 0.05 : 0.04})`);
    root.style.setProperty("--ui-tint-ambient", `rgba(${activeTintConfig.rgb}, ${isDark ? 0.14 : 0.12})`);
  }, [mode, tint, activeTintConfig]);

  const value = useMemo(
    () => ({
      mode,
      tint,
      setMode,
      setTint,
      activeTintConfig,
    }),
    [mode, tint, activeTintConfig]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className={mounted ? "" : "opacity-0"}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
