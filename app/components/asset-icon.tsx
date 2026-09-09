"use client";

import React, { useEffect, useState } from "react";
import type { AssetCategory } from "@/app/lib/markets";
import {
  TokenBTC,
  TokenETH,
  TokenSOL,
  TokenAVAX,
  TokenDOGE,
  TokenARB,
  TokenAAVE,
} from "@web3icons/react";

// Official brand SVGs from thesvg for stocks
import apple from "thesvg/apple";
import nvidia from "thesvg/nvidia";
import tesla from "thesvg/tesla";
import coinbase from "thesvg/coinbase";
import microsoft from "thesvg/microsoft";
import google from "thesvg/google";
import amazon from "thesvg/amazon";
import meta from "thesvg/meta";
import amd from "thesvg/amd";
import intel from "thesvg/intel";
import netflix from "thesvg/netflix";
import oracle from "thesvg/oracle";
import palantir from "thesvg/palantir";
import qualcomm from "thesvg/qualcomm";
import reddit from "thesvg/reddit";
import samsung from "thesvg/samsung";
import ibm from "thesvg/ibm";
import dell from "thesvg/dell";
import ebay from "thesvg/ebay";
import cloudflare from "thesvg/cloudflare";
import robinhood from "thesvg/robinhood";
import zoom from "thesvg/zoom";
import alibaba from "thesvg/alibaba";
import blackberry from "thesvg/blackberry";
import crowdstrike from "thesvg/crowdstrike";
import arm from "thesvg/arm";
import broadcom from "thesvg/broadcom";
import micron from "thesvg/micron";
import nokia from "thesvg/nokia";
import rivian from "thesvg/rivian";
import hyundai from "thesvg/hyundai";
import costco from "thesvg/costco";
import microstrategy from "thesvg/microstrategy";
import sandisk from "thesvg/sandisk";
import generalElectric from "thesvg/general-electric";
import spotify from "thesvg/spotify";
import uber from "thesvg/uber";
import boeing from "thesvg/boeing";
import disney from "thesvg/disney";
import ford from "thesvg/ford";
import nike from "thesvg/nike";
import starbucks from "thesvg/starbucks";
import walmart from "thesvg/walmart";
import visa from "thesvg/visa";
import mastercard from "thesvg/mastercard";
import paypal from "thesvg/paypal";
import square from "thesvg/square";
import airbnb from "thesvg/airbnb";
import snapchat from "thesvg/snapchat";
import sony from "thesvg/sony";
import toyota from "thesvg/toyota";
import honda from "thesvg/honda";
import cisco from "thesvg/cisco";
import adobe from "thesvg/adobe";

const STOCK_SVG_MAP: Record<string, { svg: string; hex?: string }> = {
  AAPL: apple,
  NVDA: nvidia,
  TSLA: tesla,
  COIN: coinbase,
  MSFT: microsoft,
  GOOGL: google,
  AMZN: amazon,
  META: meta,
  AMD: amd,
  INTC: intel,
  NFLX: netflix,
  ORCL: oracle,
  PLTR: palantir,
  QCOM: qualcomm,
  RDDT: reddit,
  SMSN: samsung,
  IBM: ibm,
  DELL: dell,
  EBAY: ebay,
  NET: cloudflare,
  HOOD: robinhood,
  ZM: zoom,
  BABA: alibaba,
  BB: blackberry,
  CRWD: crowdstrike,
  ARM: arm,
  AVGO: broadcom,
  MU: micron,
  NOK: nokia,
  RIVN: rivian,
  HYUNDAI: hyundai,
  COST: costco,
  MSTR: microstrategy,
  SNDK: sandisk,
  GEV: generalElectric,
  SPOT: spotify,
  UBER: uber,
  BA: boeing,
  DIS: disney,
  F: ford,
  NKE: nike,
  SBUX: starbucks,
  WMT: walmart,
  V: visa,
  MA: mastercard,
  PYPL: paypal,
  SQ: square,
  ABNB: airbnb,
  SNAP: snapchat,
  SONY: sony,
  TM: toyota,
  HMC: honda,
  CSCO: cisco,
  ADBE: adobe,
};

function sanitizeSvgForDisplay(svgStr: string): string {
  // Replace fixed width/height with 100% so it fits any container size cleanly
  return svgStr
    .replace(/\bwidth="[^"]*"/i, 'width="100%"')
    .replace(/\bheight="[^"]*"/i, 'height="100%"');
}

export function AssetIcon({
  symbol,
  category = "crypto",
  size = 36,
  className = "",
}: {
  symbol: string;
  category?: AssetCategory;
  size?: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sym = symbol.toUpperCase();

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl font-mono font-extrabold flex-shrink-0 relative overflow-hidden select-none bg-[#141824] text-white/80 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.32 }}
      >
        <span>{sym.slice(0, 3)}</span>
      </div>
    );
  }

  // ==========================================
  // 1. CRYPTO ICONS
  // ==========================================
  if (sym === "BTC") {
    return <TokenBTC size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "ETH") {
    return <TokenETH size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "SOL") {
    return <TokenSOL size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "AVAX") {
    return <TokenAVAX size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "DOGE") {
    return <TokenDOGE size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "ARB") {
    return <TokenARB size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "AAVE") {
    return <TokenAAVE size={size} variant="branded" className={`rounded-full flex-shrink-0 ${className}`} />;
  }
  if (sym === "HYPE") {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #061e12 0%, #00f076 100%)",
          border: "1px solid rgba(0, 240, 118, 0.4)",
        }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none">
          <path
            d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
            fill="#00f076"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 12L12 9L16 12L12 15L8 12Z" fill="#0b0d12" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // 2. COMMODITIES (Actual Visual Vector Logos)
  // ==========================================
  if (sym === "GOLD") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="gold-grad-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="gold-grad-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#1e1808" />
          <path d="M7 16L11 23H21L25 16H7Z" fill="url(#gold-grad-1)" />
          <path d="M11 9H21L25 16H7L11 9Z" fill="url(#gold-grad-top)" />
          <path d="M7 16L11 9V16H7Z" fill="#d97706" opacity="0.6" />
          <text x="16" y="14.5" textAnchor="middle" fill="#78350f" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">AU</text>
          <text x="16" y="19.5" textAnchor="middle" fill="#78350f" fontSize="3.5" fontWeight="800" fontFamily="sans-serif">999.9</text>
        </svg>
      </div>
    );
  }

  if (sym === "SILVER") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="silver-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="silver-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#111827" />
          <path d="M7 16L11 23H21L25 16H7Z" fill="url(#silver-grad)" />
          <path d="M11 9H21L25 16H7L11 9Z" fill="url(#silver-top)" />
          <text x="16" y="14.5" textAnchor="middle" fill="#334155" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">AG</text>
          <text x="16" y="19.5" textAnchor="middle" fill="#334155" fontSize="3.5" fontWeight="800" fontFamily="sans-serif">999.9</text>
        </svg>
      </div>
    );
  }

  if (sym === "BRENTOIL" || sym === "CL") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="oil-barrel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="50%" stopColor="#52525b" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>
            <linearGradient id="oil-drop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#09090b" />
          <rect x="9" y="8" width="14" height="16" rx="2" fill="url(#oil-barrel)" stroke="#71717a" strokeWidth="1" />
          <line x1="9" y1="12" x2="23" y2="12" stroke="#a1a1aa" strokeWidth="0.8" />
          <line x1="9" y1="16" x2="23" y2="16" stroke="#a1a1aa" strokeWidth="0.8" />
          <line x1="9" y1="20" x2="23" y2="20" stroke="#a1a1aa" strokeWidth="0.8" />
          <path d="M16 11C16 11 13 15 13 17C13 18.6569 14.3431 20 16 20C17.6569 20 19 18.6569 19 17C19 15 16 11 16 11Z" fill="url(#oil-drop)" />
        </svg>
      </div>
    );
  }

  if (sym === "COPPER") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="copper-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#1c0f0a" />
          <rect x="7" y="7" width="18" height="18" rx="4" fill="url(#copper-grad)" stroke="#ffedd5" strokeWidth="0.8" strokeOpacity="0.4" />
          <text x="16" y="17" textAnchor="middle" fill="#fff7ed" fontSize="9" fontWeight="900" fontFamily="sans-serif">Cu</text>
          <text x="16" y="22" textAnchor="middle" fill="#ffedd5" fontSize="4" fontWeight="700" fontFamily="sans-serif">29</text>
        </svg>
      </div>
    );
  }

  if (sym === "PLATINUM") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="plat-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#0f172a" />
          <path d="M7 16L11 23H21L25 16H7Z" fill="url(#plat-grad)" />
          <path d="M11 9H21L25 16H7L11 9Z" fill="#f8fafc" />
          <text x="16" y="15" textAnchor="middle" fill="#1e293b" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">Pt</text>
          <text x="16" y="20" textAnchor="middle" fill="#1e293b" fontSize="3.5" fontWeight="700" fontFamily="sans-serif">78</text>
        </svg>
      </div>
    );
  }

  if (sym === "PALLADIUM") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="pal-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#0f172a" />
          <rect x="7" y="7" width="18" height="18" rx="4" fill="url(#pal-grad)" stroke="#cbd5e1" strokeWidth="0.8" strokeOpacity="0.4" />
          <text x="16" y="17" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">Pd</text>
          <text x="16" y="22" textAnchor="middle" fill="#e2e8f0" fontSize="4" fontWeight="700" fontFamily="sans-serif">46</text>
        </svg>
      </div>
    );
  }

  if (sym === "ALUMINIUM") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="al-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#1e293b" />
          <rect x="7" y="7" width="18" height="18" rx="4" fill="url(#al-grad)" stroke="#f1f5f9" strokeWidth="0.8" strokeOpacity="0.4" />
          <text x="16" y="17" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">Al</text>
          <text x="16" y="22" textAnchor="middle" fill="#e2e8f0" fontSize="4" fontWeight="700" fontFamily="sans-serif">13</text>
        </svg>
      </div>
    );
  }

  if (sym === "NATGAS" || sym === "TTF") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <linearGradient id="gas-flame-outer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="gas-flame-inner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="#08142c" />
          <path d="M16 6C16 6 22 13 22 18C22 21.3137 19.3137 24 16 24C12.6863 24 10 21.3137 10 18C10 13 16 6 16 6Z" fill="url(#gas-flame-outer)" />
          <path d="M16 13C16 13 19 17 19 19.5C19 21.1569 17.6569 22.5 16 22.5C14.3431 22.5 13 21.1569 13 19.5C13 17 16 13 16 13Z" fill="url(#gas-flame-inner)" />
        </svg>
      </div>
    );
  }

  if (sym === "CORN") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#142611" />
          <path d="M9 25C9 25 9 14 15 10C13 15 12 21 14 25H9Z" fill="#16a34a" />
          <path d="M23 25C23 25 23 14 17 10C19 15 20 21 18 25H23Z" fill="#15803d" />
          <path d="M13 10C13 7.5 16 5 16 5C16 5 19 7.5 19 10V22C19 23.5 17.5 24.5 16 24.5C14.5 24.5 13 23.5 13 22V10Z" fill="#eab308" />
          <line x1="14" y1="10" x2="18" y2="10" stroke="#ca8a04" strokeWidth="0.8" />
          <line x1="13.5" y1="13" x2="18.5" y2="13" stroke="#ca8a04" strokeWidth="0.8" />
          <line x1="13.5" y1="16" x2="18.5" y2="16" stroke="#ca8a04" strokeWidth="0.8" />
          <line x1="14" y1="19" x2="18" y2="19" stroke="#ca8a04" strokeWidth="0.8" />
          <line x1="16" y1="7" x2="16" y2="23" stroke="#ca8a04" strokeWidth="0.8" />
        </svg>
      </div>
    );
  }

  if (sym === "WHEAT") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#241909" />
          <path d="M16 6V26" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 8C14 6 12 7 12 9C12 11 16 11 16 11Z" fill="#facc15" />
          <path d="M16 8C18 6 20 7 20 9C20 11 16 11 16 11Z" fill="#eab308" />
          <path d="M16 12C13 10 11 11 11 13C11 15 16 15 16 15Z" fill="#facc15" />
          <path d="M16 12C19 10 21 11 21 13C21 15 16 15 16 15Z" fill="#eab308" />
          <path d="M16 16C13 14 11 15 11 17C11 19 16 19 16 19Z" fill="#facc15" />
          <path d="M16 16C19 14 21 15 21 17C21 19 16 19 16 19Z" fill="#eab308" />
          <path d="M16 20C14 19 12 20 12 21C12 22 16 22 16 22Z" fill="#facc15" />
          <path d="M16 20C18 19 20 20 20 21C20 22 16 22 16 22Z" fill="#eab308" />
        </svg>
      </div>
    );
  }

  if (sym === "URANIUM") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#0c1f0d" />
          <circle cx="16" cy="16" r="13" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="16" cy="16" r="2.8" fill="#4ade80" />
          <path d="M16 11.5C14.5 11.5 13 8.5 16 6C19 8.5 17.5 11.5 16 11.5Z" fill="#4ade80" />
          <path d="M12.1 18.2C11.3 17 8 16.5 7.5 20C10.5 20.5 12.8 19.5 12.1 18.2Z" fill="#4ade80" />
          <path d="M19.9 18.2C20.7 17 24 16.5 24.5 20C21.5 20.5 19.2 19.5 19.9 18.2Z" fill="#4ade80" />
        </svg>
      </div>
    );
  }

  if (sym === "DRAM") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#042f2e" />
          <rect x="5" y="10" width="22" height="12" rx="1.5" fill="#0d9488" stroke="#2dd4bf" strokeWidth="0.8" />
          <rect x="7.5" y="12" width="4" height="6" rx="0.5" fill="#0f172a" />
          <rect x="14" y="12" width="4" height="6" rx="0.5" fill="#0f172a" />
          <rect x="20.5" y="12" width="4" height="6" rx="0.5" fill="#0f172a" />
          <line x1="7" y1="22" x2="7" y2="24" stroke="#eab308" strokeWidth="1" />
          <line x1="10" y1="22" x2="10" y2="24" stroke="#eab308" strokeWidth="1" />
          <line x1="13" y1="22" x2="13" y2="24" stroke="#eab308" strokeWidth="1" />
          <line x1="16" y1="22" x2="16" y2="24" stroke="#eab308" strokeWidth="1" />
          <line x1="19" y1="22" x2="19" y2="24" stroke="#eab308" strokeWidth="1" />
          <line x1="22" y1="22" x2="22" y2="24" stroke="#eab308" strokeWidth="1" />
          <line x1="25" y1="22" x2="25" y2="24" stroke="#eab308" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // 3. FOREX (Official National Currency Roundels)
  // ==========================================
  if (sym === "EUR") {
    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <circle cx="16" cy="16" r="15" fill="#003399" stroke="#1d4ed8" strokeWidth="1" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = 16 + 10.5 * Math.sin(rad);
            const cy = 16 - 10.5 * Math.cos(rad);
            return <circle key={deg} cx={cx} cy={cy} r="0.9" fill="#ffcc00" />;
          })}
          <text x="16" y="21" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="sans-serif">€</text>
        </svg>
      </div>
    );
  }

  if (sym === "JPY") {
    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <circle cx="16" cy="16" r="15" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="16" cy="16" r="8.5" fill="#bc002d" />
          <text x="16" y="20.5" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif">¥</text>
        </svg>
      </div>
    );
  }

  if (sym === "GBP") {
    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <defs>
            <clipPath id="gbp-clip">
              <circle cx="16" cy="16" r="15" />
            </clipPath>
          </defs>
          <g clipPath="url(#gbp-clip)">
            <rect width="32" height="32" fill="#012169" />
            <line x1="0" y1="0" x2="32" y2="32" stroke="#ffffff" strokeWidth="4" />
            <line x1="32" y1="0" x2="0" y2="32" stroke="#ffffff" strokeWidth="4" />
            <line x1="0" y1="0" x2="32" y2="32" stroke="#c8102e" strokeWidth="2" />
            <line x1="32" y1="0" x2="0" y2="32" stroke="#c8102e" strokeWidth="2" />
            <line x1="16" y1="0" x2="16" y2="32" stroke="#ffffff" strokeWidth="7" />
            <line x1="0" y1="16" x2="32" y2="16" stroke="#ffffff" strokeWidth="7" />
            <line x1="16" y1="0" x2="16" y2="32" stroke="#c8102e" strokeWidth="4.5" />
            <line x1="0" y1="16" x2="32" y2="16" stroke="#c8102e" strokeWidth="4.5" />
            <circle cx="16" cy="16" r="7.5" fill="#012169" stroke="#ffffff" strokeWidth="1" />
            <text x="16" y="20.5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="sans-serif">£</text>
          </g>
        </svg>
      </div>
    );
  }

  if (sym === "KRW") {
    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <circle cx="16" cy="16" r="15" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <path d="M16 8C11.5817 8 8 11.5817 8 16C8 20.4183 11.5817 24 16 24C20.4183 24 24 20.4183 24 16C24 11.5817 20.4183 8 16 8Z" fill="#003478" />
          <path d="M16 8C11.5817 8 8 11.5817 8 16C8 18 10 19 12 19C14 19 16 17 16 16C16 15 18 13 20 13C22 13 24 14 24 16C24 11.5817 20.4183 8 16 8Z" fill="#c60c30" />
          <text x="16" y="20.5" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif">₩</text>
        </svg>
      </div>
    );
  }

  if (sym === "DXY") {
    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <circle cx="16" cy="16" r="15" fill="#0f291e" stroke="#166534" strokeWidth="1" />
          <circle cx="16" cy="16" r="11" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />
          <text x="16" y="21.5" textAnchor="middle" fill="#4ade80" fontSize="16" fontWeight="900" fontFamily="sans-serif">$</text>
        </svg>
      </div>
    );
  }

  // ==========================================
  // 4. STOCKS & INDICES (Official Brands & High-Fidelity Graphics)
  // ==========================================
  const stockSvg = STOCK_SVG_MAP[sym];
  if (stockSvg) {
    const isDarkLogo = sym === "AAPL" || sym === "SONY" || sym === "SNAP";
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 border border-white/10 ${className}`}
        style={{
          width: size,
          height: size,
          background: isDarkLogo ? "#18181b" : "#11141d",
          padding: size * 0.18,
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full"
          dangerouslySetInnerHTML={{ __html: sanitizeSvgForDisplay(stockSvg.svg) }}
        />
      </div>
    );
  }

  // Distinctive logos for benchmark indices and specialized tickers
  if (sym === "SP500") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#0c1b33" />
          <path d="M6 23C11 21 16 15 26 9" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <text x="16" y="21" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">S&P</text>
        </svg>
      </div>
    );
  }

  if (sym === "TSM") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#450a0a" />
          <rect x="7" y="7" width="8" height="8" rx="1.5" fill="#ef4444" />
          <rect x="17" y="7" width="8" height="8" rx="1.5" fill="#ffffff" />
          <rect x="7" y="17" width="8" height="8" rx="1.5" fill="#ffffff" />
          <rect x="17" y="17" width="8" height="8" rx="1.5" fill="#ef4444" />
          <text x="16" y="27" textAnchor="middle" fill="#ffffff" fontSize="4.5" fontWeight="800" fontFamily="sans-serif">TSMC</text>
        </svg>
      </div>
    );
  }

  if (sym === "ASML") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#0b1b3d" />
          <circle cx="16" cy="16" r="10" stroke="#00a3e0" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="16" cy="16" r="5" fill="#00a3e0" />
          <text x="16" y="27" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="800" fontFamily="sans-serif">ASML</text>
        </svg>
      </div>
    );
  }

  if (sym === "GME") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#09090b" />
          <circle cx="16" cy="16" r="9" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="45 15" strokeLinecap="round" />
          <line x1="16" y1="7" x2="16" y2="15" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (sym === "RKLB") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#0f172a" />
          <path d="M16 6C16 6 12 14 12 19H20C20 14 16 6 16 6Z" fill="#e2e8f0" />
          <path d="M14 19L12 23L16 21L20 23L18 19H14Z" fill="#ef4444" />
          <circle cx="16" cy="13" r="2" fill="#38bdf8" />
        </svg>
      </div>
    );
  }

  if (sym === "SMH" || sym === "SOXL") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#022c22" />
          <rect x="9" y="9" width="14" height="14" rx="2" fill="#065f46" stroke="#34d399" strokeWidth="1" />
          <line x1="6" y1="12" x2="9" y2="12" stroke="#34d399" strokeWidth="1" />
          <line x1="6" y1="16" x2="9" y2="16" stroke="#34d399" strokeWidth="1" />
          <line x1="6" y1="20" x2="9" y2="20" stroke="#34d399" strokeWidth="1" />
          <line x1="23" y1="12" x2="26" y2="12" stroke="#34d399" strokeWidth="1" />
          <line x1="23" y1="16" x2="26" y2="16" stroke="#34d399" strokeWidth="1" />
          <line x1="23" y1="20" x2="26" y2="20" stroke="#34d399" strokeWidth="1" />
          <text x="16" y="18" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="900" fontFamily="sans-serif">CHIP</text>
        </svg>
      </div>
    );
  }

  if (sym === "VIX") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#1c0f13" />
          <path d="M7 21C7 16 11 11 16 11C21 11 25 16 25 21" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />
          <line x1="16" y1="21" x2="21" y2="14" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="21" r="2.5" fill="#f43f5e" />
          <text x="16" y="27" textAnchor="middle" fill="#f43f5e" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">VIX</text>
        </svg>
      </div>
    );
  }

  if (sym === "XBI") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#1e102d" />
          <path d="M10 7C14 12 18 20 22 25" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 7C18 12 14 20 10 25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="12" x2="20" y2="12" stroke="#ffffff" strokeWidth="1" />
          <line x1="14" y1="16" x2="18" y2="16" stroke="#ffffff" strokeWidth="1" />
          <line x1="12" y1="20" x2="20" y2="20" stroke="#ffffff" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  if (sym === "XLE") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#1c1206" />
          <path d="M17 6L10 17H16L15 26L22 15H16L17 6Z" fill="#f59e0b" />
        </svg>
      </div>
    );
  }

  if (sym === "MAGS") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#1e1808" />
          <path d="M8 21L6 11L11 15L16 8L21 15L26 11L24 21H8Z" fill="#eab308" />
          <circle cx="16" cy="17" r="1.5" fill="#78350f" />
        </svg>
      </div>
    );
  }

  if (sym === "H100") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#08210f" />
          <rect x="8" y="8" width="16" height="16" rx="2" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
          <rect x="11" y="11" width="10" height="10" rx="1" fill="#1e293b" />
          <text x="16" y="17.5" textAnchor="middle" fill="#4ade80" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">H100</text>
        </svg>
      </div>
    );
  }

  if (sym === "NIFTY") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#111827" />
          <circle cx="16" cy="16" r="12" stroke="#ea580c" strokeWidth="1.5" />
          <path d="M10 20L14 13L18 17L22 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          <text x="16" y="27" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="800" fontFamily="sans-serif">NIFTY</text>
        </svg>
      </div>
    );
  }

  if (sym === "JP225") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#111827" />
          <circle cx="16" cy="14" r="6" fill="#dc2626" />
          <path d="M6 21H26" stroke="#ffffff" strokeWidth="1.5" />
          <text x="16" y="27" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="800" fontFamily="sans-serif">N225</text>
        </svg>
      </div>
    );
  }

  if (sym === "KR200") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#111827" />
          <circle cx="16" cy="14" r="6" fill="#2563eb" />
          <text x="16" y="27" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="800" fontFamily="sans-serif">KOSPI</text>
        </svg>
      </div>
    );
  }

  if (sym === "MRNA") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#1e1b4b" />
          <path d="M8 20C12 12 20 12 24 20" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="15" r="2" fill="#38bdf8" />
          <circle cx="20" cy="15" r="2" fill="#38bdf8" />
          <text x="16" y="27" textAnchor="middle" fill="#ffffff" fontSize="3.5" fontWeight="800" fontFamily="sans-serif">mRNA</text>
        </svg>
      </div>
    );
  }

  if (sym === "NOW") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#064e3b" />
          <circle cx="16" cy="16" r="8" fill="#10b981" />
          <circle cx="16" cy="16" r="4" fill="#064e3b" />
        </svg>
      </div>
    );
  }

  if (sym === "DKNG") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#172554" />
          <path d="M8 22L6 12L11 16L16 9L21 16L26 12L24 22H8Z" fill="#f59e0b" />
          <circle cx="16" cy="17" r="2" fill="#22c55e" />
        </svg>
      </div>
    );
  }

  if (sym === "UNITREE") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#0f172a" />
          <path d="M10 18H20V14H10V18ZM10 18L8 24M20 18L22 24M10 14L8 10H12M20 14L22 10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (sym === "CRCL") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#0b1b3d" />
          <circle cx="16" cy="16" r="10" stroke="#2775ca" strokeWidth="2" />
          <circle cx="16" cy="16" r="5" fill="#2775ca" />
        </svg>
      </div>
    );
  }

  if (sym === "PURRDAT") {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <rect width="32" height="32" rx="7" fill="#042f2e" />
          <path d="M9 13L11 8L15 11C15.6 10.9 16.4 10.9 17 11L21 8L23 13C24.5 15.5 24 19 22 21.5C19.5 24.5 12.5 24.5 10 21.5C8 19 7.5 15.5 9 13Z" fill="#06b6d4" />
          <circle cx="13" cy="16" r="1.5" fill="#0f172a" />
          <circle cx="19" cy="16" r="1.5" fill="#0f172a" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // 5. High-Tech Glassmorphism Institutional Badge for Any Other Stock / Asset
  // ==========================================
  const categoryColor =
    category === "commodities"
      ? "#eab308"
      : category === "forex"
      ? "#3b82f6"
      : category === "stocks"
      ? "#0ea5e9"
      : "#00f076";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl font-mono font-black flex-shrink-0 relative overflow-hidden select-none border ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #111420 0%, #171d2c 100%)",
        borderColor: `${categoryColor}35`,
        boxShadow: `0 2px 8px ${categoryColor}18`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg pointer-events-none opacity-40"
        style={{ background: categoryColor }}
      />
      <span
        className="relative z-10 leading-tight tracking-wider"
        style={{
          fontSize: sym.length > 4 ? size * 0.22 : sym.length > 3 ? size * 0.26 : size * 0.32,
          color: "#f8fafc",
        }}
      >
        {sym.slice(0, 4)}
      </span>
      {size >= 28 && (
        <span
          className="text-[7px] uppercase tracking-widest font-sans font-bold opacity-60"
          style={{ color: categoryColor }}
        >
          {category.slice(0, 3)}
        </span>
      )}
    </div>
  );
}
