/**
 * Test canvas delegation to MagicBlock ER on devnet.
 * Usage: npx tsx scripts/test-delegate.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/pixel_wars.json"), "utf-8")
);
const PROGRAM_ID = new PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");

// MagicBlock devnet US validator
const VALIDATOR = new PublicKey("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd");

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME || "~", ".config/solana/id.json");
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log("Wallet:", keypair.publicKey.toBase58());

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  anchor.setProvider(provider);
  const program = new anchor.Program(IDL, provider);

  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

  // Fetch config
  const config = await program.account.gameConfig.fetch(configPDA);
  console.log("Current Round:", config.currentRound);
  console.log("Round Active:", config.roundActive);

  if (!config.roundActive) {
    console.error("No active round to delegate!");
    process.exit(1);
  }

  const round = config.currentRound;
  const [canvasPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("canvas"), toLeU32(round)],
    PROGRAM_ID
  );

  console.log("\n=== Delegating Canvas ===");
  console.log("Canvas PDA:", canvasPDA.toBase58());
  console.log("Round:", round);
  console.log("Validator:", VALIDATOR.toBase58());

  try {
    const sig = await program.methods
      .delegateCanvas()
      .accountsPartial({
        payer: keypair.publicKey,
        gameConfig: configPDA,
        pda: canvasPDA,
        validator: VALIDATOR,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    console.log("\nDelegate tx:", sig);
    console.log("Canvas delegated to ER successfully!");
    console.log("Agents can now place pixels via https://devnet.magicblock.app");
  } catch (e: any) {
    console.log("TX error:", e.message?.slice(0, 500));
    console.log("Error:", JSON.stringify(e, Object.getOwnPropertyNames(e), 2)?.slice(0, 2000));
    if (e.logs) {
      console.log("TX Logs:");
      e.logs.forEach((l: string) => console.log("  ", l));
    }
    if (e.signature) {
      console.log("Signature:", e.signature);
    }
  }
}

main().catch(console.error);
