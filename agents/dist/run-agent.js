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
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// --- Config ---
const PROGRAM_ID = new web3_js_1.PublicKey("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");
const L1_RPC = "https://api.devnet.solana.com";
const ER_RPC = "https://devnet-us.magicblock.app";
const CANVAS_SIZE = 50;
// Parse CLI args
const keypairPath = process.argv[2];
const teamId = parseInt(process.argv[3]);
const agentName = process.argv[4] || `Agent-${teamId}`;
if (!keypairPath || isNaN(teamId)) {
    console.error("Usage: node run-agent.js <keypair.json> <team_id> [name]");
    process.exit(1);
}
const TEAM_COLORS = {
    0: [255, 100, 50], // MagicBlock
    1: [100, 50, 255], // Arcium
    2: [50, 220, 100], // Jito
};
const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const agentKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secret));
const [r, g, b] = TEAM_COLORS[teamId] ?? [255, 255, 255];
console.log(`🎮 ${agentName} | Team ${teamId} | ${agentKeypair.publicKey.toBase58()}`);
console.log(`🎨 Color: rgb(${r}, ${g}, ${b})`);
// Load IDL
const idlPaths = [
    path.join(__dirname, "../app/src/lib/idl.json"),
    path.join(__dirname, "../../app/src/lib/idl.json"),
];
const idlPath = idlPaths.find((p) => fs.existsSync(p));
if (!idlPath) {
    console.error("Cannot find idl.json");
    process.exit(1);
}
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
// --- PDA Helpers ---
function toLeU32(n) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(n);
    return buf;
}
function findConfigPDA() {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
    return pda;
}
function findCanvasPDA(round) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("canvas"), toLeU32(round)], PROGRAM_ID);
    return pda;
}
function findAgentRegistrationPDA(agentPk, round) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), agentPk.toBuffer(), toLeU32(round)], PROGRAM_ID);
    return pda;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// --- Main ---
async function main() {
    const l1Conn = new web3_js_1.Connection(L1_RPC, "confirmed");
    const erConn = new web3_js_1.Connection(ER_RPC, "confirmed");
    // Create Anchor providers & programs
    const l1Wallet = new anchor.Wallet(agentKeypair);
    const l1Provider = new anchor.AnchorProvider(l1Conn, l1Wallet, {
        commitment: "confirmed",
        skipPreflight: true,
    });
    const l1Program = new anchor.Program(idl, l1Provider);
    const erWallet = new anchor.Wallet(agentKeypair);
    const erProvider = new anchor.AnchorProvider(erConn, erWallet, {
        commitment: "confirmed",
        skipPreflight: true,
    });
    const erProgram = new anchor.Program(idl, erProvider);
    const configPDA = findConfigPDA();
    // Get current round from on-chain state
    const configAccount = await l1Program.account["gameConfig"].fetch(configPDA);
    const round = configAccount.currentRound;
    const roundActive = configAccount.roundActive;
    console.log(`📍 Round: ${round} | Active: ${roundActive}`);
    if (!roundActive) {
        console.log("⏸️ No active round. Exiting.");
        return;
    }
    // Step 1: Register on L1
    console.log(`📝 Registering on L1...`);
    try {
        const registrationPDA = findAgentRegistrationPDA(agentKeypair.publicKey, round);
        const ix = await l1Program.methods
            .registerAgent(teamId)
            .accountsPartial({
            agent: agentKeypair.publicKey,
            gameConfig: configPDA,
            registration: registrationPDA,
            systemProgram: new web3_js_1.PublicKey("11111111111111111111111111111111"),
        })
            .instruction();
        const tx = new web3_js_1.Transaction().add(ix);
        tx.feePayer = agentKeypair.publicKey;
        tx.recentBlockhash = (await l1Conn.getLatestBlockhash()).blockhash;
        tx.sign(agentKeypair);
        const sig = await l1Conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
        console.log(`✅ Registered! Sig: ${sig}`);
        await sleep(2000);
    }
    catch (e) {
        const msg = e.message || String(e);
        if (msg.includes("already in use") || msg.includes("0x0")) {
            console.log(`⚡ Already registered for round ${round}`);
        }
        else {
            console.error(`⚠️ Registration error (continuing):`, msg.slice(0, 150));
        }
    }
    // Step 2: Paint pixels on ER
    console.log(`🎨 Starting pixel painting on ER...`);
    const canvasPDA = findCanvasPDA(round);
    let pixelsPlaced = 0;
    let errors = 0;
    const startTime = Date.now();
    const DURATION_MS = 5 * 60 * 1000; // 5 minutes
    while (Date.now() - startTime < DURATION_MS) {
        try {
            // Pick position — team zones + raiding
            let x, y;
            if (Math.random() < 0.7) {
                // Team zone
                if (teamId === 0) {
                    x = Math.floor(Math.random() * CANVAS_SIZE);
                    y = Math.floor(Math.random() * Math.floor(CANVAS_SIZE / 3));
                }
                else if (teamId === 1) {
                    x = Math.floor(Math.random() * CANVAS_SIZE);
                    y = Math.floor(CANVAS_SIZE / 3) + Math.floor(Math.random() * Math.floor(CANVAS_SIZE / 3));
                }
                else {
                    x = Math.floor(Math.random() * CANVAS_SIZE);
                    y = Math.floor((2 * CANVAS_SIZE) / 3) + Math.floor(Math.random() * Math.floor(CANVAS_SIZE / 3));
                }
            }
            else {
                x = Math.floor(Math.random() * CANVAS_SIZE);
                y = Math.floor(Math.random() * CANVAS_SIZE);
            }
            // Build place_pixel via Anchor
            const ix = await erProgram.methods
                .placePixel(x, y, r, g, b, teamId)
                .accountsPartial({
                agent: agentKeypair.publicKey,
                gameConfig: configPDA,
                canvas: canvasPDA,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(ix);
            tx.feePayer = agentKeypair.publicKey;
            tx.recentBlockhash = (await erConn.getLatestBlockhash()).blockhash;
            tx.sign(agentKeypair);
            const sig = await erConn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
            pixelsPlaced++;
            errors = 0; // Reset consecutive errors
            if (pixelsPlaced % 10 === 0) {
                console.log(`🖌️  ${agentName}: ${pixelsPlaced} pixels (latest: ${x},${y})`);
            }
            await sleep(500 + Math.random() * 500);
        }
        catch (e) {
            errors++;
            const msg = (e.message || String(e)).slice(0, 120);
            if (errors <= 3 || errors % 10 === 0) {
                console.error(`⚠️  ${agentName} error #${errors}: ${msg}`);
            }
            if (errors > 20) {
                console.error(`❌ ${agentName}: Too many errors, stopping.`);
                break;
            }
            await sleep(2000);
        }
    }
    console.log(`🏁 ${agentName} finished! Total pixels placed: ${pixelsPlaced}`);
}
main().catch(console.error);
