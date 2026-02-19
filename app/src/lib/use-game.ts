"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  SystemProgram,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getProgram } from "./program";
import {
  findConfigPDA,
  findCanvasPDA,
  findRoundPDA,
  findPlayerStatsPDA,
} from "./pda";
import { parseCanvasAccount, type CanvasData } from "./canvas-reader";
import {
  CANVAS_WIDTH,
  BYTES_PER_PIXEL,
  PLACEMENT_COOLDOWN_MS,
  ER_RPC_URL,
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

export interface PlayerStatsData {
  pixelsPlaced: number;
  lastPlacementSlot: number;
}

/**
 * Generate or retrieve a persistent ephemeral keypair from sessionStorage.
 * This keypair signs place_pixel txs so the user's wallet isn't prompted each time.
 */
function getEphemeralKeypair(): Keypair {
  const STORAGE_KEY = "pixel-wars-ephemeral-key";
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return Keypair.fromSecretKey(new Uint8Array(JSON.parse(stored)));
      } catch {
        // Corrupted, regenerate
      }
    }
  }
  const kp = Keypair.generate();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(kp.secretKey))
    );
  }
  return kp;
}

export function useGame() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [ephemeralFunded, setEphemeralFunded] = useState(false);

  const localPixelsRef = useRef<Map<string, [number, number, number]>>(
    new Map()
  );

  const [configPDA] = findConfigPDA();

  // Ephemeral keypair for signing place_pixel txs (no wallet popup)
  const ephemeralKeypair = useMemo(() => getEphemeralKeypair(), []);

  // ER connection (on localnet, same as L1)
  const erConnection = useMemo(
    () => new Connection(ER_RPC_URL, "confirmed"),
    []
  );

  // Fund ephemeral keypair from connected wallet (localnet needs SOL for fees)
  const fundEphemeral = useCallback(async () => {
    if (!wallet.publicKey || !wallet.sendTransaction) return;
    if (ephemeralFunded) return;

    // Check if ephemeral already has SOL
    const balance = await connection.getBalance(ephemeralKeypair.publicKey);
    if (balance > 0.01 * 1e9) {
      setEphemeralFunded(true);
      return;
    }

    // On localnet, airdrop directly to ephemeral
    const isLocalnet = ER_RPC_URL.includes("localhost") || ER_RPC_URL.includes("127.0.0.1");
    if (isLocalnet) {
      try {
        const sig = await connection.requestAirdrop(
          ephemeralKeypair.publicKey,
          0.5 * 1e9
        );
        await connection.confirmTransaction(sig, "confirmed");
        setEphemeralFunded(true);
        console.log(
          "[ephemeral] Airdropped 0.5 SOL to",
          ephemeralKeypair.publicKey.toBase58()
        );
        return;
      } catch (e) {
        console.warn("[ephemeral] Airdrop failed, trying wallet transfer", e);
      }
    }

    // Transfer from wallet to ephemeral
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: ephemeralKeypair.publicKey,
          lamports: 0.05 * 1e9,
        })
      );
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      const sig = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setEphemeralFunded(true);
      console.log(
        "[ephemeral] Funded from wallet:",
        ephemeralKeypair.publicKey.toBase58()
      );
    } catch (e) {
      console.error("[ephemeral] Failed to fund:", e);
    }
  }, [wallet, connection, ephemeralKeypair, ephemeralFunded]);

  // Auto-fund ephemeral when wallet connects
  useEffect(() => {
    if (wallet.publicKey && !ephemeralFunded) {
      fundEphemeral();
    }
  }, [wallet.publicKey, ephemeralFunded, fundEphemeral]);

  // Fetch game config
  const fetchConfig = useCallback(async () => {
    try {
      const info = await connection.getAccountInfo(configPDA);
      if (!info) {
        setGameConfig(null);
        return null;
      }
      const provider = new AnchorProvider(connection, wallet as never, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);
      const config = await program.account.gameConfig.fetch(configPDA);
      const gc: GameConfig = {
        authority: config.authority.toBase58(),
        currentRound: config.currentRound,
        roundActive: config.roundActive,
      };
      setGameConfig(gc);
      return gc;
    } catch {
      setGameConfig(null);
      return null;
    }
  }, [connection, configPDA, wallet]);

  // Fetch canvas from ER or L1
  const fetchCanvas = useCallback(
    async (round: number) => {
      const [canvasPDA] = findCanvasPDA(round);
      let info = await erConnection
        .getAccountInfo(canvasPDA)
        .catch(() => null);
      if (!info) {
        info = await connection.getAccountInfo(canvasPDA);
      }
      if (!info) {
        setCanvasData(null);
        return;
      }
      const parsed = parseCanvasAccount(info.data);
      // Apply optimistic pixels
      if (localPixelsRef.current.size > 0) {
        const pixels = new Uint8Array(parsed.pixels);
        localPixelsRef.current.forEach(([r, g, b], key) => {
          const [x, y] = key.split(",").map(Number);
          const offset = (y * CANVAS_WIDTH + x) * BYTES_PER_PIXEL;
          pixels[offset] = r;
          pixels[offset + 1] = g;
          pixels[offset + 2] = b;
        });
        parsed.pixels = pixels;
      }
      setCanvasData(parsed);
    },
    [connection, erConnection]
  );

  // Fetch round info
  const fetchRound = useCallback(
    async (round: number) => {
      try {
        const [roundPDA] = findRoundPDA(round);
        const provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);
        const r = await program.account.round.fetch(roundPDA);
        setRoundInfo({
          roundNumber: r.roundNumber,
          startSlot: r.startSlot.toNumber(),
          endSlot: r.endSlot.toNumber(),
          totalPlacements: r.totalPlacements.toNumber(),
          ended: r.ended,
        });
      } catch {
        setRoundInfo(null);
      }
    },
    [connection, wallet]
  );

  // Fetch player stats (for the ephemeral keypair)
  const fetchPlayerStats = useCallback(
    async (round: number) => {
      try {
        const [statsPDA] = findPlayerStatsPDA(
          round,
          ephemeralKeypair.publicKey
        );
        const provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);
        const s = await program.account.playerStats.fetch(statsPDA);
        setPlayerStats({
          pixelsPlaced: s.pixelsPlaced,
          lastPlacementSlot: s.lastPlacementSlot.toNumber(),
        });
      } catch {
        setPlayerStats(null);
      }
    },
    [connection, wallet, ephemeralKeypair]
  );

  // Poll all game state
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      const config = await fetchConfig();
      if (config && config.currentRound > 0) {
        await Promise.all([
          fetchCanvas(config.currentRound),
          fetchRound(config.currentRound),
          fetchPlayerStats(config.currentRound),
        ]);
      }
      setLoading(false);
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchConfig, fetchCanvas, fetchRound, fetchPlayerStats]);

  // Build wallet provider for admin txs
  const getWalletProvider = useCallback(
    (conn: Connection) => {
      if (!wallet.publicKey || !wallet.signTransaction) return null;
      return new AnchorProvider(conn, wallet as never, {
        commitment: "confirmed",
        skipPreflight: true,
      });
    },
    [wallet]
  );

  // Place pixel using ephemeral keypair (no wallet popup!)
  const placePixel = useCallback(
    async (x: number, y: number, r: number, g: number, b: number) => {
      if (!gameConfig || !gameConfig.roundActive)
        throw new Error("No active round");

      if (Date.now() < cooldownEnd) {
        throw new Error("Cooldown not elapsed");
      }

      const round = gameConfig.currentRound;
      const [canvasPDA] = findCanvasPDA(round);
      const [playerStatsPDA] = findPlayerStatsPDA(
        round,
        ephemeralKeypair.publicKey
      );

      // Optimistic update
      localPixelsRef.current.set(`${x},${y}`, [r, g, b]);
      if (canvasData) {
        const newPixels = new Uint8Array(canvasData.pixels);
        const offset = (y * CANVAS_WIDTH + x) * BYTES_PER_PIXEL;
        newPixels[offset] = r;
        newPixels[offset + 1] = g;
        newPixels[offset + 2] = b;
        setCanvasData({ ...canvasData, pixels: newPixels });
      }

      // Build the tx with ephemeral keypair as player/signer
      const ephProvider = new AnchorProvider(
        erConnection,
        {
          publicKey: ephemeralKeypair.publicKey,
          signAllTransactions: async <T,>(txs: T[]) => txs,
          signTransaction: async <T,>(tx: T) => tx,
        } as never,
        { commitment: "confirmed", skipPreflight: true }
      );
      const program = getProgram(ephProvider);
      const ix = await program.methods
        .placePixel(x, y, r, g, b)
        .accountsPartial({
          player: ephemeralKeypair.publicKey,
          gameConfig: configPDA,
          canvas: canvasPDA,
          playerStats: playerStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = ephemeralKeypair.publicKey;
      tx.recentBlockhash = (
        await erConnection.getLatestBlockhash()
      ).blockhash;
      tx.sign(ephemeralKeypair);

      await erConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      // Set cooldown
      setCooldownEnd(Date.now() + PLACEMENT_COOLDOWN_MS);
      setTimeout(() => {
        localPixelsRef.current.delete(`${x},${y}`);
      }, 4000);
    },
    [
      gameConfig,
      canvasData,
      cooldownEnd,
      configPDA,
      erConnection,
      ephemeralKeypair,
    ]
  );

  // Admin: initialize (wallet signs)
  const initialize = useCallback(async () => {
    const provider = getWalletProvider(connection);
    if (!provider) throw new Error("Wallet not ready");
    const program = getProgram(provider);
    await program.methods
      .initialize()
      .accountsPartial({
        authority: wallet.publicKey!,
        gameConfig: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    await fetchConfig();
  }, [connection, wallet, configPDA, getWalletProvider, fetchConfig]);

  // Admin: start round (wallet signs)
  const startRound = useCallback(async () => {
    if (!gameConfig) throw new Error("Game not initialized");
    const provider = getWalletProvider(connection);
    if (!provider) throw new Error("Wallet not ready");
    const program = getProgram(provider);
    const nextRound = gameConfig.currentRound + 1;
    const [canvasPDA] = findCanvasPDA(nextRound);
    const [roundPDA] = findRoundPDA(nextRound);
    await program.methods
      .startRound()
      .accountsPartial({
        authority: wallet.publicKey!,
        gameConfig: configPDA,
        canvas: canvasPDA,
        round: roundPDA,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ])
      .rpc();
    await fetchConfig();
  }, [gameConfig, connection, wallet, configPDA, getWalletProvider, fetchConfig]);

  // Admin: end round (wallet signs, sent to ER)
  const endRound = useCallback(async () => {
    if (!gameConfig || !gameConfig.roundActive)
      throw new Error("No active round");
    const provider = getWalletProvider(erConnection);
    if (!provider) throw new Error("Wallet not ready");
    const program = getProgram(provider);
    const round = gameConfig.currentRound;
    const [canvasPDA] = findCanvasPDA(round);
    const [roundPDA] = findRoundPDA(round);

    const { PublicKey } = await import("@solana/web3.js");
    const MAGIC_CONTEXT = new PublicKey(
      "MagicContext1111111111111111111111111111111"
    );
    const MAGIC_PROGRAM = new PublicKey(
      "MagicProgram1111111111111111111111111111111"
    );

    await program.methods
      .endRound()
      .accountsPartial({
        authority: wallet.publicKey!,
        gameConfig: configPDA,
        canvas: canvasPDA,
        round: roundPDA,
        magicContext: MAGIC_CONTEXT,
        magicProgram: MAGIC_PROGRAM,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    await fetchConfig();
  }, [
    gameConfig,
    wallet,
    configPDA,
    erConnection,
    getWalletProvider,
    fetchConfig,
  ]);

  const isAdmin =
    wallet.publicKey && gameConfig
      ? wallet.publicKey.toBase58() === gameConfig.authority
      : false;

  return {
    gameConfig,
    canvasData,
    roundInfo,
    playerStats,
    loading,
    cooldownEnd,
    isAdmin,
    ephemeralPublicKey: ephemeralKeypair.publicKey.toBase58(),
    placePixel,
    initialize,
    startRound,
    endRound,
  };
}
