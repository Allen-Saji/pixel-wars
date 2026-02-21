import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";

// ─── Constants ──────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  "5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2"
);

export const CANVAS_WIDTH = 50;
export const CANVAS_HEIGHT = 50;
export const BYTES_PER_PIXEL = 3;
export const CANVAS_DATA_SIZE = CANVAS_WIDTH * CANVAS_HEIGHT * BYTES_PER_PIXEL;

// Zero-copy layout offsets (after 8-byte discriminator)
const CANVAS_PIXELS_OFFSET = 24;

const SEED_CONFIG = Buffer.from("config");
const SEED_CANVAS = Buffer.from("canvas");
const SEED_ROUND = Buffer.from("round");
const SEED_PLAYER = Buffer.from("player");

// ─── RPC Endpoints ──────────────────────────────────────────────────────────
const L1_RPC = process.env.L1_RPC_URL || "https://api.devnet.solana.com";
const ER_RPC = process.env.ER_RPC_URL || "https://devnet.magicblock.app";

// ─── PDA Helpers ────────────────────────────────────────────────────────────
function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

export function findConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEED_CONFIG], PROGRAM_ID);
}

export function findCanvasPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_CANVAS, toLeU32(round)],
    PROGRAM_ID
  );
}

export function findRoundPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_ROUND, toLeU32(round)],
    PROGRAM_ID
  );
}

export function findPlayerStatsPDA(
  round: number,
  player: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_PLAYER, toLeU32(round), player.toBuffer()],
    PROGRAM_ID
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
export type RGB = [number, number, number];
export type Grid = RGB[][];

// ─── Agent Context ──────────────────────────────────────────────────────────
export interface AgentContext {
  name: string;
  keypair: Keypair;
  program: anchor.Program;
  l1Connection: Connection;
  erConnection: Connection;
  currentRound: number;
  configPDA: PublicKey;
}

// ─── Setup ──────────────────────────────────────────────────────────────────
export async function setupAgent(name: string): Promise<AgentContext> {
  // Load or generate agent keypair
  const keyPath = path.join(__dirname, `keys/${name}.json`);
  let keypair: Keypair;

  if (fs.existsSync(keyPath)) {
    const secret = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    keypair = Keypair.fromSecretKey(new Uint8Array(secret));
  } else {
    keypair = Keypair.generate();
    fs.mkdirSync(path.join(__dirname, "keys"), { recursive: true });
    fs.writeFileSync(keyPath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`[${name}] Generated new keypair: ${keypair.publicKey.toBase58()}`);
  }

  const l1Connection = new Connection(L1_RPC, "confirmed");
  const erConnection = new Connection(ER_RPC, "confirmed");

  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../target/idl/pixel_wars.json"),
      "utf-8"
    )
  );

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(erConnection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  const program = new anchor.Program(idl, provider);

  const [configPDA] = findConfigPDA();

  // Fetch current round
  const config = await program.account.gameConfig.fetch(configPDA);
  const currentRound = config.currentRound as number;

  console.log(`[${name}] Agent: ${keypair.publicKey.toBase58()}`);
  console.log(`[${name}] Round: ${currentRound}, Active: ${config.roundActive}`);

  if (!config.roundActive) {
    throw new Error(`No active round. Current round: ${currentRound}`);
  }

  return {
    name,
    keypair,
    program,
    l1Connection,
    erConnection,
    currentRound,
    configPDA,
  };
}

// ─── Canvas Read ────────────────────────────────────────────────────────────
export async function readCanvas(ctx: AgentContext): Promise<Grid> {
  const [canvasPDA] = findCanvasPDA(ctx.currentRound);

  // Try ER first, fallback to L1
  let info = await ctx.erConnection.getAccountInfo(canvasPDA).catch(() => null);
  if (!info) {
    info = await ctx.l1Connection.getAccountInfo(canvasPDA);
  }
  if (!info) throw new Error("Canvas account not found");

  const data = info.data;
  const grid: Grid = [];

  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const offset = CANVAS_PIXELS_OFFSET + (y * CANVAS_WIDTH + x) * BYTES_PER_PIXEL;
      grid[y][x] = [data[offset], data[offset + 1], data[offset + 2]];
    }
  }

  return grid;
}

// ─── Place Pixel ────────────────────────────────────────────────────────────
export async function placePixel(
  ctx: AgentContext,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number
): Promise<string | null> {
  const [canvasPDA] = findCanvasPDA(ctx.currentRound);

  try {
    const ix = await ctx.program.methods
      .placePixel(x, y, r, g, b)
      .accountsPartial({
        player: ctx.keypair.publicKey,
        gameConfig: ctx.configPDA,
        canvas: canvasPDA,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = ctx.keypair.publicKey;
    tx.recentBlockhash = (
      await ctx.erConnection.getLatestBlockhash()
    ).blockhash;
    tx.sign(ctx.keypair);

    const sig = await ctx.erConnection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
    });

    return sig;
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes("Cooldown") || msg.includes("cooldown")) {
      return null; // Expected, silently retry later
    }
    console.error(`[${ctx.name}] placePixel error:`, msg.slice(0, 200));
    return null;
  }
}

// ─── Funding ────────────────────────────────────────────────────────────────
export async function ensureFunded(ctx: AgentContext): Promise<void> {
  const balance = await ctx.erConnection
    .getBalance(ctx.keypair.publicKey)
    .catch(() => 0);

  if (balance > 0.01 * 1e9) {
    console.log(`[${ctx.name}] Balance: ${(balance / 1e9).toFixed(4)} SOL`);
    return;
  }

  // Try L1 balance
  const l1Balance = await ctx.l1Connection.getBalance(ctx.keypair.publicKey);
  if (l1Balance > 0.01 * 1e9) {
    console.log(`[${ctx.name}] L1 balance: ${(l1Balance / 1e9).toFixed(4)} SOL`);
    return;
  }

  // Try devnet airdrop
  console.log(`[${ctx.name}] Requesting airdrop...`);
  try {
    const sig = await ctx.l1Connection.requestAirdrop(
      ctx.keypair.publicKey,
      1 * 1e9
    );
    await ctx.l1Connection.confirmTransaction(sig, "confirmed");
    console.log(`[${ctx.name}] Airdropped 1 SOL`);
  } catch (e: any) {
    console.error(`[${ctx.name}] Airdrop failed:`, e.message?.slice(0, 100));
    console.log(`[${ctx.name}] Fund manually: ${ctx.keypair.publicKey.toBase58()}`);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function colorsEqual(a: RGB, b: RGB): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
