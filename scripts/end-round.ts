/**
 * End the current round: commit canvas from ER, then end round on L1.
 * Usage: NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/end-round.ts
 */
import { PublicKey, Connection, Keypair, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/pixel_wars.json"), "utf-8")
);
const PROGRAM_ID = new PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");
const MAGIC_CONTEXT = new PublicKey("MagicContext1111111111111111111111111111111");
const MAGIC_PROGRAM = new PublicKey("Magic11111111111111111111111111111111111111");

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

const findConfigPDA = () => PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
const findCanvasPDA = (r: number) => PublicKey.findProgramAddressSync([Buffer.from("canvas"), toLeU32(r)], PROGRAM_ID);
const findRoundPDA = (r: number) => PublicKey.findProgramAddressSync([Buffer.from("round"), toLeU32(r)], PROGRAM_ID);

function getDisc(name: string): Buffer {
  const ix = IDL.instructions.find((i: any) => i.name === name);
  if (!ix) throw new Error(`Instruction ${name} not found in IDL`);
  return Buffer.from(ix.discriminator);
}

async function main() {
  const erConn = new Connection("https://devnet.magicblock.app", "confirmed");
  const l1Conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(path.join(process.env.HOME!, ".config/solana/id.json"), "utf-8")))
  );

  const [configPDA] = findConfigPDA();
  const configInfo = await l1Conn.getAccountInfo(configPDA);
  if (!configInfo) throw new Error("Config not found");
  const view = new DataView(configInfo.data.buffer, configInfo.data.byteOffset);
  const currentRound = view.getUint32(40, true);
  const active = configInfo.data[44] === 1;
  console.log(`Current round: ${currentRound}, active: ${active}`);

  if (!active) {
    console.log("Round not active, nothing to end.");
    return;
  }

  const [canvasPDA] = findCanvasPDA(currentRound);
  const [roundPDA] = findRoundPDA(currentRound);

  // Step 1: Commit canvas from ER
  console.log("\n--- Step 1: Commit canvas from ER ---");
  const commitDisc = getDisc("commit_canvas");
  console.log("commit_canvas disc:", Array.from(commitDisc));

  const commitKeys = [
    { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
    { pubkey: canvasPDA, isSigner: false, isWritable: true },
    { pubkey: MAGIC_CONTEXT, isSigner: false, isWritable: true },
    { pubkey: MAGIC_PROGRAM, isSigner: false, isWritable: false },
  ];

  const commitIx = new TransactionInstruction({ programId: PROGRAM_ID, keys: commitKeys, data: commitDisc });
  const commitTx = new Transaction().add(commitIx);
  commitTx.feePayer = keypair.publicKey;
  commitTx.recentBlockhash = (await erConn.getLatestBlockhash()).blockhash;
  commitTx.sign(keypair);

  // Send directly (skip preflight — MagicProgram placeholder fails simulation but works at runtime)
  const sig = await erConn.sendRawTransaction(commitTx.serialize(), { skipPreflight: true });
  console.log("Sent commit TX:", sig);
  const conf = await erConn.confirmTransaction(sig, "confirmed");
  console.log("Confirmed:", JSON.stringify(conf.value));

  if (conf.value.err) {
    console.log("Commit TX failed on ER. Cannot proceed.");
    return;
  }

  console.log("Canvas committed!");

  // Wait for L1 to receive the undelegated canvas
  console.log("Waiting for L1 sync...");
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const info = await l1Conn.getAccountInfo(canvasPDA);
    if (info && info.owner.toBase58() === PROGRAM_ID.toBase58()) {
      console.log("Canvas back on L1! Owner:", info.owner.toBase58());
      break;
    }
    console.log(`  Waiting... (${(i + 1) * 3}s) owner: ${info?.owner?.toBase58()}`);
  }

  // Step 2: End round on L1
  console.log("\n--- Step 2: End round on L1 ---");
  const endDisc = getDisc("end_round");
  console.log("end_round disc:", Array.from(endDisc));

  const endKeys = [
    { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPDA, isSigner: false, isWritable: true },
    { pubkey: canvasPDA, isSigner: false, isWritable: true },
    { pubkey: roundPDA, isSigner: false, isWritable: true },
  ];

  const endIx = new TransactionInstruction({ programId: PROGRAM_ID, keys: endKeys, data: endDisc });
  const endTx = new Transaction().add(endIx);
  endTx.feePayer = keypair.publicKey;
  endTx.recentBlockhash = (await l1Conn.getLatestBlockhash()).blockhash;
  endTx.sign(keypair);

  const simEnd = await l1Conn.simulateTransaction(endTx);
  console.log("Simulate err:", simEnd.value.err);
  console.log("Simulate logs:", simEnd.value.logs);

  if (!simEnd.value.err) {
    const sig = await l1Conn.sendRawTransaction(endTx.serialize());
    await l1Conn.confirmTransaction(sig, "confirmed");
    console.log("Round ended on L1! TX:", sig);
  } else {
    console.log("End round simulation failed.");
  }

  // Verify
  const newConfig = await l1Conn.getAccountInfo(configPDA);
  if (newConfig) {
    const v2 = new DataView(newConfig.data.buffer, newConfig.data.byteOffset);
    console.log(`\nFinal L1 config: round=${v2.getUint32(40, true)}, active=${newConfig.data[44] === 1}`);
  }
}

main().catch((e) => console.error("FATAL:", e.message));
