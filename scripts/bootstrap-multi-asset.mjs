import {
  DELEGATION_PROGRAM_ID,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
  deriveEphemeralAta,
  deriveRentPda,
  deriveVault,
  deriveVaultAta,
  delegateSpl,
  initEphemeralAtaIx,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  AddressLookupTableProgram,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const BASE_RPC = process.env.SOLANA_RPC_ENDPOINT ?? "https://rpc.magicblock.app/devnet";
const ER_RPC = process.env.EPHEMERAL_RPC_ENDPOINT ?? "https://devnet-as.magicblock.app";
const ROUTER_RPC = process.env.ROUTER_ENDPOINT ?? "https://devnet-router.magicblock.app";
const PROGRAM_ID = new PublicKey("CPUwSRL2h3mh27GutZ3k6hcHt4swrV1NcQAUuLQUbQYX");
const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

const DEPLOYMENT_DIR = resolve(".devnet");
const MINT_KEYPAIR_PATH = resolve(DEPLOYMENT_DIR, "test-usdc-mint-keypair.json");
const MANIFEST_PATH = resolve(DEPLOYMENT_DIR, "multi-asset-manifest.json");
const LOOKUP_TABLE_PATH = resolve(DEPLOYMENT_DIR, "session-setup-lookup-table.json");

const ASSETS = [
  { symbol: "BTC", dex: "", decimals: 6, marketId: 1, category: "crypto", initialPrice: 80000_000000n },
  { symbol: "ETH", dex: "", decimals: 6, marketId: 2, category: "crypto", initialPrice: 2500_000000n },
  { symbol: "SOL", dex: "", decimals: 6, marketId: 3, category: "crypto", initialPrice: 100_000000n },
  { symbol: "HYPE", dex: "", decimals: 6, marketId: 4, category: "crypto", initialPrice: 50_000000n },
  { symbol: "AAPL", dex: "xyz", decimals: 6, marketId: 5, category: "stocks", initialPrice: 320_000000n },
  { symbol: "NVDA", dex: "xyz", decimals: 6, marketId: 6, category: "stocks", initialPrice: 220_000000n },
  { symbol: "TSLA", dex: "xyz", decimals: 6, marketId: 7, category: "stocks", initialPrice: 350_000000n },
  { symbol: "COIN", dex: "xyz", decimals: 6, marketId: 8, category: "stocks", initialPrice: 185_000000n },
  { symbol: "GOLD", dex: "xyz", decimals: 6, marketId: 9, category: "commodities", initialPrice: 4640_000000n },
  { symbol: "SILVER", dex: "xyz", decimals: 6, marketId: 10, category: "commodities", initialPrice: 69_000000n },
  { symbol: "BRENTOIL", dex: "xyz", decimals: 6, marketId: 11, category: "commodities", initialPrice: 86_000000n },
  { symbol: "EUR", dex: "xyz", decimals: 6, marketId: 12, category: "forex", initialPrice: 1_166000n },
];

function disc(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function symbolToBuffer(symbol) {
  const buf = Buffer.alloc(16);
  Buffer.from(symbol).copy(buf);
  return buf;
}

function dexToBuffer(dex) {
  const buf = Buffer.alloc(8);
  Buffer.from(dex).copy(buf);
  return buf;
}

function pricePda(symbol) {
  return PublicKey.findProgramAddressSync([Buffer.from("price"), symbolToBuffer(symbol)], PROGRAM_ID)[0];
}

function marketPda(marketId) {
  const id = Buffer.alloc(2);
  id.writeUInt16LE(marketId);
  return PublicKey.findProgramAddressSync([Buffer.from("market"), id], PROGRAM_ID)[0];
}

function feeAuthorityPda(market) {
  return PublicKey.findProgramAddressSync([Buffer.from("fee_authority"), market.toBuffer()], PROGRAM_ID)[0];
}

function protocolConfigPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("protocol_config")], PROGRAM_ID)[0];
}

async function loadKeypair(path) {
  const secret = JSON.parse(await readFile(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function loadOrCreateMintKeypair() {
  await mkdir(DEPLOYMENT_DIR, { recursive: true });
  try {
    return await loadKeypair(MINT_KEYPAIR_PATH);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const keypair = Keypair.generate();
  await writeFile(MINT_KEYPAIR_PATH, `${JSON.stringify(Array.from(keypair.secretKey))}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  return keypair;
}

async function sendTransaction(connection, transaction, signers) {
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = signers[0].publicKey;
  transaction.recentBlockhash = latest.blockhash;
  transaction.sign(...signers);
  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return signature;
}

async function getDelegationStatus(account) {
  const response = await fetch(ROUTER_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getDelegationStatus",
      params: [account.toBase58()],
    }),
  });
  const data = await response.json();
  const isDelegated = data?.result?.is_delegated ?? data?.result?.isDelegated ?? false;
  const validator = data?.result?.validator ? new PublicKey(data.result.validator) : null;
  return { isDelegated, validator };
}

async function getValidatorForRouter() {
  // Query router for any existing market or fetch live ER validator
  const m1 = marketPda(1);
  try {
    const status = await getDelegationStatus(m1);
    if (status.validator) return status.validator;
  } catch {}
  // Fetch live ER validator via getIdentity (devnet-as)
  try {
    const res = await fetch(ER_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getIdentity", params: [] }),
    });
    const body = await res.json();
    if (body.result?.identity) return new PublicKey(body.result.identity);
  } catch {}
  // Fallback to current MagicBlock devnet validator (was mrg1x..., now MAS1...)
  return new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");
}

async function main() {
  console.log("=== Bootstrapping Multi-Asset Prediction Market on Solana Devnet ===");
  const base = new Connection(BASE_RPC, "confirmed");
  const er = new Connection(ER_RPC, "confirmed");

  const adminPath = process.env.ANCHOR_WALLET ?? resolve(homedir(), ".config/solana/id.json");
  const admin = await loadKeypair(adminPath);
  const oraclePath = process.env.ORACLE_KEYPAIR_PATH ?? resolve("../oracle/oracle-keypair.json");
  const oracle = await loadKeypair(oraclePath);

  console.log(`Deployer Admin: ${admin.publicKey.toBase58()}`);
  console.log(`Oracle Authority: ${oracle.publicKey.toBase58()}`);
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);

  const mintKeypair = await loadOrCreateMintKeypair();
  let mintInfo = await base.getAccountInfo(mintKeypair.publicKey, "confirmed");
  if (!mintInfo) {
    await createMint(base, admin, admin.publicKey, null, 6, mintKeypair, { commitment: "confirmed" });
    console.log(`Created test USDC mint: ${mintKeypair.publicKey.toBase58()}`);
  } else {
    console.log(`Using existing test USDC mint: ${mintKeypair.publicKey.toBase58()}`);
  }
  const mint = mintKeypair.publicKey;

  // Setup Address Lookup Table (ALT) for session gasless transactions
  const [rentPda] = deriveRentPda();
  const [vault] = deriveVault(mint);
  const vaultAta = deriveVaultAta(mint, vault);

  let lookupTableAddress;
  try {
    const stored = JSON.parse(await readFile(LOOKUP_TABLE_PATH, "utf8"));
    lookupTableAddress = new PublicKey(stored.address);
  } catch {}

  if (!lookupTableAddress || !(await base.getAddressLookupTable(lookupTableAddress)).value) {
    const recentSlot = await base.getSlot("finalized");
    const [createIx, derivedTable] = AddressLookupTableProgram.createLookupTable({
      authority: admin.publicKey,
      payer: admin.publicKey,
      recentSlot,
    });
    const extendIx = AddressLookupTableProgram.extendLookupTable({
      payer: admin.publicKey,
      authority: admin.publicKey,
      lookupTable: derivedTable,
      addresses: [mint, rentPda, vault, vaultAta],
    });
    const tx = new Transaction().add(createIx, extendIx);
    const sig = await sendTransaction(base, tx, [admin]);
    lookupTableAddress = derivedTable;
    await writeFile(LOOKUP_TABLE_PATH, JSON.stringify({ address: lookupTableAddress.toBase58() }, null, 2));
    console.log(`Created session setup lookup table: ${lookupTableAddress.toBase58()} (sig: ${sig})`);
  } else {
    console.log(`Using existing session lookup table: ${lookupTableAddress.toBase58()}`);
  }

  // Initialize ProtocolConfig if missing
  const protocolConfig = protocolConfigPda();
  let protocolInfo = await base.getAccountInfo(protocolConfig, "confirmed");
  if (!protocolInfo) {
    const [programData] = PublicKey.findProgramAddressSync([PROGRAM_ID.toBuffer()], UPGRADEABLE_LOADER);
    const initData = disc("initialize_protocol_config");
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      data: initData,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: admin.publicKey, isSigner: false, isWritable: false },
        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: programData, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: protocolConfig, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
    });
    const sig = await sendTransaction(base, new Transaction().add(ix), [admin]);
    console.log(`Initialized ProtocolConfig: ${sig}`);
  } else {
    console.log(`ProtocolConfig already initialized: ${protocolConfig.toBase58()}`);
  }

  // Get validator
  let validator = await getValidatorForRouter();
  console.log(`Target ER Validator: ${validator.toBase58()}`);

  // Create deployer admin ATA for minting test tokens
  const adminAta = await getOrCreateAssociatedTokenAccount(base, admin, mint, admin.publicKey, false, "confirmed");
  const totalNeeded = 120_000_000_000n; // 120k USDC for 12 pools (10k each)
  if (adminAta.amount < totalNeeded) {
    await mintTo(base, admin, mint, adminAta.address, admin, totalNeeded - adminAta.amount, [], { commitment: "confirmed" });
    console.log(`Minted ${Number(totalNeeded - adminAta.amount) / 1_000_000} test USDC to admin ATA`);
  }

  // Initialize PriceAccounts & Markets for all 12 assets
  const manifestMarkets = [];

  for (const asset of ASSETS) {
    console.log(`\n--- Provisioning ${asset.symbol} (${asset.category}) | Market ${asset.marketId} ---`);
    const pPda = pricePda(asset.symbol);
    let pInfo = await base.getAccountInfo(pPda, "confirmed");
    if (!pInfo) {
      const symBuf = symbolToBuffer(asset.symbol);
      const dexBuf = dexToBuffer(asset.dex);
      const initPriceData = Buffer.concat([disc("initialize_price_account"), symBuf, dexBuf]);
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: initPriceData,
        keys: [
          { pubkey: oracle.publicKey, isSigner: true, isWritable: true },
          { pubkey: pPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      });
      const sig = await sendTransaction(base, new Transaction().add(ix), [admin, oracle]);
      console.log(`Initialized PriceAccount ${asset.symbol}: ${pPda.toBase58()} (sig: ${sig})`);
    } else {
      console.log(`PriceAccount ${asset.symbol} exists: ${pPda.toBase58()}`);
    }

    // Seed initial price via update_price — use ER if already delegated, else base
    const updData = Buffer.alloc(16);
    disc("update_price").copy(updData, 0);
    updData.writeBigUInt64LE(asset.initialPrice, 8);
    const updIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      data: updData,
      keys: [
        { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
        { pubkey: pPda, isSigner: false, isWritable: true },
      ],
    });
    // Check if price already delegated → send to ER, else base
    const priceIsDelegated = (await getDelegationStatus(pPda)).isDelegated;
    const updConn = priceIsDelegated ? er : base;
    try {
      await sendTransaction(updConn, new Transaction().add(updIx), priceIsDelegated ? [oracle] : [admin, oracle]);
      console.log(`Seeded price for ${asset.symbol} on ${priceIsDelegated ? "ER" : "base"}: ${Number(asset.initialPrice) / 1_000_000}`);
    } catch (e) {
      console.log(`Price seed note for ${asset.symbol}: ${e.message} (may already have price)`);
    }

    // Initialize Market (must be before delegating price, so price still owned by program)
    const mPda = marketPda(asset.marketId);
    const feeAuth = feeAuthorityPda(mPda);
    const poolTokenAccount = getAssociatedTokenAddressSync(mint, mPda, true);
    const feeTokenAccount = getAssociatedTokenAddressSync(mint, feeAuth, true);

    let mInfo = await base.getAccountInfo(mPda, "confirmed");
    if (!mInfo) {
      const initMarketData = Buffer.alloc(8 + 2 + 8 + 2 + 8);
      let off = 0;
      disc("initialize_market_with_price_account").copy(initMarketData, off); off += 8;
      initMarketData.writeUInt16LE(asset.marketId, off); off += 2;
      initMarketData.writeBigUInt64LE(0n, off); off += 8; // sponsor lamports
      initMarketData.writeUInt16LE(19000, off); off += 2; // payout_bps (1.9x)
      initMarketData.writeBigUInt64LE(10_000_000_000n, off); // max_open_exposure (10k USDC)

      const initMarketIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: initMarketData,
        keys: [
          { pubkey: admin.publicKey, isSigner: true, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: protocolConfig, isSigner: false, isWritable: false },
          { pubkey: pPda, isSigner: false, isWritable: false },
          { pubkey: mPda, isSigner: false, isWritable: true },
          { pubkey: poolTokenAccount, isSigner: false, isWritable: true },
          { pubkey: feeAuth, isSigner: false, isWritable: false },
          { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      });

      try {
        const sig = await sendTransaction(base, new Transaction().add(initMarketIx), [admin]);
        console.log(`Initialized Market ${asset.marketId} (${asset.symbol}): ${mPda.toBase58()} (sig: ${sig})`);
      } catch (e) {
        console.log(`Market init note for ${asset.symbol}: ${e.message} (will try to continue)`);
        // If price is delegated, try to create market on ER instead or skip
        const mInfoCheck = await base.getAccountInfo(mPda, "confirmed");
        if (!mInfoCheck) {
          console.log(`  Market ${asset.symbol} still missing, will be retried next run`);
          continue;
        } else {
          console.log(`  Market ${asset.symbol} exists despite error, continuing`);
        }
      }
    } else {
      console.log(`Market ${asset.marketId} (${asset.symbol}) exists: ${mPda.toBase58()}`);
    }

    // Delegate PriceAccount to ER (after market init, so price still on base)
    const priceDelStatus = await getDelegationStatus(pPda);
    if (!priceDelStatus.isDelegated) {
      const symBuf = symbolToBuffer(asset.symbol);
      const delPriceData = Buffer.concat([disc("delegate_price_account"), symBuf, validator.toBuffer()]);
      const delPriceIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: delPriceData,
        keys: [
          { pubkey: admin.publicKey, isSigner: true, isWritable: true },
          { pubkey: protocolConfig, isSigner: false, isWritable: false },
          { pubkey: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(pPda, PROGRAM_ID), isSigner: false, isWritable: true },
          { pubkey: delegationRecordPdaFromDelegatedAccount(pPda), isSigner: false, isWritable: true },
          { pubkey: delegationMetadataPdaFromDelegatedAccount(pPda), isSigner: false, isWritable: true },
          { pubkey: pPda, isSigner: false, isWritable: true },
          { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      });
      try {
        const sig = await sendTransaction(base, new Transaction().add(delPriceIx), [admin]);
        console.log(`Delegated PriceAccount ${asset.symbol} to ER validator: ${sig}`);
      } catch (e) {
        console.log(`PriceAccount delegation note: ${e.message}`);
      }
    } else {
      console.log(`PriceAccount ${asset.symbol} is already delegated to ER`);
    }

    // Delegate Market to ER
    const marketDelStatus = await getDelegationStatus(mPda);
    if (!marketDelStatus.isDelegated) {
      const delMarketData = Buffer.alloc(8 + 2 + 32);
      disc("delegate_market").copy(delMarketData, 0);
      delMarketData.writeUInt16LE(asset.marketId, 8);
      validator.toBuffer().copy(delMarketData, 10);

      const delMarketIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: delMarketData,
        keys: [
          { pubkey: admin.publicKey, isSigner: true, isWritable: true },
          { pubkey: protocolConfig, isSigner: false, isWritable: false },
          { pubkey: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(mPda, PROGRAM_ID), isSigner: false, isWritable: true },
          { pubkey: delegationRecordPdaFromDelegatedAccount(mPda), isSigner: false, isWritable: true },
          { pubkey: delegationMetadataPdaFromDelegatedAccount(mPda), isSigner: false, isWritable: true },
          { pubkey: mPda, isSigner: false, isWritable: true },
          { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      });

      try {
        const sig = await sendTransaction(base, new Transaction().add(delMarketIx), [admin]);
        console.log(`Delegated Market ${asset.marketId} (${asset.symbol}) to ER validator: ${sig}`);
      } catch (e) {
        console.log(`Market delegation note: ${e.message}`);
      }
    } else {
      console.log(`Market ${asset.marketId} is already delegated to ER`);
    }

    manifestMarkets.push({
      symbol: asset.symbol,
      name: asset.name,
      dex: asset.dex,
      category: asset.category,
      marketId: asset.marketId,
      marketPda: mPda.toBase58(),
      pricePda: pPda.toBase58(),
      poolTokenAccount: poolTokenAccount.toBase58(),
    });
  }

  // Save manifest
  const manifest = {
    programId: PROGRAM_ID.toBase58(),
    collateralMint: mint.toBase58(),
    protocolConfig: protocolConfig.toBase58(),
    sessionLookupTable: lookupTableAddress.toBase58(),
    validator: validator.toBase58(),
    markets: manifestMarkets,
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nMulti-asset manifest saved to: ${MANIFEST_PATH}`);
  console.log("=== Devnet Bootstrap Complete! ===");
}

main().catch((err) => {
  console.error("Bootstrap error:", err);
  process.exit(1);
});
