"use client";

import { GamePanel } from "@/components/game/game-panel";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/5 px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-black/40 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="grid grid-cols-3 gap-[2px]">
            <span className="w-2 h-2 rounded-[2px] bg-red-500" />
            <span className="w-2 h-2 rounded-[2px] bg-green-400" />
            <span className="w-2 h-2 rounded-[2px] bg-blue-500" />
            <span className="w-2 h-2 rounded-[2px] bg-yellow-400" />
            <span className="w-2 h-2 rounded-[2px] bg-fuchsia-500" />
            <span className="w-2 h-2 rounded-[2px] bg-cyan-400" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            Pixel Wars
          </h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
            devnet
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Spectator Mode</span>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <GamePanel />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-2 text-center text-xs text-muted-foreground">
        Powered by Solana &times; MagicBlock Ephemeral Rollups
      </footer>
    </div>
  );
}
