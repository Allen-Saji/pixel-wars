import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2"
);

export const CANVAS_WIDTH = 50;
export const CANVAS_HEIGHT = 50;
export const BYTES_PER_PIXEL = 3;
export const CANVAS_DATA_SIZE = CANVAS_WIDTH * CANVAS_HEIGHT * BYTES_PER_PIXEL; // 7500
export const PLACEMENT_COOLDOWN_SLOTS = 10; // ~4-5 seconds at 400ms/slot
export const PLACEMENT_COOLDOWN_MS = PLACEMENT_COOLDOWN_SLOTS * 400;

// Canvas zero_copy byte layout (after 8-byte discriminator)
export const CANVAS_HEADER_SIZE = 8; // discriminator
export const CANVAS_PLACEMENTS_OFFSET = 8; // u64
export const CANVAS_ROUND_OFFSET = 16; // u32
export const CANVAS_BUMP_OFFSET = 20; // u8
export const CANVAS_PIXELS_OFFSET = 24; // after 3 bytes padding

// PDA seeds
export const SEED_CONFIG = "config";
export const SEED_CANVAS = "canvas";
export const SEED_PLAYER = "player";
export const SEED_ROUND = "round";

// RPC endpoints
export const L1_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
export const ER_RPC_URL =
  process.env.NEXT_PUBLIC_ER_RPC_URL || "https://devnet.magicblock.app";
