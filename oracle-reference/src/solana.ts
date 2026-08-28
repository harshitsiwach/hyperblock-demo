import { createHash } from "crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { readFileSync } from "fs";

export const PROGRAM_ID = new PublicKey("CPUwSRL2h3mh27GutZ3k6hcHt4swrV1NcQAUuLQUbQYX");
export const PRICE_SEED = Buffer.from("price");

function discriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

const UPDATE_PRICE_DISC = discriminator("update_price");
const INITIALIZE_PRICE_DISC = discriminator("initialize_price_account");

export function priceAccountPda(assetSymbol: string, programId = PROGRAM_ID): PublicKey {
  const symbolBuf = Buffer.alloc(16);
  Buffer.from(assetSymbol).copy(symbolBuf);
  const [pda] = PublicKey.findProgramAddressSync(
    [PRICE_SEED, symbolBuf],
    programId,
  );
  return pda;
}

export function updatePriceIx(
  authority: PublicKey,
  priceAccount: PublicKey,
  priceU64: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(8 + 8);
  UPDATE_PRICE_DISC.copy(data, 0);
  data.writeBigUInt64LE(priceU64, 8);
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: priceAccount, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

export function initializePriceAccountIx(
  authority: PublicKey,
  priceAccount: PublicKey,
  assetSymbol: string,
  dex: string,
): TransactionInstruction {
  const symbolBuf = Buffer.alloc(16);
  Buffer.from(assetSymbol).copy(symbolBuf);
  const dexBuf = Buffer.alloc(8);
  Buffer.from(dex).copy(dexBuf);
  const data = Buffer.alloc(8 + 16 + 8);
  INITIALIZE_PRICE_DISC.copy(data, 0);
  symbolBuf.copy(data, 8);
  dexBuf.copy(data, 24);
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: priceAccount, isSigner: false, isWritable: true },
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// System program is always 111... need to pass correctly; we use placeholder above and let caller set.
// Better to build full.

export function loadKeypair(path: string): Keypair {
  const raw = readFileSync(path, "utf8");
  const arr = JSON.parse(raw);
  const secret = Uint8Array.from(arr as number[]);
  return Keypair.fromSecretKey(secret);
}

export async function sendUpdatePrice(
  connection: Connection,
  payer: Keypair,
  priceAccount: PublicKey,
  priceU64: bigint,
): Promise<string> {
  const ix = updatePriceIx(payer.publicKey, priceAccount, priceU64);
  const tx = new Transaction().add(ix);
  const { blockhash } = await connection.getLatestBlockhash("processed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
  });
  return sig;
}
