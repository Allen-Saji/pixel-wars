"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PixelCanvas } from "@/components/canvas/pixel-canvas";
import { ColorPicker } from "@/components/canvas/color-picker";
import { RoundInfoCard } from "@/components/game/round-info";
import { PlayerStatsCard } from "@/components/game/player-stats";
import { AdminPanel } from "@/components/admin/admin-panel";
import { useGame } from "@/lib/use-game";
import { toast } from "sonner";

export function GamePanel() {
  const {
    gameConfig,
    canvasData,
    roundInfo,
    playerStats,
    loading,
    cooldownEnd,
    isAdmin,
    ephemeralPublicKey,
    placePixel,
    initialize,
    startRound,
    endRound,
  } = useGame();

  const wallet = useWallet();
  const [selectedColor, setSelectedColor] = useState<[number, number, number]>([
    255, 0, 0,
  ]);

  const handlePixelClick = useCallback(
    async (x: number, y: number) => {
      if (!gameConfig?.roundActive) {
        toast.error("No active round");
        return;
      }
      try {
        const [r, g, b] = selectedColor;
        await placePixel(x, y, r, g, b);
        toast.success(`Pixel placed at (${x}, ${y})`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Cooldown") || msg.includes("cooldown")) {
          toast.error("Wait for cooldown");
        } else {
          toast.error(`Failed: ${msg.slice(0, 120)}`);
        }
      }
    },
    [gameConfig, selectedColor, placePixel]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-muted-foreground">Loading game state...</div>
      </div>
    );
  }

  const canPlace = !!gameConfig?.roundActive && Date.now() >= cooldownEnd;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Canvas */}
      <div className="flex-1 min-w-0">
        <PixelCanvas
          pixels={canvasData?.pixels ?? null}
          onPixelClick={handlePixelClick}
          disabled={!canPlace}
        />
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-72 space-y-3 shrink-0">
        <ColorPicker color={selectedColor} onColorChange={setSelectedColor} />
        <RoundInfoCard
          gameConfig={gameConfig}
          roundInfo={roundInfo}
          totalPlacements={canvasData?.totalPlacements}
        />
        <PlayerStatsCard
          stats={playerStats}
          cooldownEnd={cooldownEnd}
          connected={!!wallet.publicKey}
          ephemeralKey={ephemeralPublicKey}
        />
        {(isAdmin || !gameConfig) && (
          <AdminPanel
            gameConfig={gameConfig}
            isAdmin={isAdmin || !gameConfig}
            onInitialize={initialize}
            onStartRound={startRound}
            onEndRound={endRound}
          />
        )}
      </div>
    </div>
  );
}
