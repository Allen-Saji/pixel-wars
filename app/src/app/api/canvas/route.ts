import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import {
  L1_RPC_URL,
  ER_RPC_URL,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BYTES_PER_PIXEL,
  CANVAS_PIXELS_OFFSET,
} from "@/lib/constants";
import { findConfigPDA, findCanvasPDA } from "@/lib/pda";

export async function GET() {
  try {
    const l1 = new Connection(L1_RPC_URL, "confirmed");
    const er = new Connection(ER_RPC_URL, "confirmed");

    // Get current round
    const [configPDA] = findConfigPDA();
    const configInfo = await l1.getAccountInfo(configPDA);
    if (!configInfo) {
      return NextResponse.json({ error: "Game not initialized" }, { status: 503 });
    }
    const view = new DataView(configInfo.data.buffer, configInfo.data.byteOffset, configInfo.data.byteLength);
    const currentRound = view.getUint32(40, true);

    const [canvasPDA] = findCanvasPDA(currentRound);

    // Try ER first, fall back to L1
    let canvasInfo = await er.getAccountInfo(canvasPDA).catch(() => null);
    if (!canvasInfo) {
      canvasInfo = await l1.getAccountInfo(canvasPDA);
    }
    if (!canvasInfo) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const data = canvasInfo.data;
    const pixels: [number, number, number][] = [];

    for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i++) {
      const offset = CANVAS_PIXELS_OFFSET + i * BYTES_PER_PIXEL;
      pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
    }

    return NextResponse.json({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      round: currentRound,
      pixels,
    }, {
      headers: { "Cache-Control": "public, s-maxage=2" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/canvas error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
