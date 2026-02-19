# Pixel Wars — Implementation Plan

> Humans vs AI pixel war on Solana, powered by MagicBlock Ephemeral Rollups.

## Overview

A shared 100x100 pixel canvas on Solana. Players place colored pixels gaslessly via Ephemeral Rollups. AI agents compete 24/7, keeping the canvas alive. Each round produces an NFT of the final canvas state.

---

## Architecture

### On-chain (Anchor Program)

**Single program: `pixel_wars`**

**Accounts:**
1. `GameConfig` (PDA, singleton) — admin, round duration, canvas dimensions, current round, agent registry
2. `Canvas` (PDA, per round) — 100x100 pixel grid stored as `[u8; 30000]` (3 bytes RGB per pixel = 30KB). Delegated to ER during active rounds
3. `PlayerStats` (PDA, per player per round) — pixels placed count, last placement timestamp, team/faction
4. `Round` (PDA, per round) — start time, end time, status, winner faction, total pixels placed

**Instructions:**
1. `initialize` — create GameConfig, set admin
2. `start_round` — create Canvas + Round accounts, delegate Canvas to ER
3. `place_pixel(x, y, r, g, b)` — write pixel to canvas. Runs inside ER (gasless). Rate limit: 1 pixel per player per 5 seconds (checked via clock + PlayerStats)
4. `end_round` — commit canvas back from ER, freeze state, determine winning faction
5. `register_agent` — admin registers AI agent pubkeys (so UI can label them)

**Account sizes:**
- GameConfig: 8 + 32 + 8 + 4 + 4 + 1 + (32 * 10) = ~400 bytes
- Canvas: 8 + 30000 + 8 + 1 = ~30KB (within Solana's 10MB account limit, well under)
- PlayerStats: 8 + 32 + 32 + 4 + 8 + 1 + 1 = ~90 bytes
- Round: 8 + 8 + 8 + 8 + 1 + 8 + 1 = ~50 bytes

**Key design decisions:**
- Canvas is ONE account (30KB) — delegated as a single unit to ER
- RGB stored as raw bytes, no compression — simple, fast reads
- Rate limiting via on-chain clock inside ER
- No entry fee for MVP (reduces friction, maximizes participation)
- Factions are just color ranges: Red team, Blue team, Green team, AI team

### ER Flow

```
start_round:
  1. Create Canvas account on Solana L1
  2. Delegate Canvas to ER via MagicBlock delegation program
  
during round (all inside ER):
  3. Players call place_pixel → writes directly to Canvas bytes
  4. AI agents call place_pixel → same flow, zero gas
  5. Rate limit enforced per player (1 pixel / 5 sec)

end_round:
  6. Commit Canvas back to Solana L1
  7. Canvas is now a permanent on-chain snapshot
```

### Frontend (Next.js)

**Pages:**
- `/` — Landing page with live canvas view, connect wallet CTA
- `/play` — Full canvas with color picker, real-time updates, faction scoreboard
- `/history` — Past round canvases (on-chain art gallery)

**Core components:**
- `CanvasGrid` — 100x100 HTML Canvas element, reads on-chain state, renders pixels
- `ColorPicker` — palette selection (faction-based colors)
- `PlacementOverlay` — click canvas → preview pixel → confirm
- `Scoreboard` — faction pixel counts, top players, AI vs Human stats
- `ActivityFeed` — real-time pixel placements scrolling by

**State management:**
- Poll canvas account every 2-3 seconds (ER RPC)
- Or use websocket subscription on canvas account for real-time
- Local optimistic updates on pixel placement

**Tech:** Next.js 16, Tailwind, wallet-adapter, @solana/web3.js, @magicblock-labs/ephemeral-rollups-sdk

### AI Agents (Node scripts)

**3 agents, each with a strategy:**

> No LLMs, no AI APIs. Just if-statements on a byte array. The "intelligence" is emergent from simple rules running in a loop. Costs $0 to run.

#### 1. Picasso — The Artist

Draws recognizable pixel art on the canvas using hardcoded templates + math patterns.

**Template system:**
```typescript
// Templates are 2D arrays, 1 = place pixel, 0 = skip
const HEART = [
  [0,1,1,0,1,1,0],
  [1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1],
  [0,1,1,1,1,1,0],
  [0,0,1,1,1,0,0],
  [0,0,0,1,0,0,0],
]
// Also: smiley, Solana logo, skull, arrow, star
```

**Behavior loop:**
```
1. Pick next template from queue
2. Pick random canvas position (avoiding edges)
3. For each pixel in template:
   - Read canvas at (x + offsetX, y + offsetY)
   - If pixel != desired color → place_pixel tx
   - Sleep 3-5 seconds between placements
4. Template done → move to next
5. When all templates placed, switch to math patterns:
   - Spirals: angle += 0.1, r += 0.05, x = center + r*cos(angle)
   - Checkerboards: if (x + y) % 2 == 0
   - Diagonal lines: y = x + offset
```

**Template sources (for hackathon):**
- Draw 4-5 manually on piskelapp.com → export as JSON arrays
- Add 2-3 math-generated patterns (spiral, checkerboard, border frame)
- Convert any small PNG to template with a script: read image → for each pixel → output [r,g,b] array

#### 2. Defender — The Territorial

Claims a quadrant and aggressively maintains it.

**Behavior loop:**
```
1. Assigned quadrant: e.g. top-left 25x25 pixels
2. Read canvas state (full 30KB byte array)
3. Parse RGB pixels in my quadrant
4. Scan for "enemy" pixels (any color != MY_COLOR):
   - If found → place_pixel to overwrite it back to MY_COLOR
   - Prioritize most recent overwrites (edges of territory first)
   - Sleep 3-8 seconds between fixes
5. If territory is 100% intact → expand border by 1 pixel
6. Repeat
```

**Why it looks intelligent:** When a human overwrites a Defender pixel, it "fights back" within 10-30 seconds. Looks like real-time AI reacting. Actually just a diff check on a byte array.

#### 3. Chaos — The Wildcard

Random placement, random colors. Creates noise and motion.

**Behavior loop:**
```
1. x = random(0, 99)
2. y = random(0, 99)
3. color = randomColor() // from a bright, visible palette
4. place_pixel(x, y, r, g, b)
5. Sleep 2-6 seconds
6. Repeat
```

**Purpose:** Makes the canvas feel alive even when no humans are active. Creates visual noise that Defender has to fight against, producing emergent conflict.

#### Common Agent Code (`agents/common.ts`)

```typescript
// All agents share this:
async function readCanvas(connection, canvasPDA) {
  const account = await connection.getAccountInfo(canvasPDA);
  const data = account.data.slice(8); // skip discriminator
  // Parse into 100x100 grid of [r, g, b]
  const grid = [];
  for (let y = 0; y < 100; y++) {
    grid[y] = [];
    for (let x = 0; x < 100; x++) {
      const offset = (y * 100 + x) * 3;
      grid[y][x] = [data[offset], data[offset+1], data[offset+2]];
    }
  }
  return grid;
}

async function placePixel(program, x, y, r, g, b) {
  await program.methods.placePixel(x, y, r, g, b)
    .accounts({ canvas: canvasPDA, player: wallet, ... })
    .rpc();
}
```

**Each agent is ~50-80 lines of strategy code on top of common.ts.**

#### Agent Runtime

```
- Run with pm2 on existing VPS
- Each agent = separate Node process
- ~0 CPU/RAM usage (sleep 90% of the time)
- Connect to ER RPC for reads + writes
- Total cost: $0 (gasless ER txs, devnet SOL from faucet)
```

#### pm2 Config (`agents/ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    { name: 'picasso',  script: 'picasso.ts',  interpreter: 'npx', interpreter_args: 'tsx' },
    { name: 'defender', script: 'defender.ts', interpreter: 'npx', interpreter_args: 'tsx' },
    { name: 'chaos',    script: 'chaos.ts',    interpreter: 'npx', interpreter_args: 'tsx' },
  ]
}
```

---

## File Structure

```
pixel-wars/
├── programs/
│   └── pixel-wars/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── state.rs
│           ├── instructions/
│           │   ├── mod.rs
│           │   ├── initialize.rs
│           │   ├── start_round.rs
│           │   ├── place_pixel.rs
│           │   └── end_round.rs
│           └── errors.rs
├── app/                    # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx    # Landing
│   │   │   └── play/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── CanvasGrid.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── Scoreboard.tsx
│   │   │   └── ActivityFeed.tsx
│   │   └── lib/
│   │       ├── program.ts  # Anchor client
│   │       └── canvas.ts   # Canvas decode/render
│   ├── package.json
│   └── tailwind.config.ts
├── agents/
│   ├── picasso.ts
│   ├── defender.ts
│   ├── chaos.ts
│   ├── mimic.ts
│   ├── common.ts           # Shared: read canvas, send tx
│   └── ecosystem.config.js # pm2 config
├── tests/
│   ├── setup-localnet.ts
│   └── pixel-wars.ts
├── Anchor.toml
└── README.md
```

---

## Build Order

### Phase 1: Contract (Day 1 morning, ~3-4 hours)
1. Scaffold Anchor project, shared types, errors
2. `initialize` + `state.rs` (GameConfig, Canvas, PlayerStats, Round)
3. `start_round` — create canvas, delegate to ER
4. `place_pixel` — write RGB bytes, rate limit, increment stats
5. `end_round` — commit canvas back to L1
6. Tests on localnet with mb-test-validator + ephemeral-validator

### Phase 2: Frontend (Day 1 afternoon, ~4-5 hours)
1. Next.js scaffold, wallet-adapter, Tailwind setup
2. CanvasGrid — render 100x100 from on-chain bytes
3. ColorPicker + click-to-place flow
4. Connect to localnet, test end-to-end pixel placement
5. Scoreboard + activity feed
6. Polish: animations on pixel place, hover preview, mobile responsive

### Phase 3: AI Agents (Day 2 morning, ~2-3 hours)
1. `common.ts` — read canvas, send place_pixel tx to ER
2. Implement 4 strategies (picasso, defender, chaos, mimic)
3. Test on localnet — verify agents + human can coexist
4. pm2 config for production

### Phase 4: Deploy + Demo (Day 2 afternoon, ~2-3 hours)
1. Deploy program to Solana devnet
2. Point frontend to devnet + MagicBlock devnet ER
3. Deploy frontend to Vercel
4. Start agents against devnet
5. Record demo video: show empty canvas → agents painting → human joins → pixel war
6. Submit

**Total: ~12-15 hours of work across 2 days.**

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 30KB canvas account too large for ER delegation | Blocks entire project | Test delegation of large account early (Phase 1). Fallback: reduce to 50x50 (7.5KB) |
| Rate limiting inside ER unreliable (clock skew) | Bots spam canvas | Use slot-based rate limiting instead of timestamp. Or client-side throttle + on-chain last_slot check |
| Canvas read latency (polling 30KB every 2s) | Janky UX | Use ER websocket subscription. Fallback: optimistic local updates + periodic sync |
| ER devnet validators down during demo | Can't demo | Have localnet demo ready as backup. Record video beforehand |
| Account size limits on ER | Can't delegate | Confirmed: ER supports accounts up to 10MB. 30KB is fine |

---

## Senior Review Notes

**Do first hour of Day 1:**
- Test delegating a 30KB account to ER on localnet. If it fails, drop to 50x50 (7.5KB). Gameplay doesn't change. This is the only blocker.

**Canvas metadata:**
- The raw `[u8; 30000]` has no per-pixel ownership data. Scoreboard needs to know who placed what.
- Solution: emit `msg!` logs for each placement (player, x, y, color). Frontend parses tx logs for activity feed.
- Don't add metadata to the canvas account — keep the hot path lean.

**ER clock behavior:**
- `Clock::get()` may behave differently inside ER. Test rate limiting explicitly.
- Fallback: track `last_slot` per player instead of timestamp.

**ER endpoint config:**
- Localnet = `127.0.0.1:7799`, Devnet = MagicBlock public ER.
- Use environment variable, never hardcode.

**Cut from MVP:**
- ~~Mimic agent~~ — analyzing human patterns is scope creep. 3 agents is enough.
- ~~NFT mint of canvas~~ — mention in README as "production feature", don't build for hackathon.
- ~~Entry fees~~ — adds friction. Free to play for demo.

**Mention in README but don't build:**
- Entry fees per round
- NFT mint of final canvas
- Token-gated faction colors
- Mainnet deployment plan

---

## Hackathon Submission Checklist

- [ ] GitHub repo (public, clean README with screenshots)
- [ ] Live demo URL (Vercel + devnet)
- [ ] 2-min demo video showing: canvas with agents → human joins → pixel war → final canvas
- [ ] Architecture diagram showing ER flow
- [ ] README explains why ERs are essential (gasless pixels, can't exist without it)
