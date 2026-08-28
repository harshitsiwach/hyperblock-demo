import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("CPUwSRL2h3mh27GutZ3k6hcHt4swrV1NcQAUuLQUbQYX");
const BASE_RPC = "https://rpc.magicblock.app/devnet";
const ER_RPC = "https://devnet-as.magicblock.app";
const mintPath = resolve("/Users/0xugly/Desktop/lev_trader/leveraged-prediction/.devnet/multi-asset-manifest.json");
const idlPath = resolve("/Users/0xugly/Desktop/lev_trader/leveraged-prediction/services/indexer/idl/leveraged_prediction.json");

async function loadKp(p) {
  const j = JSON.parse(await readFile(p, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(j));
}
const admin = await loadKp(resolve(homedir(), ".config/solana/id.json"));
const base = new Connection(BASE_RPC, "confirmed");
const er = new Connection(ER_RPC, "confirmed");
const idl = JSON.parse(await readFile(idlPath, "utf8"));
const erProvider = new anchor.AnchorProvider(er, new anchor.Wallet(admin), {commitment:"confirmed"});
const erProgram = new anchor.Program(idl, erProvider);
const manifest = JSON.parse(await readFile(mintPath, "utf8"));
const mint = new PublicKey(manifest.collateralMint);
const protocolConfig = new PublicKey(manifest.protocolConfig);
const marketId = 9; // GOLD
const market = new PublicKey(manifest.markets.find(m=>m.marketId===marketId).marketPda);
const poolTokenAccount = new PublicKey(manifest.markets.find(m=>m.marketId===marketId).poolTokenAccount);
const userLiquidity = PublicKey.findProgramAddressSync([Buffer.from("user_liquidity"), admin.publicKey.toBuffer()], PROGRAM_ID)[0];
console.log("market", market.toBase58(), "pool", poolTokenAccount.toBase58(), "mint", mint.toBase58());
const baseInfo = await base.getAccountInfo(market);
console.log("base market owner", baseInfo?.owner.toBase58());
const erInfo = await er.getAccountInfo(market);
console.log("er market owner", erInfo?.owner.toBase58(), "len", erInfo?.data.length);

// Check admin ATA
import { getAssociatedTokenAddressSync as g } from "@solana/spl-token";
const adminAta = await getOrCreateAssociatedTokenAccount(base, admin, mint, admin.publicKey, false, "confirmed");
console.log("adminAta", adminAta.address.toBase58(), "amount", adminAta.amount.toString());
// Ensure admin has enough on ER
const erAdminAtaBal = await er.getTokenAccountBalance(adminAta.address).catch(e=>null);
console.log("er admin bal", erAdminAtaBal?.value.amount);

// Deposit 10k
const amount = 10_000_000_000n; // 10k USDC
try {
  const sig = await erProgram.methods.depositLiquidity(new anchor.BN(amount.toString()), new anchor.BN(0)).accountsPartial({
    user: admin.publicKey,
    protocolConfig,
    market,
    userLiquidity,
    poolTokenAccount,
    userTokenAccount: adminAta.address,
    collateralMint: mint,
    tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  }).rpc();
  console.log("deposited GOLD", sig);
} catch(e) {
  console.error("deposit failed", e);
  if (e.logs) console.log(e.logs.join("\n"));
  if (e.error) console.log(JSON.stringify(e.error, null, 2));
}
const poolBal = await er.getTokenAccountBalance(poolTokenAccount).catch(e=>null);
console.log("pool after", poolBal?.value.amount);
