"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamStats } from "@/lib/use-game";

interface TeamLeaderboardProps {
  teamStats: TeamStats[];
}

export function TeamLeaderboard({ teamStats }: TeamLeaderboardProps) {
  const sorted = [...teamStats].sort((a, b) => b.pixelCount - a.pixelCount);
  const totalPixels = sorted.reduce((sum, t) => sum + t.pixelCount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Team Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((team, i) => {
          const pct = totalPixels > 0 ? (team.pixelCount / totalPixels) * 100 : 0;
          return (
            <div key={team.teamId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground text-xs w-4">
                    #{i + 1}
                  </span>
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{
                      backgroundColor: `rgb(${team.color.join(",")})`,
                    }}
                  />
                  <span className="font-medium">{team.name}</span>
                </div>
                <span className="font-mono text-xs">
                  {team.pixelCount.toLocaleString()} px
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `rgb(${team.color.join(",")})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}</span>
                <span>{pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No teams yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
