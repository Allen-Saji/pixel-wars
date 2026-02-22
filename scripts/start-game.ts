/**
 * Start a new round and delegate canvas to ER.
 * Usage: NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/start-game.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, ComputeBudgetProgram, Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/pixel_wars.json"), "utf-8")
);

const PROGRAM_ID = new PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");
const VALIDATOR = new PublicKey("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd");

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

const findConfigPDA = () =>
  PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
const findCanvasPDA = (r: number) =>
  PublicKey.findProgramAddressSync([Buffer.from("canvas"), toLeU32(r)], PROGRAM_ID);
const findRoundPDA = (r: number) =>
  PublicKey.findProgramAddressSync([Buffer.from("round"), toLeU32(r)], PROGRAM_ID);

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME || "~", ".config/solana/id.json");
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("Wallet:", keypair.publicKey.toBase58());

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  const program = new anchor.Program(IDL, provider);
  const [configPDA] = findConfigPDA();

  // Initialize if needed
  let configInfo = await connection.getAccountInfo(configPDA);
  if (!configInfo) {
    console.log("Initializing game...");
    await program.methods
      .initialize()
      .accountsPartial({
        authority: keypair.publicKey,
        gameConfig: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Initialized!");
  }

  let config = await program.account.gameConfig.fetch(configPDA);
  console.log(`Current round: ${config.currentRound}, active: ${config.roundActive}`);

  // Start round if not active
  if (!config.roundActive) {
    const nextRound = config.currentRound + 1;
    const [canvasPDA] = findCanvasPDA(nextRound);
    const [roundPDA] = findRoundPDA(nextRound);

    console.log(`\nStarting round ${nextRound}...`);
    await program.methods
      .startRound()
      .accountsPartial({
        authority: keypair.publicKey,
        gameConfig: configPDA,
        canvas: canvasPDA,
        round: roundPDA,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ])
      .rpc();
    console.log(`Round ${nextRound} started!`);

    // Re-fetch
    config = await program.account.gameConfig.fetch(configPDA);
  }

  // Delegate canvas
  const round = config.currentRound;
  const [canvasPDA] = findCanvasPDA(round);

  console.log(`\nDelegating canvas for round ${round}...`);
  try {
    await program.methods
      .delegateCanvas()
      .accountsPartial({
        payer: keypair.publicKey,
        gameConfig: configPDA,
        pda: canvasPDA,
        validator: VALIDATOR,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });
    console.log("Canvas delegated to ER!");
  } catch (e: any) {
    if (e.message?.includes("already delegated") || e.message?.includes("already in use")) {
      console.log("Canvas already delegated, continuing...");
    } else {
      console.log("Delegation result:", e.message?.slice(0, 200));
      console.log("(May already be delegated — agents should still work)");
    }
  }

  console.log("\n=== Game Ready ===");
  console.log(`Round: ${round}`);
  console.log(`Canvas PDA: ${canvasPDA.toBase58()}`);
  console.log("Start agents with: cd agents && NODE_OPTIONS='--dns-result-order=ipv4first' npx tsx magicblock-agent.ts");
}

main().catch(console.error);
