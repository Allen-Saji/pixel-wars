import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { L1_RPC_URL, ER_RPC_URL } from "./constants";
import idl from "./idl.json";

export function getProgram(connection: Connection, keypair: Keypair): anchor.Program {
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new anchor.Program(idl as anchor.Idl, provider);
}

export function getL1Connection(): Connection {
  return new Connection(L1_RPC_URL, "confirmed");
}

export function getERConnection(): Connection {
  return new Connection(ER_RPC_URL, "confirmed");
}
