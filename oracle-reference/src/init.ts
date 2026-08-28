import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

dotenv.config();

const PROGRAM_ID = new PublicKey("CPUwSRL2h3mh27GutZ3k6hcHt4swrV1NcQAUuLQUbQYX");
const PRICE_SEED = Buffer.from("price");
const MARKET_SEED = Buffer.from("market");
const CONFIG_SEED = Buffer.from("protocol_config");

function disc(name: string): Buffer {
  return Buffer.from(createHash("sha256").update(`global:${name}`).digest().subarray(0, 8));
}

const INIT_PRICE_DISC = disc("initialize_price_account");
const UPDATE_PRICE_DISC = disc("update_price");
const INIT_MARKET_WITH_PRICE_DISC = disc("initialize_market_with_price_account");
const DELEGATE_PRICE_DISC = disc("delegate_price_account");
const DELEGATE_MARKET_DISC = disc("delegate_market");

function pricePda(symbol: string): PublicKey {
  const buf = Buffer.alloc(16);
  Buffer.from(symbol).copy(buf);
  return PublicKey.findProgramAddressSync([PRICE_SEED, buf], PROGRAM_ID)[0];
}
function marketPda(marketId: number): PublicKey {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(marketId);
  return PublicKey.findProgramAddressSync([MARKET_SEED, b], PROGRAM_ID)[0];
}
function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID)[0];
}
function feeAuthorityPda(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("fee_authority"), market.toBuffer()], PROGRAM_ID)[0];
}

function loadKp(path: string): Keypair {
  const j = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(j));
}

async function getValidator(connection: Connection): Promise<PublicKey> {
  const res = await fetch(connection.rpcEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getIdentity", params: [] }),
  });
  const body = (await res.json()) as { result?: { identity: string }; error?: { message: string } };
  if (!body.result?.identity) throw new Error(body.error?.message ?? "ER getIdentity failed");
  return new PublicKey(body.result.identity);
}

async function main() {
  const cfg = loadConfig(resolve(process.cwd(), "config.json"));
  const baseRpc = process.env.SOLANA_RPC_ENDPOINT || "https://rpc.magicblock.app/devnet";
  const erRpc = process.env.ER_RPC_ENDPOINT || cfg.erRpc || "https://devnet-as.magicblock.app";
  const baseConnection = new Connection(baseRpc, "confirmed");
  const erConnection = new Connection(erRpc, "confirmed");
  const oraclePath = process.env.ORACLE_KEYPAIR_PATH || resolve(process.cwd(), "oracle-keypair.json");
  const adminPath = process.env.ADMIN_KEYPAIR_PATH || oraclePath;
  const payer = loadKp(adminPath);
  const oracle = loadKp(oraclePath);
  console.log(`Base RPC ${baseRpc}  ER RPC ${erRpc}  Router ${cfg.routerEndpoint}`);
  console.log(`Payer ${payer.publicKey.toBase58()}  Oracle ${oracle.publicKey.toBase58()}`);
  console.log(`Program ${PROGRAM_ID.toBase58()}`);
  let validator: PublicKey | null = null;
  try {
    validator = await getValidator(erConnection);
    console.log(`ER validator ${validator.toBase58()}`);
  } catch (e) {
    console.warn(`Could not fetch validator: ${e}`);
  }

  const cfgAcc = configPda();
  const cfgInfo = await baseConnection.getAccountInfo(cfgAcc);
  if (!cfgInfo) {
    console.error("ProtocolConfig not found — run bootstrap-devnet first to init protocol + collateral mint");
    process.exit(1);
  }
  const COLLATERAL_MINT = new PublicKey(cfgInfo.data.subarray(8+32+32, 8+32+32+32));
  console.log(`Collateral mint ${COLLATERAL_MINT.toBase58()}`);
  const protocolConfig = cfgAcc;

  // Map symbol -> marketId for 13-asset catalogue (BTC 20 avoids legacy market 1 delegated to unknown ER mrg1x...)
  const symbolToMarketId: Record<string, number> = {
    BTC: 1,
    ETH: 2,
    SOL: 3,
    HYPE: 4,
    AAPL: 5,
    NVDA: 6,
    TSLA: 7,
    COIN: 8,
    GOLD: 9,
    SILVER: 10,
    BRENTOIL: 11,
    EUR: 12,
    JPY: 13,
  };
  let nextMarketId = 14;
  for (const asset of cfg.assets) {
    const symbol = asset.symbol;
    const pda = pricePda(symbol);
    let info = await baseConnection.getAccountInfo(pda);
    if (!info) {
      console.log(`\n[init] PriceAccount ${symbol} missing -> creating`);
      const dexBuf = Buffer.alloc(8);
      Buffer.from(asset.dex).copy(dexBuf);
      const symBuf = Buffer.alloc(16);
      Buffer.from(symbol).copy(symBuf);
      const data = Buffer.concat([INIT_PRICE_DISC, symBuf, dexBuf]);
      const ix = {
        keys: [
          { pubkey: oracle.publicKey, isSigner: true, isWritable: true },
          { pubkey: pda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data,
      };
      const tx = new Transaction().add(ix as any);
      tx.recentBlockhash = (await baseConnection.getLatestBlockhash()).blockhash;
      tx.feePayer = payer.publicKey;
      if (payer.publicKey.equals(oracle.publicKey)) tx.sign(payer);
      else tx.sign(payer, oracle);
      const sig = await baseConnection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await baseConnection.confirmTransaction(sig, "confirmed");
      console.log(`  created ${symbol} sig ${sig.slice(0,8)}`);
      info = await baseConnection.getAccountInfo(pda);
    } else {
      console.log(`\n[exists] PriceAccount ${symbol} ${pda.toBase58()} ${info.data.length} bytes`);
      // check authority
      try {
        // discriminator 8 + authority 32 at offset 8
        const auth = new PublicKey(info.data.subarray(8, 40));
        console.log(`  authority ${auth.toBase58()} ${auth.equals(oracle.publicKey) ? "OK" : "MISMATCH"}`);
      } catch {}
    }

    // Warm price to avoid zero
    if (info) {
      const price = info.data.readBigUInt64LE(8+32+16+8);
      console.log(`  current price ${price} (1e6)`);
      if (price === 0n) {
        const defaults: Record<string, number> = {
          BTC: 70000_000000,
          ETH: 2500_000000,
          SOL: 150_000000,
          HYPE: 25_000000,
          AAPL: 220_000000,
          NVDA: 130_000000,
          TSLA: 350_000000,
          COIN: 300_000000,
          GOLD: 3000_000000,
          SILVER: 70_000000,
          BRENTOIL: 85_000000,
          EUR: 1_100000,
          JPY: 150_000000,
        };
        const initPrice = defaults[symbol] ?? 100_000000;
        const data = Buffer.alloc(16);
        INIT_PRICE_DISC.copy(data, 0);
        // Actually update_price data is 8 + 8
        const updData = Buffer.alloc(16);
        UPDATE_PRICE_DISC.copy(updData, 0);
        updData.writeBigUInt64LE(BigInt(initPrice), 8);
        const ix = {
          keys: [
            { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
            { pubkey: pda, isSigner: false, isWritable: true },
          ],
          programId: PROGRAM_ID,
          data: updData,
        };
        const tx2 = new Transaction().add(ix as any);
        tx2.recentBlockhash = (await baseConnection.getLatestBlockhash()).blockhash;
        tx2.feePayer = payer.publicKey;
        if (payer.publicKey.equals(oracle.publicKey)) tx2.sign(payer);
        else tx2.sign(payer, oracle);
        const sig2 = await baseConnection.sendRawTransaction(tx2.serialize());
        await baseConnection.confirmTransaction(sig2, "confirmed");
        console.log(`  seeded price ${initPrice} sig ${sig2.slice(0,8)}`);
      }
    }

    // Now market — initialize with Hyperliquid PriceAccount (6-decimal test-USDC, 10k cap, 1.9x payout)
    const marketId = symbolToMarketId[symbol] ?? nextMarketId++;
    const mPda = marketPda(marketId);
    const mInfo = await baseConnection.getAccountInfo(mPda);
    const poolTokenAccount = getAssociatedTokenAddressSync(COLLATERAL_MINT, mPda, true);
    const feeAuthority = feeAuthorityPda(mPda);
    const feeTokenAccount = getAssociatedTokenAddressSync(COLLATERAL_MINT, feeAuthority, true);
    if (!mInfo) {
      console.log(`[init] Market ${symbol} id=${marketId} ${mPda.toBase58()} missing -> creating`);
      const initData = Buffer.alloc(8 + 2 + 8 + 2 + 8);
      let off = 0;
      INIT_MARKET_WITH_PRICE_DISC.copy(initData, off); off += 8;
      initData.writeUInt16LE(marketId, off); off += 2;
      initData.writeBigUInt64LE(0n, off); off += 8; // sponsorLamports
      initData.writeUInt16LE(19000, off); off += 2; // payout_bps 1.9x
      initData.writeBigUInt64LE(10000000000n, off); // max_open_exposure 10k USDC
      const ix = {
        keys: [
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: COLLATERAL_MINT, isSigner: false, isWritable: false },
          { pubkey: protocolConfig, isSigner: false, isWritable: false },
          { pubkey: pda, isSigner: false, isWritable: false },
          { pubkey: mPda, isSigner: false, isWritable: true },
          { pubkey: poolTokenAccount, isSigner: false, isWritable: true },
          { pubkey: feeAuthority, isSigner: false, isWritable: false },
          { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: initData,
      };
      const tx = new Transaction().add(ix as any);
      tx.recentBlockhash = (await baseConnection.getLatestBlockhash()).blockhash;
      tx.feePayer = payer.publicKey;
      tx.sign(payer);
      const sig = await baseConnection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await baseConnection.confirmTransaction(sig, "confirmed");
      console.log(`  created market ${symbol} id=${marketId} sig ${sig.slice(0, 8)}`);
    } else {
      console.log(`[exists] Market ${symbol} id=${marketId} size ${mInfo.data.length}`);
      if (mInfo.data.length === 116) {
        console.warn(`  old 116-byte market (Pyth) — consider using new id ${nextMarketId} for Hyperliquid`);
      } else {
        const hasPrice = !mInfo.data.subarray(116, 148).equals(Buffer.alloc(32));
        console.log(`  priceAccount ${hasPrice ? "set" : "missing"} payout=${mInfo.data.readUInt16LE(148)} maxExp=${mInfo.data.readBigUInt64LE(150)}`);
      }
    }
    // Delegate PriceAccount and Market to ER validator if available
    if (validator) {
      // Check delegation status via router
      try {
        const router = (cfg.routerEndpoint ?? "https://devnet-router.magicblock.app/").replace(/\/+$/, "");
        const check = async (addr: PublicKey) => {
          const res = await fetch(`${router}/getDelegationStatus`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getDelegationStatus", params: [addr.toBase58()] }),
          });
          const j = (await res.json()) as { result?: { isDelegated: boolean } };
          return !!j.result?.isDelegated;
        };
        const priceDelegated = await check(pda);
        if (!priceDelegated) {
          console.log(`[delegate] PriceAccount ${symbol} -> ${validator.toBase58().slice(0, 8)}...`);
          const symBuf = Buffer.alloc(16);
          Buffer.from(symbol).copy(symBuf);
          const delegateDisc = disc("delegate_price_account");
          const data = Buffer.concat([delegateDisc, symBuf, validator.toBuffer()]);
          // Derive delegation PDAs for price account
          const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
          const bufferPda = PublicKey.findProgramAddressSync([Buffer.from("buffer"), pda.toBuffer()], DELEGATION_PROGRAM_ID)[0];
          // For ephemeral delegate, buffer is derived from delegation program via SDK helper; use generic derivation
          // Attempt delegate via program
          try {
            const ix = {
              keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: protocolConfig, isSigner: false, isWritable: false },
                { pubkey: bufferPda, isSigner: false, isWritable: true },
                { pubkey: PublicKey.findProgramAddressSync([Buffer.from("delegation"), pda.toBuffer()], DELEGATION_PROGRAM_ID)[0], isSigner: false, isWritable: true },
                { pubkey: PublicKey.findProgramAddressSync([Buffer.from("delegation-metadata"), pda.toBuffer()], DELEGATION_PROGRAM_ID)[0], isSigner: false, isWritable: true },
                { pubkey: pda, isSigner: false, isWritable: true },
                { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              ],
              programId: PROGRAM_ID,
              data,
            };
            const tx = new Transaction().add(ix as any);
            tx.recentBlockhash = (await baseConnection.getLatestBlockhash()).blockhash;
            tx.feePayer = payer.publicKey;
            tx.sign(payer);
            const sig = await baseConnection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
            await baseConnection.confirmTransaction(sig, "confirmed");
            console.log(`  delegated PriceAccount ${symbol} sig ${sig.slice(0, 8)}`);
          } catch (e: unknown) {
            console.log(`  PriceAccount delegation failed (may need Anchor): ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          console.log(`[delegated] PriceAccount ${symbol}`);
        }
        const marketDelegated = await check(mPda);
        if (!marketDelegated) {
          console.log(`[delegate] Market ${symbol} id=${marketId} -> ${validator.toBase58().slice(0, 8)}...`);
          try {
            const marketIdBuf = Buffer.alloc(2);
            marketIdBuf.writeUInt16LE(marketId);
            const marketDelegateData = Buffer.concat([disc("delegate_market"), marketIdBuf, validator.toBuffer()]);
            const bufferPda = PublicKey.findProgramAddressSync([Buffer.from("buffer"), mPda.toBuffer()], new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"))[0];
            const ix = {
              keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: protocolConfig, isSigner: false, isWritable: false },
                { pubkey: bufferPda, isSigner: false, isWritable: true },
                { pubkey: PublicKey.findProgramAddressSync([Buffer.from("delegation"), mPda.toBuffer()], new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"))[0], isSigner: false, isWritable: true },
                { pubkey: PublicKey.findProgramAddressSync([Buffer.from("delegation-metadata"), mPda.toBuffer()], new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"))[0], isSigner: false, isWritable: true },
                { pubkey: mPda, isSigner: false, isWritable: true },
                { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"), isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              ],
              programId: PROGRAM_ID,
              data: marketDelegateData,
            };
            const tx = new Transaction().add(ix as any);
            tx.recentBlockhash = (await baseConnection.getLatestBlockhash()).blockhash;
            tx.feePayer = payer.publicKey;
            tx.sign(payer);
            const sig = await baseConnection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
            await baseConnection.confirmTransaction(sig, "confirmed");
            console.log(`  delegated Market ${symbol} sig ${sig.slice(0, 8)}`);
          } catch (e: unknown) {
            console.log(`  Market delegation failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          console.log(`[delegated] Market ${symbol}`);
        }
      } catch (e) {
        console.warn(`  delegation check failed: ${e}`);
      }
    }
  }

  console.log("\nDone. Next steps:");
  console.log("- Delegate PriceAccounts to ER: delegate_price_account for each symbol with validator from getDelegationStatus");
  console.log("- Initialize MarketWithPriceAccount via Anchor client (see oracle/scripts/bootstrap-hyperliquid.mjs)");
  console.log("- Then run oracle writer: pnpm dev");
}

main().catch(e => { console.error(e); process.exit(1); });
