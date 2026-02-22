/**
 * Game Orchestrator — Start round, run agents, auto-end after timeout.
 * Usage: NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/run-game.ts [duration_seconds]
 * Default: 180 seconds (3 minutes)
 */
import { PublicKey, SystemProgram, Connection, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/pixel_wars.json"), "utf-8")
);
const PROGRAM_ID = new PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");
const VALIDATOR = new PublicKey("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd");
const MAGIC_CONTEXT = new PublicKey("MagicContext1111111111111111111111111111111");
const MAGIC_PROGRAM = new PublicKey("Magic11111111111111111111111111111111111111");
const DELEGATION_PROGRAM = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

const DURATION = parseInt(process.argv[2] || "180", 10);

function toLeU32(n: number): Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function getDisc(name: string): Buffer {
  return Buffer.from(IDL.instructions.find((i: any) => i.name === name).discriminator);
}

const findConfigPDA = () => PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
const findCanvasPDA = (r: number) => PublicKey.findProgramAddressSync([Buffer.from("canvas"), toLeU32(r)], PROGRAM_ID);
const findRoundPDA = (r: number) => PublicKey.findProgramAddressSync([Buffer.from("round"), toLeU32(r)], PROGRAM_ID);

async function sendIx(conn: Connection, kp: Keypair, programId: PublicKey, keys: any[], data: Buffer) {
  const ix = new TransactionInstruction({ programId, keys, data });
  const tx = new Transaction().add(ix);
  tx.feePayer = kp.publicKey;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  tx.sign(kp);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

function spawnAgent(name: string): ChildProcess {
  const proc = spawn("npx", ["tsx", path.join(__dirname, `../agents/${name}-agent.ts`)], {
    env: { ...process.env, NODE_OPTIONS: "--dns-result-order=ipv4first" },
    stdio: "pipe",
  });
  proc.stdout?.on("data", (d) => process.stdout.write(d));
  proc.stderr?.on("data", (d) => process.stderr.write(d));
  proc.on("exit", (code) => console.log(`[${name}] Agent exited (code ${code})`));
  return proc;
}

async function main() {
  const l1 = new Connection("https://api.devnet.solana.com", "confirmed");
  const er = new Connection("https://devnet-us.magicblock.app", "confirmed");
  const kp = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(path.join(process.env.HOME!, ".config/solana/id.json"), "utf-8")))
  );
  const [configPDA] = findConfigPDA();

  // ─── End current round if active ───
  const configInfo = await l1.getAccountInfo(configPDA);
  if (!configInfo) throw new Error("Config not found");
  const view = new DataView(configInfo.data.buffer, configInfo.data.byteOffset);
  let currentRound = view.getUint32(40, true);
  let active = configInfo.data[44] === 1;
  console.log(`Current: round=${currentRound}, active=${active}`);

  if (active) {
    console.log(`Ending round ${currentRound}...`);
    const [canvasPDA] = findCanvasPDA(currentRound);
    const [roundPDA] = findRoundPDA(currentRound);
    const canvasInfo = await l1.getAccountInfo(canvasPDA);
    const isDelegated = canvasInfo?.owner.toBase58() === DELEGATION_PROGRAM.toBase58();

    if (isDelegated) {
      try {
        await sendIx(er, kp, PROGRAM_ID, [
          { pubkey: kp.publicKey, isSigner: true, isWritable: true },
          { pubkey: canvasPDA, isSigner: false, isWritable: true },
          { pubkey: MAGIC_CONTEXT, isSigner: false, isWritable: true },
          { pubkey: MAGIC_PROGRAM, isSigner: false, isWritable: false },
        ], getDisc("commit_canvas"));
        console.log("Canvas committed, waiting for L1...");
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const info = await l1.getAccountInfo(canvasPDA);
          if (info?.owner.toBase58() === PROGRAM_ID.toBase58()) { console.log("Canvas back!"); break; }
        }
      } catch { console.log("Commit failed, ending with delegated canvas..."); }
    }

    const stillDelegated = (await l1.getAccountInfo(canvasPDA))?.owner.toBase58() === DELEGATION_PROGRAM.toBase58();
    await sendIx(l1, kp, PROGRAM_ID, [
      { pubkey: kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: canvasPDA, isSigner: false, isWritable: !stillDelegated },
      { pubkey: roundPDA, isSigner: false, isWritable: true },
    ], getDisc("end_round"));
    console.log("Round ended!");
    await new Promise(r => setTimeout(r, 2000));
    const c2 = await l1.getAccountInfo(configPDA);
    if (c2) currentRound = new DataView(c2.data.buffer, c2.data.byteOffset).getUint32(40, true);
  }

  // ─── Start new round ───
  const nextRound = currentRound + 1;
  const [canvasPDA] = findCanvasPDA(nextRound);
  const [roundPDA] = findRoundPDA(nextRound);

  console.log(`\nStarting round ${nextRound}...`);
  await sendIx(l1, kp, PROGRAM_ID, [
    { pubkey: kp.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPDA, isSigner: false, isWritable: true },
    { pubkey: canvasPDA, isSigner: false, isWritable: true },
    { pubkey: roundPDA, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], getDisc("start_round"));
  console.log("Round created!");

  // ─── Delegate canvas ───
  console.log("Delegating canvas...");
  const [bufferPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), canvasPDA.toBuffer()], PROGRAM_ID
  );
  const [delegationRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), canvasPDA.toBuffer()], DELEGATION_PROGRAM
  );
  const [delegationMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation-metadata"), canvasPDA.toBuffer()], DELEGATION_PROGRAM
  );

  await sendIx(l1, kp, PROGRAM_ID, [
    { pubkey: kp.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPDA, isSigner: false, isWritable: false },
    { pubkey: bufferPda, isSigner: false, isWritable: true },
    { pubkey: delegationRecordPda, isSigner: false, isWritable: true },
    { pubkey: delegationMetadataPda, isSigner: false, isWritable: true },
    { pubkey: canvasPDA, isSigner: false, isWritable: true },
    { pubkey: VALIDATOR, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: DELEGATION_PROGRAM, isSigner: false, isWritable: false },
  ], getDisc("delegate_canvas"));
  console.log("Canvas delegated!");

  // Wait a moment for ER to pick up
  await new Promise(r => setTimeout(r, 3000));

  // ─── Start agents ───
  console.log(`\n=== Round ${nextRound} LIVE — ${DURATION}s timer ===\n`);
  const agents: ChildProcess[] = [
    spawnAgent("magicblock"),
    spawnAgent("arcium"),
    spawnAgent("jito"),
  ];

  // ─── Timer countdown ───
  const startTime = Date.now();
  const endTime = startTime + DURATION * 1000;

  const timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    process.stdout.write(`\r[TIMER] ${mins}:${secs.toString().padStart(2, "0")} remaining   `);
  }, 1000);

  // Wait for timeout
  await new Promise(r => setTimeout(r, DURATION * 1000));
  clearInterval(timer);
  console.log("\n\n=== TIME'S UP ===\n");

  // ─── End round ───
  console.log("Committing canvas from ER...");
  try {
    await sendIx(er, kp, PROGRAM_ID, [
      { pubkey: kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: canvasPDA, isSigner: false, isWritable: true },
      { pubkey: MAGIC_CONTEXT, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM, isSigner: false, isWritable: false },
    ], getDisc("commit_canvas"));
    console.log("Canvas committed! Waiting for L1...");
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const info = await l1.getAccountInfo(canvasPDA);
      if (info?.owner.toBase58() === PROGRAM_ID.toBase58()) { console.log("Canvas back on L1!"); break; }
      console.log(`  Waiting... (${(i+1)*3}s)`);
    }
  } catch (e: any) {
    console.log("Commit failed:", e.message?.slice(0, 100));
  }

  const stillDelegated = (await l1.getAccountInfo(canvasPDA))?.owner.toBase58() === DELEGATION_PROGRAM.toBase58();
  console.log("Ending round on L1...");
  await sendIx(l1, kp, PROGRAM_ID, [
    { pubkey: kp.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPDA, isSigner: false, isWritable: true },
    { pubkey: canvasPDA, isSigner: false, isWritable: !stillDelegated },
    { pubkey: roundPDA, isSigner: false, isWritable: true },
  ], getDisc("end_round"));
  console.log("Round ended on-chain!");

  // Kill agents (they should self-exit too via isRoundActive check)
  console.log("Stopping agents...");
  agents.forEach(a => a.kill("SIGTERM"));

  // Wait for agents to exit
  await new Promise(r => setTimeout(r, 3000));

  // Read final stats
  const finalConfig = await l1.getAccountInfo(configPDA);
  if (finalConfig) {
    const fv = new DataView(finalConfig.data.buffer, finalConfig.data.byteOffset);
    console.log(`\nFinal: round=${fv.getUint32(40, true)}, active=${finalConfig.data[44] === 1}`);
  }

  console.log(`\n=== Round ${nextRound} complete! ===`);
  process.exit(0);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
