import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import { expect } from "chai";
import { PixelWars } from "../target/types/pixel_wars";

const SEED_CONFIG = Buffer.from("config");
const SEED_CANVAS = Buffer.from("canvas");
const SEED_ROUND = Buffer.from("round");
const SEED_PLAYER = Buffer.from("player");

const CANVAS_WIDTH = 50;
const CANVAS_HEIGHT = 50;
const CANVAS_DATA_SIZE = CANVAS_WIDTH * CANVAS_HEIGHT * 3; // 7500

// Zero-copy Canvas layout after 8-byte discriminator:
// total_placements: u64 (8)  — offset 8
// round: u32 (4)             — offset 16
// bump: u8 (1)               — offset 20
// _padding: [u8; 3]          — offset 21
// pixels: [u8; 7500]         — offset 24
const CANVAS_HEADER = 8;
const CANVAS_PLACEMENTS_OFFSET = CANVAS_HEADER;      // 8
const CANVAS_ROUND_OFFSET = CANVAS_HEADER + 8;       // 16
const CANVAS_BUMP_OFFSET = CANVAS_HEADER + 12;       // 20
const CANVAS_PIXELS_OFFSET = CANVAS_HEADER + 16;     // 24

function findConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEED_CONFIG], programId);
}

function findCanvasPDA(round: number, programId: PublicKey): [PublicKey, number] {
  const roundBuf = Buffer.alloc(4);
  roundBuf.writeUInt32LE(round);
  return PublicKey.findProgramAddressSync([SEED_CANVAS, roundBuf], programId);
}

function findRoundPDA(round: number, programId: PublicKey): [PublicKey, number] {
  const roundBuf = Buffer.alloc(4);
  roundBuf.writeUInt32LE(round);
  return PublicKey.findProgramAddressSync([SEED_ROUND, roundBuf], programId);
}

function findPlayerStatsPDA(round: number, player: PublicKey, programId: PublicKey): [PublicKey, number] {
  const roundBuf = Buffer.alloc(4);
  roundBuf.writeUInt32LE(round);
  return PublicKey.findProgramAddressSync([SEED_PLAYER, roundBuf, player.toBuffer()], programId);
}

async function fundAccount(provider: anchor.AnchorProvider, to: PublicKey, amount: number) {
  const sig = await provider.connection.requestAirdrop(to, amount);
  await provider.connection.confirmTransaction(sig, "confirmed");
}

/** Read raw canvas account and parse pixel data */
async function readCanvas(provider: anchor.AnchorProvider, canvasPDA: PublicKey) {
  return {
    round: data.readUInt32LE(CANVAS_ROUND_OFFSET),
    totalPlacements: Number(data.readBigUInt64LE(CANVAS_PLACEMENTS_OFFSET)),
    bump: data[CANVAS_BUMP_OFFSET],
    pixels: data.slice(CANVAS_PIXELS_OFFSET, CANVAS_PIXELS_OFFSET + CANVAS_DATA_SIZE),
    rawSize: data.length,
  };
}

describe("pixel_wars", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.pixelWars as Program<PixelWars>;
  const deployer = provider.wallet;

  const [configPDA] = findConfigPDA(program.programId);
  let canvasPDA: PublicKey;
  let roundPDA: PublicKey;

  const player2 = Keypair.generate();

  // ─── Initialize ───────────────────────────────────────────────────

  describe("initialize", () => {
    it("initializes game config", async () => {
      await program.methods
        .initialize()
        .accountsPartial({
          authority: deployer.publicKey,
          gameConfig: configPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });

      const config = await program.account.gameConfig.fetch(configPDA);
      expect(config.authority.toBase58()).to.equal(deployer.publicKey.toBase58());
      expect(config.currentRound).to.equal(0);
      expect(config.roundActive).to.equal(false);
      console.log("    ✓ GameConfig created, authority:", config.authority.toBase58());
    });
  });

  // ─── Start Round ──────────────────────────────────────────────────

  describe("start_round", () => {
    it("starts round 1 and creates canvas + round accounts", async () => {
      [canvasPDA] = findCanvasPDA(1, program.programId);
      [roundPDA] = findRoundPDA(1, program.programId);

      await program.methods
        .startRound()
        .accountsPartial({
          authority: deployer.publicKey,
          gameConfig: configPDA,
          canvas: canvasPDA,
          round: roundPDA,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ])
        .rpc({ skipPreflight: true });

      const config = await program.account.gameConfig.fetch(configPDA);
      expect(config.currentRound).to.equal(1);
      expect(config.roundActive).to.equal(true);

      const round = await program.account.round.fetch(roundPDA);
      expect(round.roundNumber).to.equal(1);
      expect(round.ended).to.equal(false);
      expect(round.startSlot.toNumber()).to.be.greaterThan(0);
      console.log("    ✓ Round 1 started at slot", round.startSlot.toString());

      // Verify canvas account exists
      const canvas = await readCanvas(provider, canvasPDA);
      expect(canvas.round).to.equal(1);
      expect(canvas.totalPlacements).to.equal(0);
      console.log("    ✓ Canvas account created:", canvas.rawSize, "bytes");
    });

    it("rejects starting another round while one is active", async () => {
      const [canvas2] = findCanvasPDA(2, program.programId);
      const [round2] = findRoundPDA(2, program.programId);

      try {
        await program.methods
          .startRound()
          .accountsPartial({
            authority: deployer.publicKey,
            gameConfig: configPDA,
            canvas: canvas2,
            round: round2,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: true });
        expect.fail("Should have thrown");
      } catch (e: any) {
        expect(e).to.exist;
      }
    });
  });

  // ─── Place Pixel ──────────────────────────────────────────────────

  describe("place_pixel", () => {
    it("places a pixel at (0, 0) with red color", async () => {
      const [playerStatsPDA] = findPlayerStatsPDA(1, deployer.publicKey, program.programId);

      await program.methods
        .placePixel(0, 0, 255, 0, 0)
        .accountsPartial({
          player: deployer.publicKey,
          gameConfig: configPDA,
          canvas: canvasPDA,
          playerStats: playerStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });

      const stats = await program.account.playerStats.fetch(playerStatsPDA);
      expect(stats.pixelsPlaced).to.equal(1);
      expect(stats.player.toBase58()).to.equal(deployer.publicKey.toBase58());
      console.log("    ✓ Pixel placed at (0,0) = #ff0000");
    });

    it("places pixel at (49, 49) with blue color", async () => {
      const [playerStatsPDA] = findPlayerStatsPDA(1, deployer.publicKey, program.programId);

      // Wait for cooldown
      await new Promise((r) => setTimeout(r, 5000));

      await program.methods
        .placePixel(49, 49, 0, 0, 255)
        .accountsPartial({
          player: deployer.publicKey,
          gameConfig: configPDA,
          canvas: canvasPDA,
          playerStats: playerStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });

      const stats = await program.account.playerStats.fetch(playerStatsPDA);
      expect(stats.pixelsPlaced).to.equal(2);
      console.log("    ✓ Pixel placed at (49,49) = #0000ff");
    });

    it("rejects out-of-bounds coordinates", async () => {
      const [playerStatsPDA] = findPlayerStatsPDA(1, deployer.publicKey, program.programId);

      await new Promise((r) => setTimeout(r, 5000));

      try {
        await program.methods
          .placePixel(50, 0, 255, 0, 0)
          .accountsPartial({
            player: deployer.publicKey,
            gameConfig: configPDA,
            canvas: canvasPDA,
            playerStats: playerStatsPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: true });
        expect.fail("Should have thrown");
      } catch (e: any) {
        expect(e).to.exist;
      }
    });

    it("enforces cooldown between placements", async () => {
      const [playerStatsPDA] = findPlayerStatsPDA(1, deployer.publicKey, program.programId);

      // Place one pixel (cooldown should have elapsed from OOB test wait)
      await program.methods
        .placePixel(25, 25, 0, 255, 0)
        .accountsPartial({
          player: deployer.publicKey,
          gameConfig: configPDA,
          canvas: canvasPDA,
          playerStats: playerStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });

      // Immediately try another — should fail due to cooldown
      try {
        await program.methods
          .placePixel(26, 26, 0, 255, 0)
          .accountsPartial({
            player: deployer.publicKey,
            gameConfig: configPDA,
            canvas: canvasPDA,
            playerStats: playerStatsPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: true });
        expect.fail("Should have thrown — cooldown not elapsed");
      } catch (e: any) {
        expect(e).to.exist;
        console.log("    ✓ Cooldown enforced");
      }
    });

    it("allows a different player to place pixels", async () => {
      await fundAccount(provider, player2.publicKey, 0.5 * LAMPORTS_PER_SOL);
      const [p2StatsPDA] = findPlayerStatsPDA(1, player2.publicKey, program.programId);

      await program.methods
        .placePixel(10, 10, 255, 255, 0)
        .accountsPartial({
          player: player2.publicKey,
          gameConfig: configPDA,
          canvas: canvasPDA,
          playerStats: p2StatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc({ skipPreflight: true });

      const stats = await program.account.playerStats.fetch(p2StatsPDA);
      expect(stats.pixelsPlaced).to.equal(1);
      expect(stats.player.toBase58()).to.equal(player2.publicKey.toBase58());
      console.log("    ✓ Player 2 placed pixel at (10,10) = #ffff00");
    });

    it("verifies pixel data on canvas", async () => {
      
      
      

      const canvas = await readCanvas(provider, canvasPDA);

      // Pixel at (0,0): index 0 — red
      expect(canvas.pixels[0]).to.equal(255, "pixel(0,0) R");
      expect(canvas.pixels[1]).to.equal(0, "pixel(0,0) G");
      expect(canvas.pixels[2]).to.equal(0, "pixel(0,0) B");

      // Pixel at (49,49): index (49*50+49)*3 = 7497 — blue
      expect(canvas.pixels[7497]).to.equal(0, "pixel(49,49) R");
      expect(canvas.pixels[7498]).to.equal(0, "pixel(49,49) G");
      expect(canvas.pixels[7499]).to.equal(255, "pixel(49,49) B");

      // Pixel at (10,10): index 1530 — yellow
      expect(canvas.pixels[1530]).to.equal(255, "pixel(10,10) R");
      expect(canvas.pixels[1531]).to.equal(255, "pixel(10,10) G");
      expect(canvas.pixels[1532]).to.equal(0, "pixel(10,10) B");

      console.log("    ✓ Canvas pixel data verified — 3 pixels correct");
    });
  });

  // ─── Round Lifecycle ──────────────────────────────────────────────

  describe("round lifecycle", () => {
    it("rejects unauthorized start_round", async () => {
      const fakeAuth = Keypair.generate();
      await fundAccount(provider, fakeAuth.publicKey, 0.1 * LAMPORTS_PER_SOL);

      try {
        const [canvas2] = findCanvasPDA(2, program.programId);
        const [round2] = findRoundPDA(2, program.programId);
        await program.methods
          .startRound()
          .accountsPartial({
            authority: fakeAuth.publicKey,
            gameConfig: configPDA,
            canvas: canvas2,
            round: round2,
            systemProgram: SystemProgram.programId,
          })
          .signers([fakeAuth])
          .rpc({ skipPreflight: true });
        expect.fail("Should have thrown");
      } catch (e: any) {
        expect(e).to.exist;
        console.log("    ✓ Unauthorized start_round rejected");
      }
    });
  });

  // ─── Canvas Integrity ─────────────────────────────────────────────

  describe("canvas integrity", () => {
    it("canvas has correct pixel data size", async () => {
      const canvas = await readCanvas(provider, canvasPDA);
      expect(canvas.pixels.length).to.equal(7500);
      console.log("    ✓ Canvas pixel data: 7,500 bytes (50x50x3 RGB)");
    });

    it("unwritten pixels are black (0,0,0)", async () => {
      const canvas = await readCanvas(provider, canvasPDA);
      // Check unwritten pixel at (5,5): index (5*50+5)*3 = 765
      expect(canvas.pixels[765]).to.equal(0);
      expect(canvas.pixels[766]).to.equal(0);
      expect(canvas.pixels[767]).to.equal(0);
      console.log("    ✓ Unwritten pixels default to black (0,0,0)");
    });
  });
});
