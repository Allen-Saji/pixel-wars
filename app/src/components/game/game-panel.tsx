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
      {/* Winner / Status banner — full width */}
      {hasWinner && <WinnerBanner winner={winner} round={gameConfig?.currentRound ?? 0} />}

      {isActive && !hasWinner && (
        <div className="flex items-center gap-3 px-1">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#32dc64] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#32dc64]" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            Round {gameConfig?.currentRound} in progress
          </span>
          <span className="text-xs text-muted-foreground">
            &mdash; {teamStats.reduce((s, t) => s + t.agents.length, 0)} agents competing
          </span>
        </div>
      )}

      {/* 3-column layout: Left sidebar | Canvas | Right sidebar */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {/* Left sidebar — Round info + Agents */}
        <div className="w-full xl:w-64 space-y-3 shrink-0 order-2 xl:order-1">
          <RoundInfoCard
            gameConfig={gameConfig}
            roundInfo={roundInfo}
            totalPlacements={canvasData?.totalPlacements}
            teamStats={teamStats}
            roundEndTime={roundEndTime}
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
  const [origin, setOrigin] = useState("https://pixel-wars.dev");
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
