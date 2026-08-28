import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import * as anchor from "@coral-xyz/anchor";

const PROGRAM_ID = new PublicKey("CPUwSRL2h3mh27GutZ3k6hcHt4swrV1NcQAUuLQUbQYX");
const BASE_RPC = "https://rpc.magicblock.app/devnet";
const ER_RPC = "https://devnet-as.magicblock.app";
const MARKET_ID = 1;

async function loadKp(p) {
  const j = JSON.parse(await readFile(p, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(j));
}
const admin = await loadKp(resolve(homedir(), ".config/solana/id.json"));
const base = new Connection(BASE_RPC, "confirmed");

const idRes = await fetch(ER_RPC, {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({jsonrpc:"2.0",id:1,method:"getIdentity",params:[]})});
const j = await idRes.json();
console.log("ER identity", j.result.identity);
const validator = new PublicKey(j.result.identity);
console.log("validator", validator.toBase58());

const idlPath = resolve("/Users/0xugly/Desktop/lev_trader/leveraged-prediction/services/indexer/idl/leveraged_prediction.json");
const idl = JSON.parse(await readFile(idlPath, "utf8"));
console.log("IDL program", idl.address);
const provider = new anchor.AnchorProvider(base, new anchor.Wallet(admin), {commitment:"confirmed"});
const program = new anchor.Program(idl, provider);
const marketIdBuf = Buffer.alloc(2); marketIdBuf.writeUInt16LE(MARKET_ID);
const [market] = PublicKey.findProgramAddressSync([Buffer.from("market"), marketIdBuf], PROGRAM_ID);
console.log("market", market.toBase58());
const protocolConfig = PublicKey.findProgramAddressSync([Buffer.from("protocol_config")], PROGRAM_ID)[0];
console.log("protocolConfig", protocolConfig.toBase58());
try {
  const sig = await program.methods.delegateMarket(MARKET_ID, validator).accountsPartial({payer: admin.publicKey, protocolConfig, market}).rpc();
  console.log("delegated", sig);
} catch(e) {
  console.error("delegate failed", e);
  if (e.logs) console.log(e.logs.join("\n"));
}
