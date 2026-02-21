/**
 * Test placing a pixel via ER on devnet.
 * Usage: npx tsx scripts/test-place-pixel-er.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/pixel_wars.json"), "utf-8")
);
const PROGRAM_ID = new PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");
const ER_RPC = "https://devnet.magicblock.app";

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

async function main() {
  const walletPath = path.join(process.env.HOME || "~", ".config/solana/id.json");
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log("Player:", keypair.publicKey.toBase58());

  const erConnection = new Connection(ER_RPC, "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const erProvider = new anchor.AnchorProvider(erConnection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  const program = new anchor.Program(IDL, erProvider);

  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const round = 1;
  const [canvasPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("canvas"), toLeU32(round)],
    PROGRAM_ID
  );

  console.log("Canvas PDA:", canvasPDA.toBase58());
  console.log("ER RPC:", ER_RPC);

  const x = 10, y = 10, r = 255, g = 0, b = 0;
  console.log(`\nPlacing pixel at (${x}, ${y}) color rgb(${r},${g},${b})...`);

  try {
    const tx = await program.methods
      .placePixel(x, y, r, g, b)
      .accountsPartial({
        player: keypair.publicKey,
        gameConfig: configPDA,
        canvas: canvasPDA,
      })
      .transaction();

    tx.feePayer = keypair.publicKey;
    tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
    tx.sign(keypair);

    const sig = await erConnection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
    });
    console.log("TX sent:", sig);

    const confirmation = await erConnection.confirmTransaction(sig, "confirmed");
    console.log("Confirmed:", JSON.stringify(confirmation.value));

    if (!confirmation.value.err) {
      console.log("\nPixel placed successfully on ER!");

      // Read back to verify
      const canvasInfo = await erConnection.getAccountInfo(canvasPDA);
      if (canvasInfo) {
        const offset = 8 + 8 + 4 + 1 + 3 + (y * 50 + x) * 3;
        const pR = canvasInfo.data[offset];
        const pG = canvasInfo.data[offset + 1];
        const pB = canvasInfo.data[offset + 2];
        console.log(`Pixel at (${x},${y}): rgb(${pR},${pG},${pB})`);
      }
    }
  } catch (e: any) {
    console.log("Error:", e.message?.slice(0, 500));
    if (e.logs) e.logs.forEach((l: string) => console.log("  ", l));
  }
}

main().catch(console.error);
