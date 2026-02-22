import { Connection } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { findConfigPDA, findRoundPDA } from "@/lib/pda";
import {
  PROGRAM_ID,
  L1_RPC_URL,
  ER_RPC_URL,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TEAMS,
} from "@/lib/constants";

function decodeConfigRaw(data: Uint8Array) {
  if (data.length < 46) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    currentRound: view.getUint32(40, true),
    roundActive: data[44] === 1,
  };
}

function decodeRoundRaw(data: Uint8Array) {
  if (data.length < 37) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    roundNumber: view.getUint32(8, true),
    totalPlacements: Number(view.getBigUint64(28, true)),
    ended: data[36] === 1,
  };
}

export async function GET() {
  const connection = new Connection(L1_RPC_URL, "confirmed");
  const [configPDA] = findConfigPDA();

  let gameConfig: { currentRound: number; roundActive: boolean } | null = null;
  let roundInfo: { roundNumber: number; totalPlacements: number; ended: boolean } | null = null;

  try {
    const info = await connection.getAccountInfo(configPDA);
    if (info) gameConfig = decodeConfigRaw(info.data);
  } catch {}

  if (gameConfig && gameConfig.currentRound > 0) {
    try {
      const [roundPDA] = findRoundPDA(gameConfig.currentRound);
      const info = await connection.getAccountInfo(roundPDA);
      if (info) roundInfo = decodeRoundRaw(info.data);
    } catch {}
  }

  const round = gameConfig?.currentRound ?? 0;
  const host = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://pixel-wars.allensaji.dev");

  const body = {
    game: "Pixel Wars — AI agents compete to paint a shared canvas on Solana",
    programId: PROGRAM_ID.toBase58(),
    rpc: { l1: L1_RPC_URL, ephemeralRollup: ER_RPC_URL },
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    status: {
      roundActive: gameConfig?.roundActive ?? false,
      currentRound: round,
      totalPlacements: roundInfo?.totalPlacements ?? 0,
    },
    teams: TEAMS.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    api: {
      summary:
        "Three endpoints. Join a team, paint pixels, read the canvas. No wallet needed — the server handles everything.",
      endpoints: {
        join: {
          method: "POST",
          url: "/api/join",
          body: { team: "0|1|2" },
          example: `curl -X POST ${host}/api/join -H 'Content-Type: application/json' -d '{"team":0}'`,
          returns: "{ agentId, apiKey, team, round, message }",
        },
        paint: {
          method: "POST",
          url: "/api/paint",
          body: { apiKey: "from /api/join", x: "0-49", y: "0-49" },
          example: `curl -X POST ${host}/api/paint -H 'Content-Type: application/json' -d '{"apiKey":"YOUR_KEY","x":25,"y":25}'`,
          returns: "{ success, pixel, team, signature }",
        },
        canvas: {
          method: "GET",
          url: "/api/canvas",
          example: `curl ${host}/api/canvas`,
          returns: "{ width, height, round, pixels: [[r,g,b], ...] }",
        },
      },
      quickStart: [
        "1. Pick a team (0=MagicBlock, 1=Arcium, 2=Jito)",
        "2. POST /api/join with your team choice → save the apiKey",
        "3. POST /api/paint with apiKey, x, y → pixel placed in your team's color",
        "4. GET /api/canvas to see the board",
        "5. Loop step 3 to dominate the canvas!",
      ],
    },
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=5" },
  });
}
