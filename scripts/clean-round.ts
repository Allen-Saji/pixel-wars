/**
 * End current round + start a new one + delegate canvas.
 * Run with NOTHING else touching the ER (no frontend, no agents).
 * Usage: NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/clean-round.ts
 */
import { PublicKey, SystemProgram, Connection, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
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

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

function getDisc(name: string): Buffer {
  const ix = IDL.instructions.find((i: any) => i.name === name);
  if (!ix) throw new Error(`Instruction ${name} not found`);
  return Buffer.from(ix.discriminator);
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

async function main() {
  const l1 = new Connection("https://api.devnet.solana.com", "confirmed");
  const er = new Connection("https://devnet-us.magicblock.app", "confirmed");
  const kp = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(path.join(process.env.HOME!, ".config/solana/id.json"), "utf-8")))
  );
  const [configPDA] = findConfigPDA();

  // Read config
  const configInfo = await l1.getAccountInfo(configPDA);
  if (!configInfo) throw new Error("Config not found");
  const view = new DataView(configInfo.data.buffer, configInfo.data.byteOffset);
  let currentRound = view.getUint32(40, true);
  let active = configInfo.data[44] === 1;
  console.log(`Current round: ${currentRound}, active: ${active}`);

  // End round if active
  if (active) {
    console.log(`\n--- Ending round ${currentRound} ---`);
    const [canvasPDA] = findCanvasPDA(currentRound);
    const [roundPDA] = findRoundPDA(currentRound);

    // Check if canvas is delegated
    const canvasInfo = await l1.getAccountInfo(canvasPDA);
    const isDelegated = canvasInfo?.owner.toBase58() === DELEGATION_PROGRAM.toBase58();

    if (isDelegated) {
      // Try commit on ER first
      console.log("Canvas is delegated. Trying commit on ER...");
      try {
        await sendIx(er, kp, PROGRAM_ID, [
          { pubkey: kp.publicKey, isSigner: true, isWritable: true },
          { pubkey: canvasPDA, isSigner: false, isWritable: true },
          { pubkey: MAGIC_CONTEXT, isSigner: false, isWritable: true },
          { pubkey: MAGIC_PROGRAM, isSigner: false, isWritable: false },
        ], getDisc("commit_canvas"));
        console.log("Canvas committed! Waiting for L1...");
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const info = await l1.getAccountInfo(canvasPDA);
          if (info && info.owner.toBase58() === PROGRAM_ID.toBase58()) {
            console.log("Canvas back on L1!");
            break;
          }
          console.log(`  Waiting... (${(i + 1) * 3}s)`);
        }
      } catch (e: any) {
        console.log("Commit failed (ER stale cache?):", e.message?.slice(0, 100));
        console.log("Will end round with canvas still delegated (read-only)...");
      }
    }

    // End round on L1 — canvas can be read-only (not writable) if still delegated
    const canvasNow = await l1.getAccountInfo(canvasPDA);
    const stillDelegated = canvasNow?.owner.toBase58() === DELEGATION_PROGRAM.toBase58();

    console.log("Ending round on L1...");
    await sendIx(l1, kp, PROGRAM_ID, [
      { pubkey: kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: canvasPDA, isSigner: false, isWritable: !stillDelegated },
      { pubkey: roundPDA, isSigner: false, isWritable: true },
    ], getDisc("end_round"));
    console.log("Round ended!");
    await new Promise((r) => setTimeout(r, 2000));

    const c2 = await l1.getAccountInfo(configPDA);
    if (c2) {
      const v2 = new DataView(c2.data.buffer, c2.data.byteOffset);
      currentRound = v2.getUint32(40, true);
    }
  }

  const nextRound = currentRound + 1;
  const [canvasPDA] = findCanvasPDA(nextRound);
  const [roundPDA] = findRoundPDA(nextRound);

  // Start round
  console.log(`\n--- Starting round ${nextRound} ---`);
  await sendIx(l1, kp, PROGRAM_ID, [
    { pubkey: kp.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPDA, isSigner: false, isWritable: true },
    { pubkey: canvasPDA, isSigner: false, isWritable: true },
    { pubkey: roundPDA, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], getDisc("start_round"));
  console.log("Round created!");

  // Delegate canvas IMMEDIATELY — correct PDA seeds
  console.log("Delegating canvas...");
  // buffer: seeds=["buffer", canvasPDA] program=PROGRAM_ID (owner program!)
  const [bufferPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), canvasPDA.toBuffer()], PROGRAM_ID
  );
  // delegation_record: seeds=["delegation", canvasPDA] program=DELEGATION_PROGRAM
  const [delegationRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), canvasPDA.toBuffer()], DELEGATION_PROGRAM
  );
  // delegation_metadata: seeds=["delegation-metadata", canvasPDA] program=DELEGATION_PROGRAM
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

  // Wait for ER to pick it up
  console.log("\nWaiting for ER to recognize canvas...");
  let erReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const erInfo = await er.getAccountInfo(canvasPDA);
    if (erInfo) {
      console.log(`  ER found canvas: owner=${erInfo.owner.toBase58()}, size=${erInfo.data.length}`);

      // Test place_pixel
      const ppData = Buffer.concat([getDisc("place_pixel"), Buffer.from([5, 0, 5, 0, 0, 0])]);
      const ppIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: kp.publicKey, isSigner: true, isWritable: true },
          { pubkey: configPDA, isSigner: false, isWritable: false },
          { pubkey: canvasPDA, isSigner: false, isWritable: true },
        ],
        data: ppData,
      });
      const ppTx = new Transaction().add(ppIx);
      ppTx.feePayer = kp.publicKey;
      ppTx.recentBlockhash = (await er.getLatestBlockhash()).blockhash;
      const ppSim = await er.simulateTransaction(ppTx);

      if (!ppSim.value.err || JSON.stringify(ppSim.value.err).includes("InstructionDidNotDeserialize")) {
        // InstructionDidNotDeserialize is an app-level error (bad args), not a delegation error
        // InvalidWritableAccount means delegation not recognized
        if (JSON.stringify(ppSim.value.err)?.includes("InvalidWritableAccount")) {
          console.log("  ER still doesn't recognize delegation...");
          continue;
        }
        console.log("  ER accepts writable canvas!");
        erReady = true;
        break;
      }
      console.log("  Sim error:", JSON.stringify(ppSim.value.err));
    } else {
      console.log(`  ER: not found yet... (${(i+1)*2}s)`);
    }
  }

  if (erReady) {
    console.log(`\n=== READY === Round ${nextRound} — Start agents + frontend now!`);
  } else {
    console.log(`\n=== WARNING === Round ${nextRound} started but ER may not be ready`);
  }
}

main().catch((e) => console.error("FATAL:", e.message));
