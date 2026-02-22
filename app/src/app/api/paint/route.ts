import { NextRequest, NextResponse } from "next/server";
import { Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { TEAMS, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/constants";
import { findConfigPDA, findCanvasPDA, findAgentRegistrationPDA } from "@/lib/pda";
import { agentTeamMap } from "@/lib/treasury";
import { getProgram, getL1Connection, getERConnection } from "@/lib/program";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, x, y } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "apiKey required" }, { status: 400 });
    }
    if (typeof x !== "number" || typeof y !== "number" || x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      return NextResponse.json({ error: `x must be 0-${CANVAS_WIDTH - 1}, y must be 0-${CANVAS_HEIGHT - 1}` }, { status: 400 });
    }

    // Reconstruct keypair from apiKey
    let agent: Keypair;
    try {
      agent = Keypair.fromSecretKey(bs58.decode(apiKey));
    } catch {
      return NextResponse.json({ error: "Invalid apiKey" }, { status: 400 });
    }

    const pubkey = agent.publicKey.toBase58();
    const l1 = getL1Connection();
    const er = getERConnection();

    // Get current round
    const [configPDA] = findConfigPDA();
    const configInfo = await l1.getAccountInfo(configPDA);
    if (!configInfo) {
      return NextResponse.json({ error: "Game not initialized" }, { status: 503 });
    }
    const view = new DataView(configInfo.data.buffer, configInfo.data.byteOffset, configInfo.data.byteLength);
    const currentRound = view.getUint32(40, true);
    const roundActive = configInfo.data[44] === 1;

    if (!roundActive) {
      return NextResponse.json({ error: "No active round" }, { status: 400 });
    }

    // Resolve team
    let teamId = agentTeamMap.get(pubkey);
    if (teamId === undefined) {
      // Look up from registration PDA on L1
      const [regPDA] = findAgentRegistrationPDA(currentRound, agent.publicKey);
      const regInfo = await l1.getAccountInfo(regPDA);
      if (!regInfo) {
        return NextResponse.json({ error: "Agent not registered. Call /api/join first." }, { status: 400 });
      }
      // Registration layout after 8-byte discriminator: agent(32) + round(4) + team_id(1)
      teamId = regInfo.data[44];
      agentTeamMap.set(pubkey, teamId);
    }

    const team = TEAMS[teamId];
    const [r, g, b] = team.color;
    const [canvasPDA] = findCanvasPDA(currentRound);

    // Build place_pixel tx on ER
    const program = getProgram(er, agent);
    const ix = await program.methods
      .placePixel(x, y, r, g, b, teamId)
      .accountsPartial({
        agent: agent.publicKey,
        gameConfig: configPDA,
        canvas: canvasPDA,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = agent.publicKey;
    tx.recentBlockhash = (await er.getLatestBlockhash()).blockhash;
    tx.sign(agent);

    const sig = await er.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
    });

    return NextResponse.json({
      success: true,
      pixel: { x, y, color: [r, g, b] },
      team: team.name,
      signature: sig,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/paint error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
