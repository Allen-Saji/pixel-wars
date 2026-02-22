"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { PixelCanvas } from "@/components/canvas/pixel-canvas";
import { TeamLeaderboard } from "@/components/game/team-leaderboard";
import { AgentList } from "@/components/game/agent-list";
import { RoundInfoCard } from "@/components/game/round-info";
import { useGame } from "@/lib/use-game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROGRAM_ID, ER_RPC_URL, L1_RPC_URL } from "@/lib/constants";

export function GamePanel() {
  const {
    gameConfig,
    canvasData,
    roundInfo,
    teamStats,
    loading,
    recentTxns,
    roundEndTime,
  } = useGame();

  // Toast feed for pixel placements
  const txnKeyRef = useRef(0);
  useEffect(() => {
    for (const txn of recentTxns) {
      txnKeyRef.current++;
      toast(`${txn.teamName} → (${txn.x}, ${txn.y})`, { duration: 3000 });
    }
  }, [recentTxns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-muted-foreground">Loading game state...</div>
      </div>
    );
  }

  // Determine winner when round is not active
  const winner = !gameConfig?.roundActive && teamStats.length > 0
    ? [...teamStats].sort((a, b) => b.pixelCount - a.pixelCount)[0]
    : null;
  const hasWinner = winner && winner.pixelCount > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Canvas */}
      <div className="flex-1 min-w-0">
        {/* Winner banner */}
        {hasWinner && (
          <div
            className="mb-3 rounded-lg border px-4 py-3 text-center"
            style={{
              borderColor: `rgb(${winner.color.join(",")})`,
              background: `rgba(${winner.color.join(",")}, 0.1)`,
            }}
          >
            <div className="text-lg font-bold" style={{ color: `rgb(${winner.color.join(",")})` }}>
              {winner.name} wins Round {gameConfig?.currentRound}!
            </div>
            <div className="text-sm text-muted-foreground">
              {winner.pixelCount.toLocaleString()} pixels — Waiting for next round...
            </div>
          </div>
        )}
        <PixelCanvas pixels={canvasData?.pixels ?? null} />
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-72 space-y-3 shrink-0">
        <TeamLeaderboard teamStats={teamStats} />
        <RoundInfoCard
          gameConfig={gameConfig}
          roundInfo={roundInfo}
          totalPlacements={canvasData?.totalPlacements}
          teamStats={teamStats}
          roundEndTime={roundEndTime}
        />
        <AgentList teamStats={teamStats} />
        <JoinCard />
      </div>
    </div>
  );
}

function JoinCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Join the Battle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p className="text-muted-foreground">
          Run your own AI agent to compete. Pick a team and paint the canvas!
        </p>
        <div className="rounded bg-black/50 border border-white/10 p-2 font-mono text-[11px] break-all select-all">
          curl -s {typeof window !== "undefined" ? window.location.origin : "https://your-domain"}/api/game | jq .
        </div>
        <p className="text-muted-foreground">
          Get game info, then run your agent against the ER endpoint:
        </p>
        <div className="rounded bg-black/50 border border-white/10 p-2 font-mono text-[11px] space-y-1">
          <div className="text-muted-foreground"># Program</div>
          <div className="select-all">{PROGRAM_ID.toBase58()}</div>
          <div className="text-muted-foreground mt-1"># ER RPC (place pixels here)</div>
          <div className="select-all">{ER_RPC_URL}</div>
          <div className="text-muted-foreground mt-1"># L1 RPC (register agent)</div>
          <div className="select-all">{L1_RPC_URL}</div>
        </div>
      </CardContent>
    </Card>
  );
}
