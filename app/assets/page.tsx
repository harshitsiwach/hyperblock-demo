import type { Metadata } from "next";
import { HyperliquidAssetsClient } from "./assets-client";

export const metadata: Metadata = {
  title: "Markets — Hyperliquid Live",
  description: "Live commodities and forex prices from Hyperliquid xyz builder DEX",
};

export default function AssetsPage() {
  return <HyperliquidAssetsClient />;
}
