"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    const addr = publicKey.toBase58();
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        {addr.slice(0, 4)}...{addr.slice(-4)}
      </Button>
    );
  }

  return (
    <Button onClick={() => setVisible(true)} disabled={connecting}>
      {connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
