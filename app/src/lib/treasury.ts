import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

let _treasury: Keypair | null = null;

export function getTreasuryKeypair(): Keypair {
  if (_treasury) return _treasury;
  const secret = process.env.TREASURY_SECRET_KEY;
  if (!secret) throw new Error("TREASURY_SECRET_KEY not set");
  _treasury = Keypair.fromSecretKey(bs58.decode(secret));
  return _treasury;
}

// In-memory map of agent pubkey → teamId (survives within a single server instance)
export const agentTeamMap = new Map<string, number>();
