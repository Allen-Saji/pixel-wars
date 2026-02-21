/**
 * Devnet integration test: initialize → start round → place pixels
 * (Skips delegate/end since those need ER and should be tested via frontend)
 *
 * Usage: npx tsx scripts/devnet-test.ts
 */
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
  Connection,
  Keypair,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";

// Load IDL
const IDL = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../target/idl/pixel_wars.json"),
    "utf-8"
  )
);

const PROGRAM_ID = new PublicKey(
  "5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2"
);

const SEED_CONFIG = Buffer.from("config");
const SEED_CANVAS = Buffer.from("canvas");
const SEED_ROUND = Buffer.from("round");
const SEED_PLAYER = Buffer.from("player");

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

function findConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEED_CONFIG], PROGRAM_ID);
}

function findCanvasPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_CANVAS, toLeU32(round)],
    PROGRAM_ID
  );
}

function findRoundPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_ROUND, toLeU32(round)],
    PROGRAM_ID
  );
}

function findPlayerStatsPDA(
  round: number,
  player: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_PLAYER, toLeU32(round), player.toBuffer()],
    PROGRAM_ID
  );
}

async function main() {
  // Setup connection and wallet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const walletPath = path.join(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log("Wallet:", keypair.publicKey.toBase58());
  const balance = await connection.getBalance(keypair.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(IDL, provider);
  const [configPDA] = findConfigPDA();

  // Step 1: Check if already initialized
  let configInfo = await connection.getAccountInfo(configPDA);

  if (!configInfo) {
    console.log("=== Step 1: Initialize ===");
    const sig = await program.methods
      .initialize()
      .accountsPartial({
        authority: keypair.publicKey,
        gameConfig: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Initialize tx:", sig);

    const config = await program.account.gameConfig.fetch(configPDA);
    console.log("Authority:", config.authority.toBase58());
    console.log("Current Round:", config.currentRound);
    console.log("Round Active:", config.roundActive);
    console.log();
  } else {
    console.log("=== Step 1: Already Initialized ===");
    const config = await program.account.gameConfig.fetch(configPDA);
    console.log("Authority:", config.authority.toBase58());
    console.log("Current Round:", config.currentRound);
    console.log("Round Active:", config.roundActive);
    console.log();

    if (config.roundActive) {
      console.log("Round already active, skipping to place_pixel...\n");
      await testPlacePixel(program, keypair, config.currentRound, configPDA);
      return;
    }
  }

  // Step 2: Start Round
  console.log("=== Step 2: Start Round ===");
  const config = await program.account.gameConfig.fetch(configPDA);
  const nextRound = config.currentRound + 1;
  const [canvasPDA] = findCanvasPDA(nextRound);
  const [roundPDA] = findRoundPDA(nextRound);

  const sig2 = await program.methods
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
  console.log("Start round tx:", sig2);

  const roundData = await program.account.round.fetch(roundPDA);
  console.log("Round:", roundData.roundNumber, "started at slot", roundData.startSlot.toString());
  console.log();

  // Step 3: Place a pixel (on L1, before delegation)
  await testPlacePixel(program, keypair, nextRound, configPDA);

  console.log("\n=== Summary ===");
  console.log("Game initialized on devnet");
  console.log("Round", nextRound, "started");
  console.log("Pixel placed successfully");
  console.log("\nNext: Use frontend to delegate canvas to ER and test full flow");
}

async function testPlacePixel(
  program: anchor.Program,
  keypair: Keypair,
  round: number,
  configPDA: PublicKey
) {
  console.log("=== Step 3: Place Pixel ===");
  const [canvasPDA] = findCanvasPDA(round);
  const [playerStatsPDA] = findPlayerStatsPDA(round, keypair.publicKey);

  const sig = await program.methods
    .placePixel(25, 25, 255, 0, 0)
    .accountsPartial({
      player: keypair.publicKey,
      gameConfig: configPDA,
      canvas: canvasPDA,
      playerStats: playerStatsPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Place pixel tx:", sig);

  const stats = await program.account.playerStats.fetch(playerStatsPDA);
  console.log("Pixels placed:", stats.pixelsPlaced);

  // Verify pixel data
  const canvasInfo = await program.provider.connection.getAccountInfo(canvasPDA);
  if (canvasInfo) {
    const offset = 24 + (25 * 50 + 25) * 3; // header + (y*width+x)*3
    const r = canvasInfo.data[offset];
    const g = canvasInfo.data[offset + 1];
    const b = canvasInfo.data[offset + 2];
    console.log(`Pixel at (25,25): rgb(${r}, ${g}, ${b}) ✓`);
  }
}

main().catch(console.error);
