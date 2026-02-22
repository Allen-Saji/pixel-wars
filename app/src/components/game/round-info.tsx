"use client";

import { useEffect, useState } from "react";
import type { GameConfig, RoundInfo, TeamStats } from "@/lib/use-game";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/constants";

interface RoundInfoCardProps {
  gameConfig: GameConfig | null;
  roundInfo: RoundInfo | null;
  totalPlacements?: number;
  teamStats: TeamStats[];
  roundEndTime?: number | null;
}

function formatCountdown(ms: number): { minutes: string; seconds: string; isUrgent: boolean; isExpired: boolean } {
  if (ms <= 0) return { minutes: "00", seconds: "00", isUrgent: true, isExpired: true };
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return {
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
    isUrgent: totalSec < 30,
    isExpired: false,
  };
}

export function RoundInfoCard({ gameConfig, roundInfo, totalPlacements, teamStats, roundEndTime }: RoundInfoCardProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!roundEndTime) { setRemaining(null); return; }
    const tick = () => setRemaining(roundEndTime - Date.now());
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [roundEndTime]);

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

  const timer = remaining !== null ? formatCountdown(remaining) : null;

  return (
    <div className="rounded-xl overflow-hidden glass-card">
      {/* Timer section — hero element when active */}
      {isActive && timer && (
        <div className={`relative px-4 pt-5 pb-4 text-center border-b border-black/[0.06] dark:border-white/[0.06] ${timer.isUrgent ? "bg-red-500/[0.06]" : "bg-black/[0.01] dark:bg-white/[0.02]"}`}>
          {/* Pulsing background when urgent */}
          {timer.isUrgent && !timer.isExpired && (
            <div className="absolute inset-0 bg-red-500/[0.05] animate-pulse-glow pointer-events-none" />
          )}

          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {timer.isExpired ? "Time's Up" : "Time Remaining"}
          </div>

          {/* Big countdown digits */}
          <div className={`relative z-10 font-mono font-bold tracking-wider ${timer.isExpired ? "text-red-400" : timer.isUrgent ? "text-red-400 animate-countdown-pulse" : "text-foreground"}`}>
            <span className="text-4xl">{timer.minutes}</span>
            <span className={`text-4xl mx-0.5 ${!timer.isExpired ? "animate-blink" : ""}`}>:</span>
            <span className="text-4xl">{timer.seconds}</span>
          </div>

          {/* Progress bar for time remaining */}
          {remaining !== null && roundEndTime && !timer.isExpired && (
            <div className="mt-3 h-1 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${Math.max(0, Math.min(100, (remaining / (roundEndTime - Date.now() + remaining)) * 100))}%`,
                  backgroundColor: timer.isUrgent ? "#ef4444" : "#6432ff",
                }}
              />
            </div>
          )}
        </div>
      )}

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
