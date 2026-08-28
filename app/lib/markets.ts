export type AssetCategory = "crypto" | "stocks" | "commodities" | "forex";

export interface MarketInfo {
  marketId: number;
  symbol: string;
  label: string;
  dex: string;
  category: AssetCategory;
  name: string;
}

export const MARKETS: MarketInfo[] = [
  { marketId: 1, symbol: "BTC", label: "BTC / USD", dex: "", category: "crypto", name: "Bitcoin" },
  { marketId: 2, symbol: "ETH", label: "ETH / USD", dex: "", category: "crypto", name: "Ethereum" },
  { marketId: 3, symbol: "SOL", label: "SOL / USD", dex: "", category: "crypto", name: "Solana" },
  { marketId: 4, symbol: "HYPE", label: "HYPE / USD", dex: "", category: "crypto", name: "Hyperliquid" },
  { marketId: 14, symbol: "DOGE", label: "DOGE / USD", dex: "", category: "crypto", name: "Dogecoin" },
  { marketId: 15, symbol: "AVAX", label: "AVAX / USD", dex: "", category: "crypto", name: "Avalanche" },
  { marketId: 16, symbol: "ARB", label: "ARB / USD", dex: "", category: "crypto", name: "Arbitrum" },
  { marketId: 17, symbol: "AAVE", label: "AAVE / USD", dex: "", category: "crypto", name: "Aave" },
  { marketId: 5, symbol: "AAPL", label: "AAPL / USD", dex: "xyz", category: "stocks", name: "Apple Inc." },
  { marketId: 6, symbol: "NVDA", label: "NVDA / USD", dex: "xyz", category: "stocks", name: "NVIDIA Corp." },
  { marketId: 7, symbol: "TSLA", label: "TSLA / USD", dex: "xyz", category: "stocks", name: "Tesla Inc." },
  { marketId: 8, symbol: "COIN", label: "COIN / USD", dex: "xyz", category: "stocks", name: "Coinbase Global" },
  { marketId: 18, symbol: "MSFT", label: "MSFT / USD", dex: "xyz", category: "stocks", name: "Microsoft" },
  { marketId: 19, symbol: "GOOGL", label: "GOOGL / USD", dex: "xyz", category: "stocks", name: "Alphabet" },
  { marketId: 20, symbol: "AMZN", label: "AMZN / USD", dex: "xyz", category: "stocks", name: "Amazon" },
  { marketId: 21, symbol: "META", label: "META / USD", dex: "xyz", category: "stocks", name: "Meta Platforms" },
  { marketId: 9, symbol: "GOLD", label: "Gold (XAU)", dex: "xyz", category: "commodities", name: "Gold" },
  { marketId: 10, symbol: "SILVER", label: "Silver (XAG)", dex: "xyz", category: "commodities", name: "Silver" },
  { marketId: 11, symbol: "BRENTOIL", label: "Brent Oil", dex: "xyz", category: "commodities", name: "Brent Crude Oil" },
  { marketId: 22, symbol: "COPPER", label: "Copper / USD", dex: "xyz", category: "commodities", name: "Copper" },
  { marketId: 23, symbol: "PLATINUM", label: "Platinum", dex: "xyz", category: "commodities", name: "Platinum" },
  { marketId: 24, symbol: "PALLADIUM", label: "Palladium", dex: "xyz", category: "commodities", name: "Palladium" },
  { marketId: 12, symbol: "EUR", label: "EUR / USD", dex: "xyz", category: "forex", name: "Euro" },
  { marketId: 13, symbol: "JPY", label: "JPY / USD", dex: "xyz", category: "forex", name: "Japanese Yen" },
  { marketId: 25, symbol: "SP500", label: "S&P 500", dex: "xyz", category: "stocks", name: "S&P 500 Index" },
  { marketId: 26, symbol: "DXY", label: "DXY / USD", dex: "xyz", category: "forex", name: "US Dollar Index" },
];

export const MARKET_BY_ID = new Map(MARKETS.map((m) => [m.marketId, m]));
export const MARKET_BY_SYMBOL = new Map(MARKETS.map((m) => [m.symbol, m]));

export function getMarket(marketId: number): MarketInfo | undefined {
  return MARKET_BY_ID.get(marketId);
}
export function getMarketBySymbol(symbol: string): MarketInfo | undefined {
  return MARKET_BY_SYMBOL.get(symbol);
}
export const SUPPORTED_ASSET_IDS = MARKETS.map((m) => m.marketId);
export const SUPPORTED_SYMBOLS = MARKETS.map((m) => m.symbol);
