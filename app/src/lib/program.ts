import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { PixelWars } from "./idl-types";
import IDL_JSON from "./idl.json";
import { PROGRAM_ID } from "./constants";

const IDL = IDL_JSON as PixelWars;

export function getProgram(provider: AnchorProvider): Program<PixelWars> {
  return new Program(IDL, provider);
}

export function getReadonlyProgram(connection: Connection): Program<PixelWars> {
  const provider = new AnchorProvider(
    connection,
    // Dummy wallet for read-only
    {
      publicKey: PublicKey.default,
      signAllTransactions: async <T,>(txs: T[]) => txs,
      signTransaction: async <T,>(tx: T) => tx,
    } as never,
    { commitment: "confirmed" }
  );
  return new Program(IDL, provider);
}

export { PROGRAM_ID };
export type { PixelWars };
