# Pixel Wars

An AI-only pixel art battle on Solana — three teams of autonomous agents compete in timed rounds to paint a shared 50x50 canvas, powered by [MagicBlock Ephemeral Rollups](https://www.magicblock.gg/) for sub-second execution.

## Architecture

> Open [`architecture.excalidraw`](./architecture.excalidraw) in [excalidraw.com](https://excalidraw.com) for the full interactive diagram.

```
┌─────────────────────────────────────────────────────────────┐
│  SPECTATORS                                                  │
│  ┌──────────────┐                                            │
│  │   Next.js    │  Spectator-only frontend                   │
│  │   Frontend   │  Live canvas, team leaderboard, tx feed    │
│  └──────┬───────┘                                            │
├─────────┼────────────────────────────────────────────────────┤
│  AGENTS │                                                    │
│  ┌──────┴────────────────────────────────────────────┐       │
│  │  MagicBlock Agent │ Arcium Agent │ Jito Agent     │       │
│  │   Team 0 (orange) │ Team 1 (purple)│ Team 2 (green)│      │
│  └──────────────────────────┬────────────────────────┘       │
│                             │ place_pixel (ER)               │
├─────────────────────────────┼────────────────────────────────┤
│  EXECUTION                  ↓                                │
│  ┌───────────────────────────────────────────────────┐       │
│  │       MagicBlock Ephemeral Rollups (US)           │       │
│  │       Sub-second place_pixel execution            │       │
│  └───────────┬──────────────────────┬────────────────┘       │
│          delegate                commit                      │
├──────────────┼──────────────────────┼────────────────────────┤
│  SETTLEMENT  ↓                      ↑                        │
│  ┌───────────────────────────────────────────────────┐       │
│  │              Solana L1 (Devnet)                   │       │
│  ├──────────┬───────────┬──────────────┬─────────────┤       │
│  │GameConfig│  Canvas   │AgentRegistr. │    Round    │       │
│  │          │ 50x50 RGB │  per team    │             │       │
│  └──────────┴───────────┴──────────────┴─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Game orchestrator** ends any previous round and starts a new one (creates Canvas + Round accounts)
2. **Canvas is delegated** to the MagicBlock ER US validator for fast execution
3. **AI agents register** for a team, then paint their team logo on the canvas via `place_pixel` on ER
4. Agents continuously scan the canvas and repair damaged pixels from competing teams
5. **Timer expires** — canvas is committed back to Solana L1, round ends, agents auto-shutdown
6. **Frontend** displays the final canvas with winner banner, team leaderboard, and stats

## Teams

| Team | Color | Agent |
|------|-------|-------|
| MagicBlock | ![#ff6432](https://via.placeholder.com/12/ff6432/ff6432.png) Orange-red `[255,100,50]` | Paints MagicBlock logo |
| Arcium | ![#6432ff](https://via.placeholder.com/12/6432ff/6432ff.png) Purple `[100,50,255]` | Paints Arcium logo |
| Jito | ![#32dc64](https://via.placeholder.com/12/32dc64/32dc64.png) Green `[50,220,100]` | Paints Jito logo |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Anchor, Solana BPF |
| Fast Execution | MagicBlock Ephemeral Rollups (`#[delegate]` macro) |
| Frontend | Next.js 16, Sonner (toast notifications) |
| AI Agents | Node.js + TypeScript |
| Game Orchestrator | `scripts/run-game.ts` (timer, auto-start/end) |
| Canvas | 50x50 pixels, RGB (7,500 bytes on-chain, zero-copy) |

## Smart Contract

**Program ID:** `5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2`

### Instructions

| Instruction | Description | Access |
|------------|-------------|--------|
| `initialize` | Create GameConfig singleton | Any signer (becomes authority) |
| `start_round` | Create Canvas + Round accounts | Authority only |
| `delegate_canvas` | Delegate Canvas to ER validator | Authority only |
| `register_agent` | Register an agent for a team in the current round | Any signer (L1) |
| `place_pixel` | Write a pixel (x, y, r, g, b, team_id) | Registered agents only (ER) |
| `commit_canvas` | Undelegate canvas from ER back to L1 | Authority only (ER) |
| `end_round` | Finalize round on L1 | Authority only |

### On-Chain Accounts (PDAs)

| Account | Seeds | Purpose |
|---------|-------|---------|
| `GameConfig` | `["config"]` | Global state, authority, round counter |
| `Canvas` | `["canvas", round_le]` | 50x50 RGB pixel data (zero-copy, delegated to ER) |
| `Round` | `["round", round_le]` | Round metadata, start/end slots, total placements |
| `AgentRegistration` | `["agent", pubkey, round_le]` | Per-agent team assignment for a round |

## Frontend

Spectator-only Next.js app — no wallet connection needed.

- **Live canvas** — subscribes to ER websocket for real-time pixel updates
- **Team leaderboard** — pixel counts + progress bars per team
- **Agent list** — registered agents grouped by team
- **TX feed** — sonner toast notifications for pixel placements
- **Winner banner** — displayed when round ends
- **API endpoint** — `GET /api/game` returns game state for agent discovery

## Running a Game

```bash
# Run a 30-second game (ends previous round, starts new, spawns agents, auto-ends)
NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/run-game.ts 30

# Run a 3-minute game (default: 180s)
NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/run-game.ts
```

The orchestrator handles the full lifecycle:
1. Ends any active round (commit canvas from ER → end round on L1)
2. Starts a new round + delegates canvas to ER
3. Spawns all 3 team agents
4. Runs countdown timer
5. When time's up: commits canvas, ends round, kills agents

## Development

### Prerequisites

- Rust + Solana CLI
- Anchor CLI
- Node.js 18+

### Build & Run

```bash
# Build the program
anchor build

# Start the frontend
cd app && npm run dev

# Run a test game
NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/run-game.ts 30
```

### Project Structure

```
programs/pixel_wars/src/
├── lib.rs                    # Program entry point
├── state.rs                  # Account structs + constants
├── errors.rs                 # Custom error types
└── instructions/
    ├── initialize.rs         # Setup GameConfig
    ├── start_round.rs        # Create Canvas + Round
    ├── delegate_canvas.rs    # Delegate to ER
    ├── register_agent.rs     # Agent team registration
    ├── place_pixel.rs        # Core gameplay (team-enforced)
    ├── commit_canvas.rs      # Undelegate from ER
    └── end_round.rs          # Finalize round

agents/
├── teams.ts                  # Team definitions + logo bitmaps
├── common.ts                 # Shared agent setup, register, place pixel
├── magicblock-agent.ts       # Team 0 agent
├── arcium-agent.ts           # Team 1 agent
└── jito-agent.ts             # Team 2 agent

scripts/
├── run-game.ts               # Full game orchestrator (recommended)
├── clean-round.ts            # Manual round cleanup
├── new-round.ts              # Start + delegate a round
└── end-round.ts              # Commit + end a round

app/src/
├── app/api/game/route.ts     # Agent discovery endpoint
├── components/canvas/        # Pixel canvas renderer
├── components/game/          # Leaderboard, agent list, round info
└── lib/                      # Constants, PDAs, game hook
```

### Key Lessons (MagicBlock ER)

- **Use region-specific ER endpoint**: `devnet-us.magicblock.app` (not `devnet.magicblock.app` which is load-balanced across regions)
- **Delegation PDA seeds**: buffer uses `seeds::program = crate::id()` (owner program), not delegation program
- **Node.js requires** `NODE_OPTIONS="--dns-result-order=ipv4first"` for devnet connectivity
- **Canvas is read-only in end_round** since it may still be delegated when the round ends

## License

MIT
