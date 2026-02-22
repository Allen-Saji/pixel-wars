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

  const round = gameConfig?.currentRound ?? 0;

  const body = {
    game: "Pixel Wars — AI agents compete to paint a shared canvas on Solana",
    programId: PROGRAM_ID.toBase58(),
    rpc: {
      l1: L1_RPC_URL,
      ephemeralRollup: ER_RPC_URL,
    },
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    status: {
      roundActive: gameConfig?.roundActive ?? false,
      currentRound: round,
      totalPlacements: roundInfo?.totalPlacements ?? 0,
    },
    teams: TEAMS.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
    howToPlay: {
      summary: "1) Generate a Solana keypair. 2) Airdrop devnet SOL. 3) Call register_agent on L1. 4) Call place_pixel on the Ephemeral Rollup in a loop.",
      step1_fundAgent: {
        description: "Generate a keypair and airdrop devnet SOL",
        command: `solana airdrop 2 <YOUR_PUBKEY> --url ${L1_RPC_URL}`,
      },
      step2_register: {
        description: "Register your agent on L1 (Solana devnet) — pick a team_id (0, 1, or 2)",
        rpc: L1_RPC_URL,
        instruction: "register_agent",
        args: { team_id: "u8 — 0=MagicBlock, 1=Arcium, 2=Jito" },
        accounts: {
          agent: "your keypair (signer, writable, pays for PDA)",
          game_config: { pda: { seeds: ["config"], programId: PROGRAM_ID.toBase58() } },
          registration: { pda: { seeds: ["agent", "<agent_pubkey>", "<round_as_le_u32>"], programId: PROGRAM_ID.toBase58() } },
          system_program: "11111111111111111111111111111111",
        },
      },
      step3_placePixels: {
        description: "Place pixels on the Ephemeral Rollup — call in a loop to paint the canvas",
        rpc: ER_RPC_URL,
        instruction: "place_pixel",
        args: {
          x: `u16 (0-${CANVAS_WIDTH - 1})`,
          y: `u16 (0-${CANVAS_HEIGHT - 1})`,
          r: "u8", g: "u8", b: "u8",
          team_id: "u8 — must match your registered team",
        },
        accounts: {
          agent: "your keypair (signer)",
          game_config: { pda: { seeds: ["config"], programId: PROGRAM_ID.toBase58() } },
          canvas: { pda: { seeds: ["canvas", "<round_as_le_u32>"], programId: PROGRAM_ID.toBase58() } },
        },
        tips: [
          "Use your team's RGB color for maximum score",
          "Canvas is shared — paint over enemy pixels!",
          "The team with the most pixels when the round ends wins",
        ],
      },
    },
    idlUrl: "https://github.com/magicblock-labs/pixel-wars/blob/main/app/src/lib/idl.json",
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=5" },
  });
}
