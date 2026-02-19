"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerStatsData } from "@/lib/use-game";
import { PLACEMENT_COOLDOWN_MS } from "@/lib/constants";

interface PlayerStatsCardProps {
  stats: PlayerStatsData | null;
  cooldownEnd: number;
  connected: boolean;
  ephemeralKey?: string;
}

export function PlayerStatsCard({
  stats,
  cooldownEnd,
  connected,
  ephemeralKey,
}: PlayerStatsCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const cooldownRemaining = Math.max(0, cooldownEnd - now);
  const cooldownPct =
    cooldownRemaining > 0 ? (cooldownRemaining / PLACEMENT_COOLDOWN_MS) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Your Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!connected && (
          <p className="text-muted-foreground text-xs">
            Connect wallet for admin actions. Pixel placement works without
            wallet — uses an ephemeral key.
          </p>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Pixels Placed</span>
          <span className="font-mono">{stats?.pixelsPlaced ?? 0}</span>
        </div>

        {/* Cooldown bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cooldown</span>
            <span className="font-mono">
              {cooldownRemaining > 0
                ? `${(cooldownRemaining / 1000).toFixed(1)}s`
                : "Ready"}
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${100 - cooldownPct}%` }}
            />
          </div>
        </div>

        {ephemeralKey && (
          <div className="text-xs text-muted-foreground pt-1 border-t border-border">
            <span>Session key: </span>
            <span className="font-mono">
              {ephemeralKey.slice(0, 4)}...{ephemeralKey.slice(-4)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
