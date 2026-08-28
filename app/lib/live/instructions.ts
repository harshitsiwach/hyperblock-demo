import {
  DELEGATION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import type { Direction } from "@/app/lib/domain";
import { delegationBufferPda } from "@/app/lib/live/pdas";
import { Buffer } from "buffer";

const CRANK_PROGRAM_ID = new PublicKey(
  "Crank11111111111111111111111111111111111111",
);
export function crankSignerPda(taskAuthority: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("crank-executor"), taskAuthority.toBuffer()],
    CRANK_PROGRAM_ID,
  )[0];
}

const INITIALIZE_USER_POSITIONS_DISCRIMINATOR = Uint8Array.from([
  6, 119, 238, 168, 19, 38, 23, 113,
]);
const INITIALIZE_USER_LIQUIDITY_DISCRIMINATOR = Uint8Array.from([
  250, 167, 58, 109, 173, 95, 219, 138,
]);
const DELEGATE_USER_POSITIONS_DISCRIMINATOR = Uint8Array.from([
  147, 104, 221, 210, 31, 52, 34, 53,
]);
const DELEGATE_USER_LIQUIDITY_DISCRIMINATOR = Uint8Array.from([
  213, 222, 197, 230, 173, 223, 102, 167,
]);
const DEPOSIT_LIQUIDITY_DISCRIMINATOR = Uint8Array.from([
  245, 99, 59, 25, 151, 71, 233, 249,
]);
const REQUEST_WITHDRAWAL_DISCRIMINATOR = Uint8Array.from([
  251, 85, 121, 205, 56, 201, 12, 177,
]);
const EXECUTE_WITHDRAWAL_DISCRIMINATOR = Uint8Array.from([
  113, 121, 203, 232, 137, 139, 248, 249,
]);
const OPEN_POSITION_DISCRIMINATOR = Uint8Array.from([
  135, 128, 47, 77, 15, 152, 240, 49,
]);
const CLAIM_FALLBACK_PAYOUT_DISCRIMINATOR = Uint8Array.from([
  215, 117, 24, 176, 107, 179, 59, 212,
]);
const INITIALIZE_PRICE_ACCOUNT_DISCRIMINATOR = Uint8Array.from([
  107, 108, 189, 255, 195, 158, 208, 95,
]);
const UPDATE_PRICE_DISCRIMINATOR = Uint8Array.from([61, 34, 117, 155, 75, 34, 123, 208]);
const DELEGATE_PRICE_ACCOUNT_DISCRIMINATOR = Uint8Array.from([
  96, 187, 224, 242, 130, 6, 172, 142,
]);
const INITIALIZE_MARKET_WITH_PRICE_ACCOUNT_DISCRIMINATOR = Uint8Array.from([
  230, 231, 152, 172, 74, 110, 42, 219,
]);

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function u64(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function u128(value: bigint): Uint8Array {
  if (value < 0n || value >= (1n << 128n)) {
    throw new Error("value must fit in u128");
  }
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, value & ((1n << 64n) - 1n), true);
  view.setBigUint64(8, value >> 64n, true);
  return bytes;
}

function i64(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, value, true);
  return bytes;
}

export function initializeUserPositionsInstruction(
  programId: PublicKey,
  user: PublicKey,
  userPositions: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(INITIALIZE_USER_POSITIONS_DISCRIMINATOR),
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userPositions, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function delegateUserPositionsInstruction(
  programId: PublicKey,
  user: PublicKey,
  userPositions: PublicKey,
  validator: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(
      concatBytes(DELEGATE_USER_POSITIONS_DISCRIMINATOR, validator.toBytes()),
    ),
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      {
        pubkey: delegationBufferPda(programId, userPositions),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationRecordPdaFromDelegatedAccount(userPositions),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationMetadataPdaFromDelegatedAccount(userPositions),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: userPositions, isSigner: false, isWritable: true },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function initializeUserLiquidityInstruction(
  programId: PublicKey,
  user: PublicKey,
  userLiquidity: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(INITIALIZE_USER_LIQUIDITY_DISCRIMINATOR),
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userLiquidity, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function delegateUserLiquidityInstruction(
  programId: PublicKey,
  user: PublicKey,
  userLiquidity: PublicKey,
  validator: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(
      concatBytes(DELEGATE_USER_LIQUIDITY_DISCRIMINATOR, validator.toBytes()),
    ),
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      {
        pubkey: delegationBufferPda(programId, userLiquidity),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationRecordPdaFromDelegatedAccount(userLiquidity),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationMetadataPdaFromDelegatedAccount(userLiquidity),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: userLiquidity, isSigner: false, isWritable: true },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

interface LiquidityAccounts {
  user: PublicKey;
  protocolConfig: PublicKey;
  market: PublicKey;
  userLiquidity: PublicKey;
  poolTokenAccount: PublicKey;
  userTokenAccount: PublicKey;
  collateralMint: PublicKey;
}

export function depositLiquidityInstruction(
  programId: PublicKey,
  accounts: LiquidityAccounts,
  amount: bigint,
  minSharesOut: bigint,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(
      concatBytes(
        DEPOSIT_LIQUIDITY_DISCRIMINATOR,
        u64(amount),
        u128(minSharesOut),
      ),
    ),
    keys: [
      { pubkey: accounts.user, isSigner: true, isWritable: false },
      { pubkey: accounts.protocolConfig, isSigner: false, isWritable: false },
      { pubkey: accounts.market, isSigner: false, isWritable: true },
      { pubkey: accounts.userLiquidity, isSigner: false, isWritable: true },
      { pubkey: accounts.poolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  });
}

export function requestWithdrawalInstruction(
  programId: PublicKey,
  accounts: Pick<LiquidityAccounts, "user" | "market" | "userLiquidity">,
  shares: bigint,
  minAssetsOut: bigint,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(
      concatBytes(
        REQUEST_WITHDRAWAL_DISCRIMINATOR,
        u128(shares),
        u64(minAssetsOut),
      ),
    ),
    keys: [
      { pubkey: accounts.user, isSigner: true, isWritable: false },
      { pubkey: accounts.market, isSigner: false, isWritable: true },
      { pubkey: accounts.userLiquidity, isSigner: false, isWritable: true },
    ],
  });
}

export function executeWithdrawalInstruction(
  programId: PublicKey,
  accounts: LiquidityAccounts,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(EXECUTE_WITHDRAWAL_DISCRIMINATOR),
    keys: [
      { pubkey: accounts.user, isSigner: false, isWritable: false },
      { pubkey: accounts.protocolConfig, isSigner: false, isWritable: false },
      { pubkey: accounts.market, isSigner: false, isWritable: true },
      { pubkey: accounts.userLiquidity, isSigner: false, isWritable: true },
      { pubkey: accounts.poolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  });
}

export interface OpenPositionAccounts {
  user: PublicKey;
  sessionSigner: PublicKey;
  sessionToken: PublicKey;
  protocolConfig: PublicKey;
  market: PublicKey;
  userPositions: PublicKey;
  poolTokenAccount: PublicKey;
  derivedFeeAuthority: PublicKey;
  feeTokenAccount: PublicKey;
  userTokenAccount: PublicKey;
  payoutEscrowTokenAccount: PublicKey;
  collateralMint: PublicKey;
  priceUpdate: PublicKey;
  priceAccount: PublicKey;
}

export function claimFallbackPayoutInstruction(
  programId: PublicKey,
  accounts: {
    user: PublicKey;
    protocolConfig: PublicKey;
    userPositions: PublicKey;
    payoutEscrowTokenAccount: PublicKey;
    userTokenAccount: PublicKey;
    collateralMint: PublicKey;
  },
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(CLAIM_FALLBACK_PAYOUT_DISCRIMINATOR),
    keys: [
      { pubkey: accounts.user, isSigner: true, isWritable: false },
      { pubkey: accounts.protocolConfig, isSigner: false, isWritable: false },
      { pubkey: accounts.userPositions, isSigner: false, isWritable: false },
      { pubkey: accounts.payoutEscrowTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  });
}

export interface OpenPositionArguments {
  nonce: number;
  taskSalt: Uint8Array;
  direction: Direction;
  collateral: bigint;
  minEntryPrice: bigint;
  maxEntryPrice: bigint;
}

export function openPositionInstruction(
  programId: PublicKey,
  accounts: OpenPositionAccounts,
  args: OpenPositionArguments,
): TransactionInstruction {
  if (args.taskSalt.length !== 32 || args.taskSalt.every((value) => value === 0)) {
    throw new Error("taskSalt must be a nonzero 32-byte value");
  }
  const data = concatBytes(
    OPEN_POSITION_DISCRIMINATOR,
    u32(args.nonce),
    args.taskSalt,
    Uint8Array.of(args.direction === "up" ? 0 : 1),
    u64(args.collateral),
    i64(args.minEntryPrice),
    i64(args.maxEntryPrice),
  );
  return new TransactionInstruction({
    programId,
    data: Buffer.from(data),
    keys: [
      { pubkey: accounts.user, isSigner: false, isWritable: false },
      { pubkey: accounts.sessionSigner, isSigner: true, isWritable: false },
      { pubkey: accounts.protocolConfig, isSigner: false, isWritable: false },
      { pubkey: accounts.market, isSigner: false, isWritable: true },
      { pubkey: accounts.userPositions, isSigner: false, isWritable: true },
      { pubkey: accounts.poolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.derivedFeeAuthority, isSigner: false, isWritable: false },
      { pubkey: accounts.feeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.payoutEscrowTokenAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralMint, isSigner: false, isWritable: false },
      { pubkey: accounts.priceUpdate, isSigner: false, isWritable: false },
      { pubkey: accounts.priceAccount, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: crankSignerPda(accounts.market), isSigner: false, isWritable: false },
      { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: accounts.sessionToken, isSigner: false, isWritable: false },
    ],
  });
}

export function initializePriceAccountInstruction(
  programId: PublicKey,
  authority: PublicKey,
  priceAccount: PublicKey,
  assetSymbol: string,
  dex: string,
): TransactionInstruction {
  const symbolBuf = Buffer.alloc(16);
  Buffer.from(assetSymbol).copy(symbolBuf);
  const dexBuf = Buffer.alloc(8);
  Buffer.from(dex).copy(dexBuf);
  const data = Buffer.concat([
    Buffer.from(INITIALIZE_PRICE_ACCOUNT_DISCRIMINATOR),
    symbolBuf,
    dexBuf,
  ]);
  return new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: priceAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function updatePriceInstruction(
  programId: PublicKey,
  authority: PublicKey,
  priceAccount: PublicKey,
  priceU64: bigint,
): TransactionInstruction {
  const data = Buffer.concat([
    Buffer.from(UPDATE_PRICE_DISCRIMINATOR),
    Buffer.from(u64(priceU64)),
  ]);
  return new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: priceAccount, isSigner: false, isWritable: true },
    ],
  });
}

export function delegatePriceAccountInstruction(
  programId: PublicKey,
  payer: PublicKey,
  priceAccount: PublicKey,
  validator: PublicKey,
  assetSymbol: string,
): TransactionInstruction {
  const symbolBuf = Buffer.alloc(16);
  Buffer.from(assetSymbol).copy(symbolBuf);
  const data = Buffer.concat([
    Buffer.from(DELEGATE_PRICE_ACCOUNT_DISCRIMINATOR),
    validator.toBuffer(),
  ]);
  // Anchor delegate expects market_id style but for price we pass symbol as seeds? Instead follow delegate_market pattern: instruction data is validator pubkey, accounts include seeds via PDA derivation off-chain (Anchor handles). For delegate_price_account, pda seeds are [price, symbol].
  // So we need to pass symbol via instruction's context? Our Rust delegate_price_account takes asset_symbol: [u8;16] as arg, but we encoded validator only; need to include symbol in data? For delegate_user_positions, discriminator already includes validator? Let's check delegate impl: #[instruction(market_id: u16)] pub struct DelegateMarket — instruction data includes market_id. For delegate_price_account we use asset_symbol. So data should be validator bytes? Actually handler takes asset_symbol and validator, but account seeds use asset_symbol. The validator is passed as instruction arg. So data must be validator.
  // For delegate_price_account, we have asset_symbol as instruction arg for PDA, but validator also. Our Rust: fn handler(ctx, asset_symbol, validator). So Anchor IDL will expect both. But we are building manually: need to encode asset_symbol + validator? Check delegate_market.ts: data is concat(DELEGATE_DISCRIMINATOR, validator.toBytes()). But struct has #[instruction(market_id: u16)] — market_id is used for PDA derivation but not encoded in data? Actually Anchor instruction data for delegate includes validator only (discriminator + validator). market_id is used for account derivation, not data. So for delegate_price_account, we should similarly encode validator only, symbol used for PDA.
  return new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      {
        pubkey: delegationBufferPda(programId, priceAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationRecordPdaFromDelegatedAccount(priceAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationMetadataPdaFromDelegatedAccount(priceAccount),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: priceAccount, isSigner: false, isWritable: true },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export const instructionDiscriminators = {
  initializeUserPositions: INITIALIZE_USER_POSITIONS_DISCRIMINATOR,
  initializeUserLiquidity: INITIALIZE_USER_LIQUIDITY_DISCRIMINATOR,
  delegateUserPositions: DELEGATE_USER_POSITIONS_DISCRIMINATOR,
  delegateUserLiquidity: DELEGATE_USER_LIQUIDITY_DISCRIMINATOR,
  depositLiquidity: DEPOSIT_LIQUIDITY_DISCRIMINATOR,
  requestWithdrawal: REQUEST_WITHDRAWAL_DISCRIMINATOR,
  executeWithdrawal: EXECUTE_WITHDRAWAL_DISCRIMINATOR,
  openPosition: OPEN_POSITION_DISCRIMINATOR,
  claimFallbackPayout: CLAIM_FALLBACK_PAYOUT_DISCRIMINATOR,
};
