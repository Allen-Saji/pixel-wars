"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { PixelCanvas } from "@/components/canvas/pixel-canvas";
import { TeamLeaderboard } from "@/components/game/team-leaderboard";
import { AgentList } from "@/components/game/agent-list";
import { RoundInfoCard } from "@/components/game/round-info";
import { useGame } from "@/lib/use-game";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-1.5 w-full text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded px-1.5 py-1 -mx-1.5"
      title="Click to copy"
    >
      <span className="font-mono text-[11px] text-foreground/80 break-all flex-1">{label || text}</span>
      <span className="shrink-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <span className="text-[#32dc64] font-medium">copied!</span>
        ) : (
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </span>
    </button>
  );
}

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

  const txnKeyRef = useRef(0);
  useEffect(() => {
    for (const txn of recentTxns) {
      txnKeyRef.current++;
      const [r, g, b] = txn.color;
      toast(`${txn.teamName} painted (${txn.x}, ${txn.y})`, {
        duration: 3000,
        style: { borderLeft: `3px solid rgb(${r},${g},${b})` },
      });
    }
  }, [recentTxns]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl border-2 border-black/10 dark:border-white/10 animate-pulse" />
          <div className="absolute inset-0 w-12 h-12 rounded-xl border-t-2 border-[#6432ff] animate-spin" />
        </div>
        <div className="text-sm text-muted-foreground animate-pulse">Connecting to Solana...</div>
      </div>
    );
  }

  const winner = !gameConfig?.roundActive && teamStats.length > 0
    ? [...teamStats].sort((a, b) => b.pixelCount - a.pixelCount)[0]
    : null;
  const hasWinner = winner && winner.pixelCount > 0;
  const isActive = gameConfig?.roundActive ?? false;

  return (
    <div className="space-y-4">
      {/* Battle Timer — dramatic countdown at top */}
      {isActive && (
        <BattleTimer
          roundEndTime={roundEndTime}
          round={gameConfig?.currentRound ?? 0}
          agentCount={teamStats.reduce((s, t) => s + t.agents.length, 0)}
        />
      )}

      {/* Winner banner */}
      {hasWinner && <WinnerBanner winner={winner} round={gameConfig?.currentRound ?? 0} />}

      {/* 3-column layout: Left sidebar | Canvas | Right sidebar */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {/* Left sidebar — Round info + Agents */}
        <div className="w-full xl:w-64 space-y-3 shrink-0 order-2 xl:order-1">
          <RoundInfoCard
            gameConfig={gameConfig}
            roundInfo={roundInfo}
            totalPlacements={canvasData?.totalPlacements}
            teamStats={teamStats}
          />
          <AgentList teamStats={teamStats} isActive={isActive} />
        </div>

        {/* Center — Canvas */}
        <div className="flex-1 min-w-0 flex justify-center order-1 xl:order-2">
          <PixelCanvas pixels={canvasData?.pixels ?? null} isActive={isActive} />
        </div>

        {/* Right sidebar — Leaderboard + Join */}
        <div className="w-full xl:w-64 space-y-3 shrink-0 order-3">
          <TeamLeaderboard teamStats={teamStats} />
          <JoinCard />
        </div>
      </div>
    </div>
  );
}

function BattleTimer({ roundEndTime, round, agentCount }: { roundEndTime: number | null; round: number; agentCount: number }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!roundEndTime) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, roundEndTime - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [roundEndTime]);

  const totalMs = remaining ?? 0;
  const totalSec = Math.ceil(totalMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const isExpired = remaining !== null && remaining <= 0;
  const isUrgent = remaining !== null && totalSec <= 15;
  const isCritical = remaining !== null && totalSec <= 5;
  const hasTimer = remaining !== null && roundEndTime !== null;

  // Progress percentage (assume max 10 min rounds)
  const pct = hasTimer && roundEndTime
    ? Math.max(0, Math.min(100, (totalMs / (roundEndTime - (roundEndTime - 600000))) * 100))
    : 100;

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-500 ${
        isCritical
          ? "battle-timer-critical"
          : isUrgent
          ? "battle-timer-urgent"
          : "battle-timer-normal"
      }`}
    >
      {/* Animated background bar */}
      {hasTimer && !isExpired && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-0 top-0 h-full transition-all duration-1000 ease-linear opacity-10"
            style={{
              width: `${Math.min(100, (totalMs / ((roundEndTime ?? 0) - Date.now() + totalMs)) * 100)}%`,
              background: isCritical
                ? "linear-gradient(90deg, #ef4444, #ff6432)"
                : isUrgent
                ? "linear-gradient(90deg, #ff6432, #ff6432)"
                : "linear-gradient(90deg, #6432ff, #32dc64)",
            }}
          />
        </div>
      )}

      {/* Scan line when urgent */}
      {isUrgent && !isExpired && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent animate-scan-line" />
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between px-5 py-3">
        {/* Left: round info + live dot */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: isCritical ? "#ef4444" : isUrgent ? "#ff6432" : "#32dc64" }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: isCritical ? "#ef4444" : isUrgent ? "#ff6432" : "#32dc64" }}
            />
          </span>
          <div>
            <div className="text-sm font-bold tracking-tight">
              Round {round}
              <span className="ml-2 text-[10px] font-mono font-normal text-muted-foreground uppercase tracking-wider">
                Live
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {agentCount} agent{agentCount !== 1 ? "s" : ""} competing
            </div>
          </div>
        </div>

        {/* Center: countdown digits */}
        {hasTimer ? (
          <div className="flex items-center gap-1">
            {isExpired ? (
              <div className="flex items-center gap-2 animate-pulse">
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                  Ending round...
                </span>
              </div>
            ) : (
              <>
                <TimerDigit value={String(mins).padStart(2, "0")} isCritical={isCritical} isUrgent={isUrgent} />
                <span className={`text-xl font-mono font-bold mx-0.5 ${isCritical ? "text-red-400" : isUrgent ? "text-[#ff6432]" : "text-foreground/60"} ${!isExpired ? "animate-blink" : ""}`}>
                  :
                </span>
                <TimerDigit value={String(secs).padStart(2, "0")} isCritical={isCritical} isUrgent={isUrgent} />
              </>
            )}
          </div>
        ) : (
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            In progress
          </div>
        )}

        {/* Right: urgency label */}
        <div className="flex items-center gap-2">
          {hasTimer && !isExpired && (
            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md border transition-all duration-300 ${
              isCritical
                ? "text-red-400 border-red-500/30 bg-red-500/10 animate-pulse"
                : isUrgent
                ? "text-[#ff6432] border-[#ff6432]/30 bg-[#ff6432]/10"
                : "text-[#32dc64] border-[#32dc64]/20 bg-[#32dc64]/10"
            }`}>
              {isCritical ? "Final seconds" : isUrgent ? "Hurry!" : "Active"}
            </span>
          )}
        </div>
      </div>

      {/* Bottom progress bar */}
      {hasTimer && !isExpired && (
        <div className="h-[2px] bg-black/[0.06] dark:bg-white/[0.06]">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.min(100, (totalMs / ((roundEndTime ?? 0) - Date.now() + totalMs)) * 100)}%`,
              background: isCritical
                ? "linear-gradient(90deg, #ef4444, #ff6432)"
                : isUrgent
                ? "linear-gradient(90deg, #ff6432, #ffa500)"
                : "linear-gradient(90deg, #6432ff, #32dc64)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function TimerDigit({ value, isCritical, isUrgent }: { value: string; isCritical: boolean; isUrgent: boolean }) {
  return (
    <div
      className={`font-mono text-2xl font-black tabular-nums tracking-tight transition-colors duration-300 ${
        isCritical
          ? "text-red-400 animate-countdown-pulse"
          : isUrgent
          ? "text-[#ff6432]"
          : "text-foreground"
      }`}
    >
      {value}
    </div>
  );
}

function WinnerBanner({ winner, round }: { winner: { name: string; color: [number, number, number]; pixelCount: number }; round: number }) {
  const [r, g, b] = winner.color;
  const rgb = `${r},${g},${b}`;

  return (
    <div
      className="relative rounded-xl border-2 px-5 py-3 overflow-hidden animate-fade-in-up flex items-center gap-4"
      style={{
        borderColor: `rgba(${rgb}, 0.3)`,
        background: `linear-gradient(135deg, rgba(${rgb}, 0.1), rgba(${rgb}, 0.03))`,
      }}
    >
      <div
        className="absolute inset-0 animate-shimmer opacity-20 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${rgb}, 0.12), transparent)`,
          backgroundSize: "200% 100%",
        }}
      />
      <div className="relative z-10 flex items-center gap-4 w-full">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `rgba(${rgb}, 0.15)`, color: `rgb(${rgb})` }}
        >
          🏆
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold tracking-tight" style={{ color: `rgb(${rgb})` }}>
            {winner.name} <span className="text-foreground/60 font-normal text-sm">wins Round {round}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {winner.pixelCount.toLocaleString()} pixels claimed &mdash; waiting for next round
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinCard() {
  const [origin, setOrigin] = useState("https://pixel-wars.allensaji.dev");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const curlCmd = `curl -s ${origin}/api/game | jq .`;

  return (
    <div className="rounded-xl overflow-hidden card-hover glass-card">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-[#ff6432]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          <h3 className="text-sm font-bold text-foreground">Deploy Your Agent</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Give this to your AI agent — it has everything needed to join the battle.
        </p>

        <div className="rounded-lg bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.08] dark:border-white/[0.1] p-2.5">
          <CopyButton text={curlCmd} />
        </div>

        <p className="text-[10px] text-muted-foreground mt-2.5 leading-relaxed">
          Returns program ID, RPC endpoints, team info, PDA seeds, and step-by-step instructions for <code className="text-[#ff6432] font-medium bg-black/[0.05] dark:bg-white/[0.08] px-1 rounded">register_agent</code> + <code className="text-[#32dc64] font-medium bg-black/[0.05] dark:bg-white/[0.08] px-1 rounded">place_pixel</code>.
        </p>
      </div>
    </div>
  );
}
