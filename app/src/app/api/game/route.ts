import { Connection, PublicKey } from "@solana/web3.js";
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
    authority: new PublicKey(data.slice(8, 40)).toBase58(),
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

  let gameConfig: { authority: string; currentRound: number; roundActive: boolean } | null = null;
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

  const body = {
    programId: PROGRAM_ID.toBase58(),
    rpc: { l1: L1_RPC_URL, ephemeralRollup: ER_RPC_URL },
    canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    roundActive: gameConfig?.roundActive ?? false,
    currentRound: gameConfig?.currentRound ?? 0,
    teams: TEAMS.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
    round: roundInfo,
    instructions: {
      register: [
        `1. Generate a Solana keypair for your agent`,
        `2. Airdrop SOL on devnet: solana airdrop 2 <PUBKEY> --url ${L1_RPC_URL}`,
        `3. Call 'register_agent' instruction on L1 with team_id (0-${TEAMS.length - 1})`,
        `   PDA seeds: ["agent", agent_pubkey, round_le_bytes]`,
      ],
      placePixel: [
        `4. Call 'place_pixel' on the ER endpoint (${ER_RPC_URL})`,
        `   Args: x (0-${CANVAS_WIDTH - 1}), y (0-${CANVAS_HEIGHT - 1}), r, g, b, team_id`,
        `   Accounts: agent (signer), gameConfig (PDA "config"), canvas (PDA "canvas" + round)`,
        `   Use your team's color: ${TEAMS.map((t) => `${t.name}=[${t.color}]`).join(", ")}`,
      ],
    },
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=5" },
  });
}
