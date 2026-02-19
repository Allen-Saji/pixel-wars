"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GameConfig, RoundInfo } from "@/lib/use-game";

interface RoundInfoCardProps {
  gameConfig: GameConfig | null;
  roundInfo: RoundInfo | null;
  totalPlacements?: number;
}

export function RoundInfoCard({ gameConfig, roundInfo, totalPlacements }: RoundInfoCardProps) {
  if (!gameConfig) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Game not initialized
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Round Info
          <Badge variant={gameConfig.roundActive ? "default" : "secondary"}>
            {gameConfig.roundActive ? "Active" : "Ended"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Round</span>
          <span className="font-mono">{gameConfig.currentRound || "—"}</span>
        </div>
        {roundInfo && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pixels Placed</span>
              <span className="font-mono">
                {totalPlacements ?? roundInfo.totalPlacements}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Slot</span>
              <span className="font-mono">{roundInfo.startSlot}</span>
            </div>
            {roundInfo.ended && roundInfo.endSlot > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Slot</span>
                <span className="font-mono">{roundInfo.endSlot}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
