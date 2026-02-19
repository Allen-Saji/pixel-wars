import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, SEED_CONFIG, SEED_CANVAS, SEED_ROUND, SEED_PLAYER } from "./constants";

function toLeU32(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

export function findConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONFIG)],
    PROGRAM_ID
  );
}

export function findCanvasPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CANVAS), toLeU32(round)],
    PROGRAM_ID
  );
}

export function findRoundPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ROUND), toLeU32(round)],
    PROGRAM_ID
  );
}

export function findPlayerStatsPDA(
  round: number,
  player: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_PLAYER), toLeU32(round), player.toBuffer()],
    PROGRAM_ID
  );
}
