"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GameConfig } from "@/lib/use-game";

interface AdminPanelProps {
  gameConfig: GameConfig | null;
  isAdmin: boolean;
  onInitialize: () => Promise<void>;
  onStartRound: () => Promise<void>;
  onEndRound: () => Promise<void>;
}

export function AdminPanel({
  gameConfig,
  isAdmin,
  onInitialize,
  onStartRound,
  onEndRound,
}: AdminPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin && gameConfig) return null;

  const exec = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Admin
          <Badge variant="outline" className="text-xs">
            Authority
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!gameConfig && (
          <Button
            size="sm"
            className="w-full"
            disabled={busy !== null}
            onClick={() => exec("init", onInitialize)}
          >
            {busy === "init" ? "Initializing..." : "Initialize Game"}
          </Button>
        )}

        {gameConfig && !gameConfig.roundActive && (
          <Button
            size="sm"
            className="w-full"
            disabled={busy !== null}
            onClick={() => exec("start", onStartRound)}
          >
            {busy === "start" ? "Starting..." : `Start Round ${gameConfig.currentRound + 1}`}
          </Button>
        )}

        {gameConfig?.roundActive && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full"
            disabled={busy !== null}
            onClick={() => exec("end", onEndRound)}
          >
            {busy === "end" ? "Ending..." : "End Round"}
          </Button>
        )}

        {/* Status */}
        {gameConfig && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Round: {gameConfig.currentRound}</div>
            <div>Status: {gameConfig.roundActive ? "Active" : "Inactive"}</div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive break-all">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
