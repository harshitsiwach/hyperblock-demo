"use client";

import { useRouter, usePathname } from "next/navigation";

export function ModeToggle({ mode }: { mode: "demo" | "real" }) {
  const router = useRouter();
  const pathname = usePathname();

  const flip = () => {
    if (mode === "demo") {
      router.push("/real");
    } else {
      router.push("/");
    }
  };

  return (
    <button
      onClick={flip}
      aria-label={`Switch to ${mode === "demo" ? "real" : "demo"} mode`}
      title={mode === "demo" ? "Switch to REAL — mainnet Hyperliquid prices, graph driven from WS, isolated from demo" : "Switch to DEMO — investor showcase (testnet, untouched)"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 999,
        border: "1px solid var(--hair)",
        background: "var(--card)",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid var(--hair)",
          background: "var(--bg)",
        }}
      >
        <span
          style={{
            padding: "5px 10px",
            background: mode === "demo" ? "var(--ink)" : "transparent",
            color: mode === "demo" ? "var(--bg)" : "var(--mut)",
            transition: "all 150ms",
          }}
        >
          Demo
        </span>
        <span
          style={{
            padding: "5px 10px",
            background: mode === "real" ? "var(--ink)" : "transparent",
            color: mode === "real" ? "var(--bg)" : "var(--mut)",
            transition: "all 150ms",
          }}
        >
          Real
        </span>
      </span>
      <span style={{ color: "var(--mut)", fontSize: 10, marginRight: 2 }}>{mode === "demo" ? "→ Real" : "→ Demo"}</span>
    </button>
  );
}
