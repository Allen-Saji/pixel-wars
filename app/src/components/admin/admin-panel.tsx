"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GameConfig } from "@/lib/use-game";

const DURATION_OPTIONS = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "6 hours", ms: 6 * 60 * 60_000 },
  { label: "24 hours", ms: 24 * 60 * 60_000 },
];

const TIMER_KEY = "pixelwars_timer";

interface AdminPanelProps {
  gameConfig: GameConfig | null;
  isAdmin: boolean;
  onInitialize: () => Promise<void>;
  onStartRound: () => Promise<void>;
  onDelegateCanvas: () => Promise<void>;
  onEndRound: () => Promise<void>;
}

export function AdminPanel({
  gameConfig,
  isAdmin,
  onInitialize,
  onStartRound,
  onDelegateCanvas,
  onEndRound,
}: AdminPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(DURATION_OPTIONS[2].ms); // default 15 min

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
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">Duration</label>
              <select
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                value={durationMs}
                onChange={(e) => setDurationMs(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.ms} value={opt.ms}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                exec("start", async () => {
                  await onStartRound();
                  const nextRound = (gameConfig.currentRound ?? 0) + 1;
                  const endTime = Date.now() + durationMs;
                  localStorage.setItem(TIMER_KEY, JSON.stringify({ round: nextRound, endTime }));
                })
              }
            >
              {busy === "start" ? "Starting..." : `Start Round ${gameConfig.currentRound + 1}`}
            </Button>
          </>
        )}

        {gameConfig?.roundActive && (
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={busy !== null}
            onClick={() => exec("delegate", onDelegateCanvas)}
          >
            {busy === "delegate" ? "Delegating..." : "Delegate Canvas to ER"}
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
