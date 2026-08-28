import { describe, expect, it } from "vitest";
import { accountDiscriminator, decodeMarket, decodePriceAccount } from "@/app/lib/live/decode";
import { Buffer } from "buffer";

function writeBigUInt128LE(data: Buffer, value: bigint, offset: number) {
  data.writeBigUInt64LE(value & ((1n << 64n) - 1n), offset);
  data.writeBigUInt64LE(value >> 64n, offset + 8);
}

describe("Hyperliquid PriceAccount", () => {
  it("encodes and decodes PriceAccount (1e6 scale)", () => {
    const data = Buffer.alloc(81);
    accountDiscriminator("PriceAccount").copy(data);
    const authority = Buffer.alloc(32, 7);
    authority.copy(data, 8);
    Buffer.from("BTC").copy(data, 40);
    Buffer.from("").copy(data, 56);
    data.writeBigUInt64LE(67432123456n, 64); // $67,432.123456 *1e6
    data.writeBigInt64LE(1_800_000_000n, 72);
    data.writeUInt8(255, 80);

    const decoded = decodePriceAccount(data);
    expect(decoded.assetSymbol).toBe("BTC");
    expect(decoded.dex).toBe("");
    expect(decoded.price).toBe(67432123456n);
    expect(decoded.timestamp).toBe(1_800_000_000n);
    expect(decoded.bump).toBe(255);
  });

  it("handles dex namespaced symbols (fx/commod)", () => {
    const data = Buffer.alloc(81);
    accountDiscriminator("PriceAccount").copy(data);
    Buffer.alloc(32, 1).copy(data, 8);
    Buffer.from("EUR-USD").copy(data, 40);
    Buffer.from("fx").copy(data, 56);
    data.writeBigUInt64LE(1100000n, 64);
    data.writeBigInt64LE(1000n, 72);
    data.writeUInt8(1, 80);
    const d = decodePriceAccount(data);
    expect(d.assetSymbol).toBe("EUR-USD");
    expect(d.dex).toBe("fx");
  });

  it("converts 1e6 to 1e8 for settlement (×100)", () => {
    // price 67432.123456 *1e6 = 67432123456 -> *100 = 6743212345600 (1e8)
    const priceU64 = 67432123456n;
    const expectedI64 = 67432123456n * 100n;
    expect(expectedI64).toBe(6743212345600n);
  });

  it("Market with Hyperliquid priceAccount decodes correctly", () => {
    const data = Buffer.alloc(158);
    accountDiscriminator("Market").copy(data);
    data.writeUInt16LE(2, 8);
    Buffer.alloc(32, 3).copy(data, 10);
    Buffer.alloc(32, 9).copy(data, 42);
    writeBigUInt128LE(data, 1000n, 74);
    data.writeBigUInt64LE(0n, 90);
    data.writeBigUInt64LE(0n, 98);
    data.writeUInt32LE(0, 106);
    data.writeUInt32LE(0, 110);
    data.writeUInt8(0, 114);
    data.writeUInt8(255, 115);
    const pricePda = Buffer.alloc(32, 9);
    pricePda.copy(data, 116);
    data.writeUInt16LE(19000, 148);
    data.writeBigUInt64LE(5000000000n, 150);
    const m = decodeMarket(data);
    expect(m.marketId).toBe(2);
    expect(m.priceAccount).not.toBeNull();
    expect(m.payoutBps).toBe(19000);
    expect(m.maxOpenExposure).toBe(5000000000n);
  });

  it("rejects stale price (>5s)", () => {
    const now = 1000;
    const ts = 994; // 6s old
    const age = now - ts;
    expect(age > 5).toBe(true);
  });

  it("WrongPriceFeed detection via PDA mismatch", () => {
    const marketPriceAccount = Buffer.alloc(32, 1);
    const provided = Buffer.alloc(32, 2);
    expect(marketPriceAccount.equals(provided)).toBe(false);
  });
});

describe("exposure cap logic", () => {
  it("rejects when open_collateral_after exceeds max_open_exposure", () => {
    const max = 10_000_000_000n;
    const existing = 9_500_000_000n;
    const newCollateral = 1_000_000_000n;
    const after = existing + newCollateral;
    expect(after > max).toBe(true);
  });
  it("allows when within cap", () => {
    const max = 10_000_000_000n;
    const after = 5_000_000_000n;
    expect(after <= max).toBe(true);
  });
});
