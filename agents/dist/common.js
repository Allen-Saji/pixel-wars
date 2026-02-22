"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANVAS_DATA_SIZE = exports.BYTES_PER_PIXEL = exports.CANVAS_HEIGHT = exports.CANVAS_WIDTH = exports.PROGRAM_ID = void 0;
exports.findConfigPDA = findConfigPDA;
exports.findCanvasPDA = findCanvasPDA;
exports.findRoundPDA = findRoundPDA;
exports.findAgentRegistrationPDA = findAgentRegistrationPDA;
exports.setupAgent = setupAgent;
exports.readCanvas = readCanvas;
exports.placePixel = placePixel;
exports.ensureFunded = ensureFunded;
exports.isRoundActive = isRoundActive;
exports.sleep = sleep;
exports.randomInt = randomInt;
exports.colorsEqual = colorsEqual;
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ─── Constants ──────────────────────────────────────────────────────────────
exports.PROGRAM_ID = new web3_js_1.PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");
exports.CANVAS_WIDTH = 50;
exports.CANVAS_HEIGHT = 50;
exports.BYTES_PER_PIXEL = 3;
exports.CANVAS_DATA_SIZE = exports.CANVAS_WIDTH * exports.CANVAS_HEIGHT * exports.BYTES_PER_PIXEL;
// Zero-copy layout offsets (after 8-byte discriminator)
const CANVAS_PIXELS_OFFSET = 24;
const SEED_CONFIG = Buffer.from("config");
const SEED_CANVAS = Buffer.from("canvas");
const SEED_ROUND = Buffer.from("round");
const SEED_AGENT = Buffer.from("agent");
// ─── RPC Endpoints ──────────────────────────────────────────────────────────
const L1_RPC = process.env.L1_RPC_URL || "https://api.devnet.solana.com";
const ER_RPC = process.env.ER_RPC_URL || "https://devnet-us.magicblock.app";
// ─── PDA Helpers ────────────────────────────────────────────────────────────
function toLeU32(n) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(n);
    return buf;
}
function findConfigPDA() {
    return web3_js_1.PublicKey.findProgramAddressSync([SEED_CONFIG], exports.PROGRAM_ID);
}
function findCanvasPDA(round) {
    return web3_js_1.PublicKey.findProgramAddressSync([SEED_CANVAS, toLeU32(round)], exports.PROGRAM_ID);
}
function findRoundPDA(round) {
    return web3_js_1.PublicKey.findProgramAddressSync([SEED_ROUND, toLeU32(round)], exports.PROGRAM_ID);
}
function findAgentRegistrationPDA(round, agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([SEED_AGENT, agent.toBuffer(), toLeU32(round)], exports.PROGRAM_ID);
}
// ─── Setup ──────────────────────────────────────────────────────────────────
async function setupAgent(name, teamId) {
    // Load or generate agent keypair
    const keyPath = path_1.default.join(__dirname, `keys/${name}.json`);
    let keypair;
    if (fs_1.default.existsSync(keyPath)) {
        const secret = JSON.parse(fs_1.default.readFileSync(keyPath, "utf-8"));
        keypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(secret));
    }
    else {
        keypair = web3_js_1.Keypair.generate();
        fs_1.default.mkdirSync(path_1.default.join(__dirname, "keys"), { recursive: true });
        fs_1.default.writeFileSync(keyPath, JSON.stringify(Array.from(keypair.secretKey)));
        console.log(`[${name}] Generated new keypair: ${keypair.publicKey.toBase58()}`);
    }
    const l1Connection = new web3_js_1.Connection(L1_RPC, "confirmed");
    const erConnection = new web3_js_1.Connection(ER_RPC, "confirmed");
    // Load IDL
    const idl = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, "../target/idl/pixel_wars.json"), "utf-8"));
    const wallet = new anchor.Wallet(keypair);
    // ER provider (for pixel placement)
    const erProvider = new anchor.AnchorProvider(erConnection, wallet, {
        commitment: "confirmed",
        skipPreflight: true,
    });
    const program = new anchor.Program(idl, erProvider);
    // L1 provider (for registration)
    const l1Provider = new anchor.AnchorProvider(l1Connection, wallet, {
        commitment: "confirmed",
    });
    const l1Program = new anchor.Program(idl, l1Provider);
    const [configPDA] = findConfigPDA();
    // Fetch current round from L1
    const config = await l1Program.account.gameConfig.fetch(configPDA);
    const currentRound = config.currentRound;
    console.log(`[${name}] Agent: ${keypair.publicKey.toBase58()}`);
    console.log(`[${name}] Round: ${currentRound}, Active: ${config.roundActive}`);
    if (!config.roundActive) {
        throw new Error(`No active round. Current round: ${currentRound}`);
    }
    const ctx = {
        name,
        keypair,
        teamId,
        program,
        l1Program,
        l1Connection,
        erConnection,
        currentRound,
        configPDA,
    };
    // Auto-register if not already registered
    await registerAgentIfNeeded(ctx);
    return ctx;
}
// ─── Registration ───────────────────────────────────────────────────────────
async function registerAgentIfNeeded(ctx) {
    const [regPDA] = findAgentRegistrationPDA(ctx.currentRound, ctx.keypair.publicKey);
    // Check if already registered
    const info = await ctx.l1Connection.getAccountInfo(regPDA).catch(() => null);
    if (info) {
        console.log(`[${ctx.name}] Already registered for round ${ctx.currentRound}`);
        return;
    }
    console.log(`[${ctx.name}] Registering for round ${ctx.currentRound}, team ${ctx.teamId}...`);
    try {
        await ctx.l1Program.methods
            .registerAgent(ctx.teamId)
            .accountsPartial({
            agent: ctx.keypair.publicKey,
            gameConfig: ctx.configPDA,
            registration: regPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        console.log(`[${ctx.name}] Registered successfully!`);
    }
    catch (e) {
        console.error(`[${ctx.name}] Registration failed:`, e.message?.slice(0, 200));
        // Don't throw — agent can still place pixels on ER without L1 registration
    }
}
// ─── Canvas Read ────────────────────────────────────────────────────────────
async function readCanvas(ctx) {
    const [canvasPDA] = findCanvasPDA(ctx.currentRound);
    // Try ER first, fallback to L1
    let info = await ctx.erConnection.getAccountInfo(canvasPDA).catch(() => null);
    if (!info) {
        info = await ctx.l1Connection.getAccountInfo(canvasPDA);
    }
    if (!info)
        throw new Error("Canvas account not found");
    const data = info.data;
    const grid = [];
    for (let y = 0; y < exports.CANVAS_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < exports.CANVAS_WIDTH; x++) {
            const offset = CANVAS_PIXELS_OFFSET + (y * exports.CANVAS_WIDTH + x) * exports.BYTES_PER_PIXEL;
            grid[y][x] = [data[offset], data[offset + 1], data[offset + 2]];
        }
    }
    return grid;
}
// ─── Place Pixel ────────────────────────────────────────────────────────────
async function placePixel(ctx, x, y, r, g, b) {
    const [canvasPDA] = findCanvasPDA(ctx.currentRound);
    try {
        const ix = await ctx.program.methods
            .placePixel(x, y, r, g, b, ctx.teamId)
            .accountsPartial({
            agent: ctx.keypair.publicKey,
            gameConfig: ctx.configPDA,
            canvas: canvasPDA,
        })
            .instruction();
        const tx = new web3_js_1.Transaction().add(ix);
        tx.feePayer = ctx.keypair.publicKey;
        tx.recentBlockhash = (await ctx.erConnection.getLatestBlockhash()).blockhash;
        tx.sign(ctx.keypair);
        const sig = await ctx.erConnection.sendRawTransaction(tx.serialize(), {
            skipPreflight: true,
        });
        return sig;
    }
    catch (e) {
        const msg = e.message || String(e);
        console.error(`[${ctx.name}] placePixel error:`, msg.slice(0, 200));
        return null;
    }
}
// ─── Funding ────────────────────────────────────────────────────────────────
async function ensureFunded(ctx) {
    const balance = await ctx.erConnection
        .getBalance(ctx.keypair.publicKey)
        .catch(() => 0);
    if (balance > 0.01 * 1e9) {
        console.log(`[${ctx.name}] Balance: ${(balance / 1e9).toFixed(4)} SOL`);
        return;
    }
    // Try L1 balance
    const l1Balance = await ctx.l1Connection.getBalance(ctx.keypair.publicKey);
    if (l1Balance > 0.01 * 1e9) {
        console.log(`[${ctx.name}] L1 balance: ${(l1Balance / 1e9).toFixed(4)} SOL`);
        return;
    }
    // Try devnet airdrop
    console.log(`[${ctx.name}] Requesting airdrop...`);
    try {
        const sig = await ctx.l1Connection.requestAirdrop(ctx.keypair.publicKey, 1 * 1e9);
        await ctx.l1Connection.confirmTransaction(sig, "confirmed");
        console.log(`[${ctx.name}] Airdropped 1 SOL`);
    }
    catch (e) {
        console.error(`[${ctx.name}] Airdrop failed:`, e.message?.slice(0, 100));
        console.log(`[${ctx.name}] Fund manually: ${ctx.keypair.publicKey.toBase58()}`);
    }
}
// ─── Round Check ───────────────────────────────────────────────────────────
async function isRoundActive(ctx) {
    try {
        const config = await ctx.l1Program.account.gameConfig.fetch(ctx.configPDA);
        return config.roundActive;
    }
    catch {
        return false;
    }
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function colorsEqual(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
