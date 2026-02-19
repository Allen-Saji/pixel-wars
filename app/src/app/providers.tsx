"use client";

import { useMemo, createContext, useContext } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { Connection } from "@solana/web3.js";
import { L1_RPC_URL, ER_RPC_URL } from "@/lib/constants";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@solana/wallet-adapter-react-ui/styles.css";

interface ErConnectionContextValue {
  erConnection: Connection;
}

const ErConnectionContext = createContext<ErConnectionContextValue>({
  erConnection: null!,
});

export function useErConnection() {
  return useContext(ErConnectionContext).erConnection;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  const erConnection = useMemo(
    () => new Connection(ER_RPC_URL, "confirmed"),
    []
  );

  return (
    <ConnectionProvider endpoint={L1_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ErConnectionContext.Provider value={{ erConnection }}>
            <TooltipProvider>{children}</TooltipProvider>
          </ErConnectionContext.Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
