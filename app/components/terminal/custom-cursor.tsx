"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [hoverType, setHoverType] = useState<"default" | "pointer" | "up" | "down">("default");
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 28, stiffness: 320, mass: 0.5 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Only enable on desktop with fine pointer and no reduced-motion preference
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || prefersReduced) return;

    setMounted(true);

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest(".trigger-btn-up")) {
        setHoverType("up");
      } else if (target.closest(".trigger-btn-down")) {
        setHoverType("down");
      } else if (target.closest("button, a, input, [role='button'], .terminal-card-interactive, .cursor-pointer")) {
        setHoverType("pointer");
      } else {
        setHoverType("default");
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
    };
  }, [isVisible, mouseX, mouseY]);

  if (!mounted || !isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <motion.div
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: hoverType === "up" || hoverType === "down" ? 1.8 : hoverType === "pointer" ? 1.4 : 1,
          borderColor:
            hoverType === "up"
              ? "rgba(0, 240, 118, 0.9)"
              : hoverType === "down"
              ? "rgba(255, 51, 88, 0.9)"
              : hoverType === "pointer"
              ? "rgba(255, 255, 255, 0.6)"
              : "rgba(255, 255, 255, 0.25)",
          backgroundColor:
            hoverType === "up"
              ? "rgba(0, 240, 118, 0.12)"
              : hoverType === "down"
              ? "rgba(255, 51, 88, 0.12)"
              : "rgba(255, 255, 255, 0.03)",
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-6 h-6 rounded-full border border-white/30 backdrop-blur-[0.5px]"
      >
        {/* Core center dot */}
        <div
          className={`absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-150 ${
            hoverType === "up"
              ? "bg-[#00f076] shadow-[0_0_8px_#00f076]"
              : hoverType === "down"
              ? "bg-[#ff3358] shadow-[0_0_8px_#ff3358]"
              : "bg-white/70"
          }`}
        />
      </motion.div>
    </div>
  );
}
