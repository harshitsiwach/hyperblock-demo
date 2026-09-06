"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type ThemeMode = "dark" | "light";

export type ThemeTint = "orange";

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
    id: "orange",
    label: "Neon Orange",
    color: "#FF5F1F",
    rgb: "255, 95, 31",
    subtleBg: "#FFF0EA",
    borderColor: "rgba(255, 95, 31, 0.45)",
    glowColor: "rgba(255, 95, 31, 0.18)",
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
    return "light";
  });
  const [tint, setTintState] = useState<ThemeTint>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TINT);
        if (saved === "orange") return "orange";
      } catch {}
    }
    return "orange";
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

    // Dynamic accent CSS variables (single neon-orange brand accent)
    root.style.setProperty("--ui-tint-color", activeTintConfig.color);
    root.style.setProperty("--ui-tint-rgb", activeTintConfig.rgb);
    root.style.setProperty("--ui-tint-bg", activeTintConfig.subtleBg);
    root.style.setProperty("--ui-tint-border", activeTintConfig.borderColor);
    root.style.setProperty("--ui-tint-glow", activeTintConfig.glowColor);

    // Flat system: no atmospheric background washes.
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
