import { NextResponse } from "next/server";

// In-memory timer store (survives across requests in the same serverless instance)
// For production with multiple instances, use Vercel KV or Redis
let timerData: { round: number; endTime: number } | null = null;

export async function GET() {
  // Auto-clear expired timers (5min grace)
  if (timerData && Date.now() > timerData.endTime + 300_000) {
    timerData = null;
  }
  return NextResponse.json(timerData ?? { endTime: null });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { round, endTime } = body;
  timerData = { round, endTime };
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  timerData = null;
  return NextResponse.json({ ok: true });
}
