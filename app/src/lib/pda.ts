import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, SEED_CONFIG, SEED_CANVAS, SEED_ROUND, SEED_AGENT } from "./constants";

function toLeU32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, n, true);
  return buf;
}

const enc = new TextEncoder();

export function findConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode(SEED_CONFIG)],
    PROGRAM_ID
  );
}

export function findCanvasPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode(SEED_CANVAS), toLeU32(round)],
    PROGRAM_ID
  );
}

export function findRoundPDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode(SEED_ROUND), toLeU32(round)],
    PROGRAM_ID
  );
}

export function findAgentRegistrationPDA(
  round: number,
  agent: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode(SEED_AGENT), agent.toBytes(), toLeU32(round)],
    PROGRAM_ID
  );
}
