"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GameConfig, RoundInfo, TeamStats } from "@/lib/use-game";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/constants";

interface RoundInfoCardProps {
  gameConfig: GameConfig | null;
  roundInfo: RoundInfo | null;
  totalPlacements?: number;
  teamStats: TeamStats[];
  roundEndTime?: number | null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Time's up!";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RoundInfoCard({ gameConfig, roundInfo, totalPlacements, teamStats, roundEndTime }: RoundInfoCardProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!roundEndTime) { setRemaining(null); return; }
    const tick = () => setRemaining(roundEndTime - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roundEndTime]);

  if (!gameConfig) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Game not initialized
        </CardContent>
      </Card>
    );
  }

  const totalAgents = teamStats.reduce((sum, t) => sum + t.agents.length, 0);
  const activeTeams = teamStats.filter((t) => t.agents.length > 0).length;

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
        <div className="flex justify-between">
          <span className="text-muted-foreground">Teams</span>
          <span className="font-mono">{activeTeams}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Agents</span>
          <span className="font-mono">{totalAgents}</span>
        </div>
        {remaining !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time Left</span>
            <span className={`font-mono font-semibold ${remaining <= 0 ? "text-destructive" : remaining < 60_000 ? "text-yellow-500" : ""}`}>
              {formatCountdown(remaining)}
            </span>
          </div>
        )}
        {roundInfo && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pixels Placed</span>
              <span className="font-mono">
                {(totalPlacements ?? roundInfo.totalPlacements).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Canvas Fill</span>
              <span className="font-mono">
                {((totalPlacements ?? roundInfo.totalPlacements) / (CANVAS_WIDTH * CANVAS_HEIGHT) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Slot</span>
              <span className="font-mono">{roundInfo.startSlot.toLocaleString()}</span>
            </div>
            {roundInfo.ended && roundInfo.endSlot > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Slot</span>
                <span className="font-mono">{roundInfo.endSlot.toLocaleString()}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
