"use client";

import { useState, useCallback } from "react";
import type { TeamStats } from "@/lib/use-game";

interface AgentListProps {
  teamStats: TeamStats[];
  isActive?: boolean;
}

export function AgentList({ teamStats, isActive }: AgentListProps) {
  const totalAgents = teamStats.reduce((sum, t) => sum + t.agents.length, 0);

  return (
    <div className="rounded-xl overflow-hidden card-hover glass-card">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agents</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground">
          {totalAgents}
        </span>
      </div>
      <div className="px-4 pb-4 space-y-3">
        {teamStats.map((team) => {
          const [r, g, b] = team.color;
          const rgb = `${r},${g},${b}`;
          return (
            <div key={team.teamId}>
              <div className="flex items-center gap-1.5 mb-1.5">
                {/* Pulsing dot when active */}
                {isActive && team.agents.length > 0 ? (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                      style={{ backgroundColor: `rgb(${rgb})` }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: `rgb(${rgb})` }}
                    />
                  </span>
                ) : (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 opacity-50"
                    style={{ backgroundColor: `rgb(${rgb})` }}
                  />
                )}
                <span className="text-xs font-medium">{team.name}</span>
              </div>
              {team.agents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 pl-3.5 italic">No agents deployed</p>
              ) : (
                <div className="space-y-0.5 pl-3.5">
                  {team.agents.map((agent) => (
                    <AgentRow key={agent.pubkey} pubkey={agent.pubkey} rgb={rgb} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentRow({ pubkey, rgb }: { pubkey: string; rgb: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(pubkey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [pubkey]);

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center justify-between w-full text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03] rounded px-1 py-0.5 -mx-1 transition-colors"
      title="Copy full address"
    >
      <span className="font-mono text-[11px] text-muted-foreground">
        {pubkey.slice(0, 4)}<span className="text-foreground/20">...</span>{pubkey.slice(-4)}
      </span>
      <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <span style={{ color: `rgb(${rgb})` }}>copied</span>
        ) : (
          <span className="text-muted-foreground">copy</span>
        )}
      </span>
    </button>
  );
}
