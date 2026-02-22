import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import { L1_RPC_URL, ER_RPC_URL } from "./constants";
import idl from "./idl.json";

/** Minimal wallet that satisfies AnchorProvider — avoids anchor.Wallet ESM export issue */
class SimpleWallet {
  constructor(readonly payer: Keypair) {}

  get publicKey() {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    } else {
      (tx as VersionedTransaction).sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    for (const tx of txs) {
      await this.signTransaction(tx);
    }
    return txs;
  }
}

export function getProgram(connection: Connection, keypair: Keypair): Program {
  const wallet = new SimpleWallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(idl as Idl, provider);
}

export function getL1Connection(): Connection {
  return new Connection(L1_RPC_URL, "confirmed");
}

export function getERConnection(): Connection {
  return new Connection(ER_RPC_URL, "confirmed");
}
