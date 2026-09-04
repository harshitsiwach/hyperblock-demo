import { PublicKey } from "@solana/web3.js";

export const DEFAULT_PROGRAM_ID = new PublicKey(
  "CPUwSRL2h3mh27GutZ3k6hcHt4swrV1NcQAUuLQUbQYX",
);

export const ORACLE_PROGRAM_ID = new PublicKey(
  "PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd",
);

export interface LiveConfig {
  baseRpcEndpoint: string;
  routerEndpoint: string;
  programId: PublicKey;
  marketId: number;
  collateralMint?: PublicKey;
}

export function readLiveConfig(): LiveConfig {
  const rawMarketId =
    process.env.LEVERAGED_PREDICTION_MARKET_ID?.trim() || "1";
  const marketId = Number(rawMarketId);
  if (!Number.isInteger(marketId) || marketId < 0 || marketId > 65_535) {
    throw new Error("LEVERAGED_PREDICTION_MARKET_ID must be a u16");
  }

  const programId = new PublicKey(
    process.env.LEVERAGED_PREDICTION_PROGRAM_ID?.trim() || DEFAULT_PROGRAM_ID.toBase58(),
  );
  const collateralMint = process.env.LEVERAGED_PREDICTION_COLLATERAL_MINT?.trim()
    ? new PublicKey(process.env.LEVERAGED_PREDICTION_COLLATERAL_MINT.trim())
    : undefined;

  return {
    baseRpcEndpoint:
      process.env.SOLANA_RPC_ENDPOINT?.trim() ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.trim() ||
      "https://rpc.magicblock.app/devnet",
    routerEndpoint:
      process.env.ROUTER_ENDPOINT?.trim() ||
      process.env.NEXT_PUBLIC_ROUTER_ENDPOINT?.trim() ||
      "https://devnet-router.magicblock.app/",
    programId,
    marketId,
    collateralMint,
  };
}
