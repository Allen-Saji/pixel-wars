import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

// Use /tmp for persistence across warm serverless invocations on Vercel
// Also keep in-memory as fast-path for same-instance requests
const TIMER_FILE = "/tmp/pixelwars-timer.json";

let timerCache: { round: number; endTime: number } | null = null;

function readTimer(): { round: number; endTime: number } | null {
  // Try memory first
  if (timerCache) return timerCache;
  // Fall back to /tmp file
  try {
    const data = JSON.parse(readFileSync(TIMER_FILE, "utf-8"));
    if (data?.endTime) {
      timerCache = data;
      return data;
    }
  } catch {}
  return null;
}

function writeTimer(data: { round: number; endTime: number } | null) {
  timerCache = data;
  try {
    writeFileSync(TIMER_FILE, JSON.stringify(data ?? { endTime: null }));
  } catch {}
}

export async function GET() {
  const timer = readTimer();
  // Auto-clear expired timers (5min grace)
  if (timer && Date.now() > timer.endTime + 300_000) {
    writeTimer(null);
    return NextResponse.json({ endTime: null });
  }
  return NextResponse.json(timer ?? { endTime: null });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { round, endTime } = body;
  writeTimer({ round, endTime });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  writeTimer(null);
  return NextResponse.json({ ok: true });
}
