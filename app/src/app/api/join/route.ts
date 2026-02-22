import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";
import { TEAMS } from "@/lib/constants";
import { findConfigPDA, findAgentRegistrationPDA } from "@/lib/pda";
import { getTreasuryKeypair, agentTeamMap } from "@/lib/treasury";
import { getProgram, getL1Connection } from "@/lib/program";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const teamId = body.team;

    if (typeof teamId !== "number" || teamId < 0 || teamId > 2) {
      return NextResponse.json({ error: "team must be 0, 1, or 2" }, { status: 400 });
    }

    const treasury = getTreasuryKeypair();
    const l1 = getL1Connection();

    // Check round is active
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

    // Generate new agent keypair
    const agent = Keypair.generate();

    // Fund agent from treasury (0.05 SOL)
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: agent.publicKey,
        lamports: Math.floor(0.05 * LAMPORTS_PER_SOL),
      })
    );
    await sendAndConfirmTransaction(l1, fundTx, [treasury]);

    // Register agent on L1
    const program = getProgram(l1, agent);
    const [regPDA] = findAgentRegistrationPDA(currentRound, agent.publicKey);

    try {
      await program.methods
        .registerAgent(teamId)
        .accountsPartial({
          agent: agent.publicKey,
          gameConfig: configPDA,
          registration: regPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already in use")) {
        return NextResponse.json({ error: "Agent already registered" }, { status: 409 });
      }
      throw e;
    }

    const apiKey = bs58.encode(agent.secretKey);
    const team = TEAMS[teamId];

    // Store team mapping
    agentTeamMap.set(agent.publicKey.toBase58(), teamId);

    return NextResponse.json({
      agentId: agent.publicKey.toBase58(),
      apiKey,
      team: { id: team.id, name: team.name, color: team.color },
      round: currentRound,
      message: `Agent registered for team ${team.name}! Use apiKey in /api/paint to place pixels.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/join error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
