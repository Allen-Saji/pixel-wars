"use client";

import type { TeamStats } from "@/lib/use-game";

interface TeamLeaderboardProps {
  teamStats: TeamStats[];
}

const RANK_LABELS = ["1st", "2nd", "3rd"];

export function TeamLeaderboard({ teamStats }: TeamLeaderboardProps) {
  const sorted = [...teamStats].sort((a, b) => b.pixelCount - a.pixelCount);
  const totalPixels = sorted.reduce((sum, t) => sum + t.pixelCount, 0);

  return (
    <div className="rounded-xl overflow-hidden card-hover glass-card">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Leaderboard</h3>
        {totalPixels > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {totalPixels.toLocaleString()} total
          </span>
        )}
      </div>
      <div className="px-4 pb-4 space-y-3">
        {sorted.map((team, i) => {
          const pct = totalPixels > 0 ? (team.pixelCount / totalPixels) * 100 : 0;
          const [r, g, b] = team.color;
          const rgb = `${r},${g},${b}`;
          const isLeader = i === 0 && team.pixelCount > 0;

          return (
            <div
              key={team.teamId}
              className={`relative rounded-lg p-3 transition-all duration-300 ${
                isLeader ? "bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]" : "bg-transparent"
              }`}
              style={isLeader ? {
                borderColor: `rgba(${rgb}, 0.2)`,
                boxShadow: `0 0 20px rgba(${rgb}, 0.05)`,
              } : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {/* Rank badge */}
                  <span
                    className="text-[10px] font-mono font-bold w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      color: `rgb(${rgb})`,
                      backgroundColor: `rgba(${rgb}, 0.1)`,
                      border: `1px solid rgba(${rgb}, 0.15)`,
                    }}
                  >
                    {RANK_LABELS[i] || `${i + 1}`}
                  </span>

                  {/* Team color dot + name */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: `rgb(${rgb})` }}
                      />
                      <span className="font-semibold text-sm">{team.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Pixel count */}
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold" style={{ color: `rgb(${rgb})` }}>
                    {team.pixelCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-progress-fill transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, team.pixelCount > 0 ? 2 : 0)}%`,
                    backgroundColor: `rgb(${rgb})`,
                    boxShadow: `0 0 8px rgba(${rgb}, 0.4)`,
                  }}
                />
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">
            Waiting for teams...
          </div>
        )}
      </div>
    </div>
  );
}
