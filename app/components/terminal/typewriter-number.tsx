"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TypewriterNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  flashOnChange?: boolean;
}

function formatVal(val: number, decimals: number): string {
  if (val < 1 && decimals < 3) decimals = 4;
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function TypewriterNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  className = "",
  flashOnChange = true,
}: TypewriterNumberProps) {
  const formatted = formatVal(value, decimals);
  const [prevVal, setPrevVal] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [typedChars, setTypedChars] = useState<string[]>(formatted.split(""));
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== prevVal) {
      const dir = value > prevVal ? "up" : "down";
      setDirection(dir);
      setPrevVal(value);
      setIsTyping(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setDirection(null);
        setIsTyping(false);
      }, 500);
    }
    setTypedChars(formatted.split(""));
  }, [value, prevVal, formatted]);

  return (
    <span
      className={`inline-flex items-baseline font-mono select-none tracking-tight ${className} ${
        direction === "up"
          ? "text-[#00f076] drop-shadow-[0_0_8px_rgba(0,240,118,0.5)]"
          : direction === "down"
          ? "text-[#ff3358] drop-shadow-[0_0_8px_rgba(255,51,88,0.5)]"
          : ""
      } transition-colors duration-200`}
    >
      {prefix && <span className="mr-0.5 opacity-80">{prefix}</span>}

      {/* Digit columns with rolling / typewriter transitions */}
      <span className="inline-flex items-center">
        {typedChars.map((char, idx) => {
          const isNum = /\d/.test(char);
          return (
            <span
              key={`${idx}-${char}`}
              className="relative inline-block overflow-hidden h-[1.15em] leading-[1.15em] text-center"
              style={{ width: isNum ? "0.62em" : char === "," ? "0.28em" : char === "." ? "0.3em" : "0.5em" }}
            >
              <motion.span
                initial={flashOnChange && isTyping ? { y: direction === "up" ? "-60%" : "60%", opacity: 0 } : false}
                animate={{ y: "0%", opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 28,
                  delay: (typedChars.length - 1 - idx) * 0.015, // typewriter cascade from right to left
                }}
                className="inline-block w-full"
              >
                {char}
              </motion.span>
            </span>
          );
        })}
      </span>

      {suffix && <span className="ml-1 opacity-80">{suffix}</span>}
    </span>
  );
}
