"use client";

import type { GameConfig, RoundInfo, TeamStats } from "@/lib/use-game";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/constants";

interface RoundInfoCardProps {
  gameConfig: GameConfig | null;
  roundInfo: RoundInfo | null;
  totalPlacements?: number;
  teamStats: TeamStats[];
}

export function RoundInfoCard({ gameConfig, roundInfo, totalPlacements, teamStats }: RoundInfoCardProps) {
  if (!gameConfig) {
    return (
      <div className="rounded-xl glass-card p-6 text-center">
        <div className="text-sm text-muted-foreground">Game not initialized</div>
      </div>
    );
  }

  const totalAgents = teamStats.reduce((sum, t) => sum + t.agents.length, 0);
  const activeTeams = teamStats.filter((t) => t.agents.length > 0).length;
  const placements = totalPlacements ?? roundInfo?.totalPlacements ?? 0;
  const fillPct = (placements / (CANVAS_WIDTH * CANVAS_HEIGHT) * 100);
  const isActive = gameConfig.roundActive;

  return (
    <div className="rounded-xl overflow-hidden glass-card">
      {/* Round status header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Round {gameConfig.currentRound || "—"}</h3>
        </div>
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            isActive
              ? "text-[#32dc64] border-[#32dc64]/20 bg-[#32dc64]/10"
              : "text-muted-foreground border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04]"
          }`}
        >
          {isActive ? "Live" : "Ended"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-4 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Teams" value={String(activeTeams)} />
          <StatBox label="Agents" value={String(totalAgents)} />
          <StatBox label="Pixels" value={placements.toLocaleString()} />
        </div>

        {/* Canvas fill bar */}
        {placements > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Canvas Fill</span>
              <span className="font-mono">{fillPct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-progress-fill"
                style={{
                  width: `${Math.min(100, fillPct)}%`,
                  background: "linear-gradient(90deg, #6432ff, #ff6432, #32dc64)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] px-3 py-2 text-center">
      <div className="text-sm font-mono font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
