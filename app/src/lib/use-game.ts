"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  findConfigPDA,
  findCanvasPDA,
  findRoundPDA,
} from "./pda";
import { parseCanvasAccount, type CanvasData } from "./canvas-reader";
import {
  CANVAS_WIDTH,
  BYTES_PER_PIXEL,
  PROGRAM_ID,
  L1_RPC_URL,
  ER_RPC_URL,
  TEAMS,
} from "./constants";

export interface GameConfig {
  authority: string;
  currentRound: number;
  roundActive: boolean;
}

export interface RoundInfo {
  roundNumber: number;
  startSlot: number;
  endSlot: number;
  totalPlacements: number;
  ended: boolean;
}

export interface AgentInfo {
  pubkey: string;
  round: number;
  teamId: number;
  registeredAt: number;
}

export interface TeamStats {
  teamId: number;
  name: string;
  color: [number, number, number];
  pixelCount: number;
  agents: AgentInfo[];
}

export interface RecentTxn {
  x: number;
  y: number;
  teamName: string;
  color: [number, number, number];
  timestamp: number;
}

// ─── Manual Borsh decoders ─────────────────────────────────────────────────

const DISC_AGENT_REG = new Uint8Array([130, 53, 100, 103, 121, 77, 148, 19]);

function toBase58(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const B256 = BigInt(256);
  const B58 = BigInt(58);
  const B0 = BigInt(0);
  let num = B0;
  for (const b of bytes) num = num * B256 + BigInt(b);
  let str = "";
  while (num > B0) { str = ALPHABET[Number(num % B58)] + str; num /= B58; }
  for (const b of bytes) { if (b === 0) str = "1" + str; else break; }
  return str || "1";
}

function decodeConfig(data: Uint8Array): GameConfig | null {
  try {
    if (data.length < 46) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const authority = new PublicKey(data.slice(8, 40));
    const currentRound = view.getUint32(40, true);
    const roundActive = data[44] === 1;
    return { authority: authority.toBase58(), currentRound, roundActive };
  } catch {
    return null;
  }
}

function decodeRound(data: Uint8Array): RoundInfo | null {
  try {
    if (data.length < 30) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const roundNumber = view.getUint32(8, true);
    const startSlot = Number(view.getBigUint64(12, true));
    const endSlot = Number(view.getBigUint64(20, true));
    const totalPlacements = Number(view.getBigUint64(28, true));
    const ended = data[36] === 1;
    return { roundNumber, startSlot, endSlot, totalPlacements, ended };
  } catch {
    return null;
  }
}

function decodeAgentRegistration(data: Uint8Array): { agent: string; round: number; teamId: number; registeredAt: number } | null {
  try {
    if (data.length < 54) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const agent = new PublicKey(data.slice(8, 40));
    const round = view.getUint32(40, true);
    const teamId = data[44];
    const registeredAt = Number(view.getBigInt64(45, true));
    return { agent: agent.toBase58(), round, teamId, registeredAt };
  } catch {
    return null;
  }
}

function computeTeamStats(pixels: Uint8Array, agents: AgentInfo[]): TeamStats[] {
  return TEAMS.map((team) => {
    const [tr, tg, tb] = team.color;
    let pixelCount = 0;
    for (let i = 0; i < pixels.length; i += BYTES_PER_PIXEL) {
      if (pixels[i] === tr && pixels[i + 1] === tg && pixels[i + 2] === tb) pixelCount++;
    }
    return {
      teamId: team.id, name: team.name, color: team.color, pixelCount,
      agents: agents.filter((a) => a.teamId === team.id),
    };
  });
}

// Module-level singletons
const [configPDA] = findConfigPDA();
const l1Connection = new Connection(L1_RPC_URL, "confirmed");
const erConnection = new Connection(ER_RPC_URL, {
  commitment: "confirmed",
  wsEndpoint: ER_RPC_URL.replace("https://", "wss://"),
});

export function useGame() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentTxns, setRecentTxns] = useState<RecentTxn[]>([]);
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);

  const prevPixelsRef = useRef<Uint8Array | null>(null);

  // Apply raw canvas buffer to state + diff for tx feed
  const applyCanvasData = useCallback((raw: Buffer | Uint8Array) => {
    const parsed = parseCanvasAccount(raw);
    const prev = prevPixelsRef.current;

    if (prev && prev.length === parsed.pixels.length) {
      const newTxns: RecentTxn[] = [];
      for (let i = 0; i < parsed.pixels.length; i += BYTES_PER_PIXEL) {
        const r = parsed.pixels[i], g = parsed.pixels[i + 1], b = parsed.pixels[i + 2];
        if (r !== prev[i] || g !== prev[i + 1] || b !== prev[i + 2]) {
          const pixelIdx = i / BYTES_PER_PIXEL;
          const x = pixelIdx % CANVAS_WIDTH;
          const y = Math.floor(pixelIdx / CANVAS_WIDTH);
          let teamName = "Unknown";
          let color: [number, number, number] = [r, g, b];
          for (const team of TEAMS) {
            if (r === team.color[0] && g === team.color[1] && b === team.color[2]) {
              teamName = team.name;
              color = team.color;
              break;
            }
          }
          newTxns.push({ x, y, teamName, color, timestamp: Date.now() });
        }
      }
      if (newTxns.length > 0 && newTxns.length <= 50) {
        setRecentTxns(newTxns.slice(-3));
      }
    }

    prevPixelsRef.current = new Uint8Array(parsed.pixels);
    setCanvasData(parsed);
  }, []);

  const fetchAgents = useCallback(async (round: number) => {
    try {
      const accts = await l1Connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: toBase58(DISC_AGENT_REG) } },
        ],
      });
      const parsed: AgentInfo[] = [];
      for (const { account } of accts) {
        const reg = decodeAgentRegistration(account.data);
        if (reg && reg.round === round) {
          parsed.push({ pubkey: reg.agent, round: reg.round, teamId: reg.teamId, registeredAt: reg.registeredAt });
        }
      }
      setAgents(parsed);
    } catch (e) {
      console.error("Failed to fetch agents:", e);
    }
  }, []);

  // Recompute team stats when canvas or agents change
  useEffect(() => {
    if (canvasData?.pixels) {
      setTeamStats(computeTeamStats(canvasData.pixels, agents));
    }
  }, [canvasData, agents]);

  // ─── Effect 1: Config subscription (runs once) ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const info = await l1Connection.getAccountInfo(configPDA);
        if (info && !cancelled) {
          const gc = decodeConfig(info.data);
          setGameConfig(gc);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }

    fetchConfig();

    const sub = l1Connection.onAccountChange(
      configPDA,
      (info) => {
        const gc = decodeConfig(info.data);
        setGameConfig(gc);
      },
      "confirmed"
    );

    return () => {
      cancelled = true;
      l1Connection.removeAccountChangeListener(sub);
    };
  }, []);

  // ─── Effect 2: Round data + canvas subscriptions (re-runs on round change) ──
  const currentRound = gameConfig?.currentRound ?? 0;

  useEffect(() => {
    if (currentRound === 0) return;

    const subs: { id: number; conn: Connection }[] = [];
    let cancelled = false;

    // Reset canvas for new round
    prevPixelsRef.current = null;
    setCanvasData(null);
    setRoundInfo(null);
    setAgents([]);

    const [canvasPDA] = findCanvasPDA(currentRound);
    const [roundPDA] = findRoundPDA(currentRound);

    async function fetchRoundData() {
      console.log("[use-game] Fetching round", currentRound, "canvas:", canvasPDA.toBase58());
      console.log("[use-game] ER:", ER_RPC_URL);

      // Fetch canvas from ER, fallback L1
      try {
        let info = await erConnection.getAccountInfo(canvasPDA).catch((e: any) => {
          console.error("[use-game] ER canvas fetch failed:", e.message);
          return null;
        });
        console.log("[use-game] ER canvas:", info ? `found (${info.data.length} bytes)` : "null");
        if (!info) {
          info = await l1Connection.getAccountInfo(canvasPDA);
          console.log("[use-game] L1 canvas fallback:", info ? `found (${info.data.length} bytes)` : "null");
        }
        if (info && !cancelled) applyCanvasData(info.data);
      } catch (e: any) {
        console.error("[use-game] Canvas fetch error:", e.message);
      }

      // Fetch round from L1
      try {
        const info = await l1Connection.getAccountInfo(roundPDA);
        console.log("[use-game] Round info:", info ? "found" : "null");
        if (info && !cancelled) {
          const ri = decodeRound(info.data);
          if (ri) setRoundInfo(ri);
        }
      } catch (e: any) {
        console.error("[use-game] Round fetch error:", e.message);
      }

      // Fetch agents
      if (!cancelled) await fetchAgents(currentRound);

      if (cancelled) return;

      // Subscribe canvas on ER
      const canvasSub = erConnection.onAccountChange(
        canvasPDA,
        (info) => {
          console.log("[use-game] Canvas update from ER sub");
          applyCanvasData(info.data);
        },
        "confirmed"
      );
      subs.push({ id: canvasSub, conn: erConnection });

      // Subscribe round on L1
      const roundSub = l1Connection.onAccountChange(
        roundPDA,
        (info) => {
          const ri = decodeRound(info.data);
          if (ri) setRoundInfo(ri);
        },
        "confirmed"
      );
      subs.push({ id: roundSub, conn: l1Connection });
    }

    fetchRoundData();

    return () => {
      cancelled = true;
      subs.forEach((s) => s.conn.removeAccountChangeListener(s.id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound]);

  // Poll timer from API
  useEffect(() => {
    if (!gameConfig?.roundActive) { setRoundEndTime(null); return; }
    const fetchTimer = async () => {
      try {
        const res = await fetch("/api/timer");
        const data = await res.json();
        if (data.round === gameConfig.currentRound && data.endTime) {
          setRoundEndTime(data.endTime);
        } else {
          setRoundEndTime(null);
        }
      } catch { setRoundEndTime(null); }
    };
    fetchTimer();
    const id = setInterval(fetchTimer, 5000);
    return () => clearInterval(id);
  }, [gameConfig]);

  // Periodically refresh agents (every 30s)
  useEffect(() => {
    if (currentRound === 0) return;
    const interval = setInterval(() => fetchAgents(currentRound), 30000);
    return () => clearInterval(interval);
  }, [currentRound, fetchAgents]);

  return {
    gameConfig,
    canvasData,
    roundInfo,
    agents,
    teamStats,
    loading,
    recentTxns,
    roundEndTime,
  };
}
