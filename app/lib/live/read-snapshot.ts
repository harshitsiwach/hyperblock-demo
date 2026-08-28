import { DELEGATION_PROGRAM_ID } from "@magicblock-labs/ephemeral-rollups-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import type { MarketSnapshot, Play, PricePoint } from "@/app/lib/domain";
import {
  decodeMarket,
  decodePriceAccount,
  decodeProtocolConfig,
  decodeUserPositions,
} from "@/app/lib/live/decode";
import { ORACLE_PROGRAM_ID, readLiveConfig } from "@/app/lib/live/config";
import {
  decodeOraclePrice,
  ORACLE_EXPONENT,
} from "@/app/lib/live/oracle";
import { mergeOraclePriceHistory } from "@/app/lib/live/oracle-stream";
import {
  marketPda,
  protocolConfigPda,
  userPositionsPda,
} from "@/app/lib/live/pdas";
import {
  getDelegationStatus,
  normalizeErEndpoint,
} from "@/app/lib/live/router";
import { positionToPlay } from "@/app/lib/live/position-stream";
import { MARKETS } from "@/app/lib/markets";
import { Buffer } from "buffer";

const historyByOracle = new Map<string, PricePoint[]>();

function updateHistory(oracle: string, price: number, now: number): PricePoint[] {
  const current = historyByOracle.get(oracle) ?? [];
  const next = mergeOraclePriceHistory(
    current,
    [{ price, timestamp: now }],
    now,
  );
  historyByOracle.set(oracle, next);
  return next;
}

export async function readLiveSnapshot(walletAddress?: string, marketIdOverride?: number): Promise<MarketSnapshot> {
  const config = readLiveConfig();
  const marketId = marketIdOverride ?? config.marketId;
  const now = Date.now();
  const baseConnection = new Connection(config.baseRpcEndpoint, "confirmed");
  const marketAddress = marketPda(config.programId, marketId);
  const baseMarketInfo = await baseConnection.getAccountInfo(marketAddress, "confirmed");
  if (!baseMarketInfo) throw new Error(`Market ${config.marketId} is not initialized on base`);
  if (!baseMarketInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
    throw new Error("Market is not delegated; live ER reads are unavailable");
  }

  const marketRoute = await getDelegationStatus(
    config.routerEndpoint,
    marketAddress.toBase58(),
  );
  if (!marketRoute.isDelegated || !marketRoute.fqdn) {
    throw new Error("Router did not return an active ER for the Market");
  }
  const erEndpoint = normalizeErEndpoint(marketRoute.fqdn);
  const erConnection = new Connection(erEndpoint, "confirmed");
  const erMarketInfo = await erConnection.getAccountInfo(marketAddress, "confirmed");
  if (!erMarketInfo || !erMarketInfo.owner.equals(config.programId)) {
    throw new Error("Market is missing or has the wrong owner on its routed ER");
  }
  const market = decodeMarket(Buffer.from(erMarketInfo.data));
  if (market.marketId !== marketId) throw new Error("Routed Market ID mismatch");

  // Hyperliquid price account path (devnet) — if market has priceAccount set, use it.
  let price: { displayPrice: number; rawPrice: bigint; ageSeconds: number };
  let oracleAddress: PublicKey;
  let oracleFeedIdHex: string;
  let priceExponent = ORACLE_EXPONENT;
  const hasHyperliquid = market.priceAccount && !Buffer.from(market.priceAccount as Uint8Array).equals(Buffer.alloc(32));
  if (hasHyperliquid) {
    oracleAddress = new PublicKey(market.priceAccount as Uint8Array);
    const priceInfo = await erConnection.getAccountInfo(oracleAddress, "confirmed");
    if (!priceInfo) throw new Error("Hyperliquid PriceAccount missing on ER");
    const decoded = decodePriceAccount(Buffer.from(priceInfo.data));
    const age = Math.floor(now / 1_000) - Number(decoded.timestamp);
    if (decoded.price === 0n) throw new Error("PriceAccount price is zero");
    if (age < 0 || age > 5) throw new Error(`Hyperliquid price stale age=${age}s`);
    price = {
      displayPrice: Number(decoded.price) / 1_000_000,
      rawPrice: decoded.price * 100n, // scale to 1e8 for compat (1e6 *100)
      ageSeconds: age,
    };
    oracleFeedIdHex = Buffer.from(decoded.assetSymbol).toString("hex");
    priceExponent = 8;
  } else {
    oracleAddress = new PublicKey(market.oracle);
    const oracleInfo = await erConnection.getAccountInfo(oracleAddress, "confirmed");
    if (!oracleInfo || !oracleInfo.owner.equals(ORACLE_PROGRAM_ID)) {
      throw new Error("Configured oracle is missing or owned by the wrong program on the ER");
    }
    const decoded = decodeOraclePrice(
      Buffer.from(oracleInfo.data),
      market.oracleFeedId,
      Math.floor(now / 1_000),
    );
    price = decoded;
    oracleFeedIdHex = Buffer.from(market.oracleFeedId).toString("hex");
  }

  let walletBalanceUsd: number | null = null;
  let fallbackClaimableUsd = 0;
  let collateralMintAddress: string | undefined;
  let plays: Play[] = [];
  let normalizedWallet: string | null = null;
  if (walletAddress) {
    const user = new PublicKey(walletAddress);
    normalizedWallet = user.toBase58();
    const positionsAddress = userPositionsPda(config.programId, user);
    const positionsRoute = await getDelegationStatus(
      config.routerEndpoint,
      positionsAddress.toBase58(),
    ).catch(() => null);
    if (positionsRoute?.isDelegated && positionsRoute.fqdn) {
      const positionsEndpoint = normalizeErEndpoint(positionsRoute.fqdn);
      if (positionsEndpoint !== erEndpoint) {
        throw new Error("UserPositions and Market are routed to different ERs");
      }
      const positionsInfo = await erConnection.getAccountInfo(positionsAddress, "confirmed");
      if (positionsInfo) {
        if (!positionsInfo.owner.equals(config.programId)) {
          throw new Error("UserPositions has the wrong owner on the ER");
        }
        plays = decodeUserPositions(Buffer.from(positionsInfo.data))
          .filter((position) => position.marketId === marketId)
          .map((position) => positionToPlay(position, now, price.displayPrice));
      }
    }

    const configInfo = await baseConnection.getAccountInfo(
      protocolConfigPda(config.programId),
      "confirmed",
    );
    if (configInfo) {
      const protocol = decodeProtocolConfig(Buffer.from(configInfo.data));
      const collateralMint = config.collateralMint ?? new PublicKey(protocol.collateralMint);
      collateralMintAddress = collateralMint.toBase58();
      const userTokenAccount = getAssociatedTokenAddressSync(collateralMint, user);
      const payoutEscrowTokenAccount = getAssociatedTokenAddressSync(
        collateralMint,
        positionsAddress,
        true,
      );
      const [erTokenBalance, payoutBalance] = await Promise.all([
        erConnection.getTokenAccountBalance(userTokenAccount, "confirmed").catch(() => null),
        erConnection.getTokenAccountBalance(payoutEscrowTokenAccount, "confirmed").catch(() => null),
      ]);
      walletBalanceUsd = erTokenBalance?.value.uiAmount ?? null;
      fallbackClaimableUsd = payoutBalance?.value.uiAmount ?? 0;
    }
  }

  const labels = (() => {
    const m = MARKETS.find((x) => x.marketId === market.marketId);
    return m ? { marketLabel: m.label, gameLabel: `${m.symbol} PRICE RUSH` } : { marketLabel: "BTC / USD", gameLabel: "BTC PRICE RUSH" };
  })();
  const noticePrefix = hasHyperliquid ? "Hyperliquid ·" : "Live mode ·";
  return {
    mode: "live",
    marketId: market.marketId,
    marketLabel: labels.marketLabel,
    gameLabel: labels.gameLabel,
    currentPrice: price.displayPrice,
    currentRawPrice: price.rawPrice.toString(),
    priceExponent,
    priceHistory: updateHistory(oracleAddress.toBase58(), price.displayPrice, now),
    feedHealth: price.ageSeconds <= 2 ? "live" : price.ageSeconds <= 5 ? "live" : "delayed",
    feedAgeSeconds: price.ageSeconds,
    marketMode: market.mode,
    activePositions: market.activePositions,
    nextPositionNonce: market.nextPositionNonce,
    maxPositions: 8,
    walletAddress: normalizedWallet,
    walletBalanceUsd,
    fallbackClaimableUsd,
    plays,
    capturedAt: now,
    erEndpoint,
    collateralMint: collateralMintAddress,
    oracleAddress: oracleAddress.toBase58(),
    oracleFeedId: oracleFeedIdHex,
    notice: `${noticePrefix} oracle ready`,
  };
}
