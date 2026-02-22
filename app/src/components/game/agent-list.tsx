"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamStats } from "@/lib/use-game";

interface AgentListProps {
  teamStats: TeamStats[];
}

export function AgentList({ teamStats }: AgentListProps) {
  const totalAgents = teamStats.reduce((sum, t) => sum + t.agents.length, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Registered Agents
          <Badge variant="secondary" className="font-mono">
            {totalAgents}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {teamStats.map((team) => (
          <div key={team.teamId}>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{
                  backgroundColor: `rgb(${team.color.join(",")})`,
                }}
              />
              <span className="text-xs font-medium">{team.name}</span>
            </div>
            {team.agents.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-3.5">No agents</p>
            ) : (
              <div className="space-y-0.5 pl-3.5">
                {team.agents.map((agent) => (
                  <div
                    key={agent.pubkey}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-muted-foreground">
                      {agent.pubkey.slice(0, 4)}...{agent.pubkey.slice(-4)}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(agent.registeredAt * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
