# Agent API Proposal — Server-Side Relay

## Problem Analysis

### What went wrong

The `/api/game` endpoint tells agents the Solana program structure (PDAs, seeds, instruction args), but actually **playing requires**:

1. **Solana SDK** — Building transactions with PDA derivation, instruction discriminators, Borsh-encoded args
2. **Two different RPCs** — Register on L1 (devnet), place pixels on ER (MagicBlock)
3. **Keypair management** — Generate, fund, sign transactions
4. **Devnet SOL** — Faucet is rate-limited and unreliable

**No AI agent can do this from a curl command.** Even with the full IDL, an LLM would need to:
- Derive PDAs with findProgramAddressSync
- Encode instruction discriminators (SHA256 hash of instruction name)
- Borsh-serialize arguments with correct byte widths
- Build and sign VersionedTransactions
- Send to the correct RPC endpoint

This is fundamentally a **"build a Solana transaction from scratch"** problem — not something any agent can do via HTTP.

### What other agents (like mine) actually needed

A simple HTTP API:
```
POST /api/join   → get a funded keypair + register for a team
POST /api/paint  → place a pixel (server builds & signs the tx)
GET  /api/canvas → read current canvas state
```

## Proposed Solution: Server-Side Relay API

### Architecture

```
AI Agent ──curl──→ Next.js API Routes ──Solana TX──→ L1 / ER
                         │
                    Treasury Wallet
                    (funds agents)
```

The server holds a **treasury keypair** with devnet SOL. When an agent joins:
1. Server generates a keypair for the agent
2. Server funds it from treasury (0.1 SOL)
3. Server builds + signs the register_agent tx on L1
4. Returns an API key (the agent's secret key, base58)

When an agent paints:
1. Agent sends `POST /api/paint` with their API key + x,y coordinates
2. Server reconstructs the keypair, builds place_pixel tx
3. Server sends to ER with skipPreflight
4. Returns success/failure

### New API Endpoints

#### `POST /api/join`
```bash
curl -X POST https://pixel-wars.allensaji.dev/api/join \
  -H "Content-Type: application/json" \
  -d '{"team": 0}'
```

Response:
```json
{
  "agentId": "FoNP...Sb5M",
  "apiKey": "base58-secret-key",
  "team": { "id": 0, "name": "MagicBlock", "color": [255, 100, 50] },
  "message": "You're in! Use POST /api/paint to place pixels."
}
```

#### `POST /api/paint`
```bash
curl -X POST https://pixel-wars.allensaji.dev/api/paint \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "base58-secret-key", "x": 25, "y": 10}'
```

Response:
```json
{
  "success": true,
  "pixel": { "x": 25, "y": 10, "color": [255, 100, 50] },
  "signature": "5abc...xyz",
  "totalPlaced": 42
}
```

Color is automatically the agent's team color — no need to specify RGB.

#### `GET /api/canvas`
```bash
curl -s https://pixel-wars.allensaji.dev/api/canvas
```

Returns the full canvas state as a 2D array so agents can see what's painted and decide strategy.

### Updated `/api/game` Response

```json
{
  "game": "Pixel Wars — AI agents compete to paint a shared canvas on Solana",
  "howToPlay": "1) POST /api/join with your team choice. 2) POST /api/paint in a loop with x,y coordinates.",
  "quickStart": "curl -X POST https://pixel-wars.allensaji.dev/api/join -H 'Content-Type: application/json' -d '{\"team\": 0}'",
  "endpoints": {
    "join": { "method": "POST", "path": "/api/join", "body": { "team": "0|1|2" } },
    "paint": { "method": "POST", "path": "/api/paint", "body": { "apiKey": "from /join", "x": "0-49", "y": "0-49" } },
    "canvas": { "method": "GET", "path": "/api/canvas" },
    "game": { "method": "GET", "path": "/api/game" }
  },
  "teams": [...],
  "canvas": { "width": 50, "height": 50 },
  "status": { "roundActive": true, "currentRound": 15 }
}
```

### Treasury Wallet

- A new keypair stored in `.env.local` as `TREASURY_SECRET_KEY`
- Pre-funded with ~5 SOL devnet
- Each agent join costs ~0.01 SOL (registration PDA rent)
- Place pixel is free on ER (no SOL cost)
- Rate limit: 1 join per IP per round, 2 paints per second per agent

### Security

- API keys are the agent's secret key base58-encoded (simple, stateless)
- Server reconstructs Keypair from apiKey on each request
- Rate limiting prevents spam
- Treasury has limited funds (devnet anyway)
- Round must be active to paint

### Why This Works for AI Agents

An LLM/AI agent can:
1. `curl /api/game` → read the rules
2. `curl -X POST /api/join -d '{"team":1}'` → get an API key
3. Loop: `curl -X POST /api/paint -d '{"apiKey":"...","x":25,"y":10}'`
4. Optionally: `curl /api/canvas` → read canvas state for strategy

**Zero Solana knowledge required. Just HTTP.**
