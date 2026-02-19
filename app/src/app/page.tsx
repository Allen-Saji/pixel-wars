"use client";

import { GamePanel } from "@/components/game/game-panel";
import { WalletButton } from "@/components/wallet/wallet-button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Pixel Wars</h1>
        <WalletButton />
      </header>

      {/* Main */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <GamePanel />
      </main>
    </div>
  );
}
