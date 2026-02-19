# Pixel Wars

A multiplayer pixel art game on Solana where humans and AI agents compete in real-time to paint a shared 50x50 canvas — powered by [MagicBlock Ephemeral Rollups](https://www.magicblock.gg/) for gasless, sub-second execution.

## Architecture

> Open [`architecture.excalidraw`](./architecture.excalidraw) in [excalidraw.com](https://excalidraw.com) for the full interactive diagram.

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS                                                    │
│  ┌──────────────┐   ┌─────────┐ ┌──────────┐ ┌───────┐     │
│  │ Human Players│   │ Picasso │ │ Defender  │ │ Chaos │     │
│  └──────┬───────┘   └────┬────┘ └─────┬────┘ └───┬───┘     │
├─────────┼────────────────┼────────────┼──────────┼──────────┤
│  APPLICATION             │            │          │          │
│  ┌──────┴───────┐   ┌────┴────────────┴──────────┴───┐      │
│  │   Next.js    │   │        Agent Runtime           │      │
│  │  Frontend    │   │       Node.js + pm2            │      │
│  └──────┬───────┘   └──────────────┬─────────────────┘      │
├─────────┼──────────────────────────┼────────────────────────┤
│  EXECUTION                         │                        │
│  ┌─────────────────────────────────┴──────────────────┐     │
│  │      MagicBlock Ephemeral Rollups                  │     │
│  │      Gasless place_pixel Execution                 │     │
│  └───────────┬──────────────────────┬─────────────────┘     │
│          delegate                commit                     │
├──────────────┼──────────────────────┼───────────────────────┤
│  SETTLEMENT  ↓                      ↑                       │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Solana L1 Blockchain                │       │
│  ├──────────┬───────────┬─────────────┬─────────────┤       │
│  │GameConfig│  Canvas   │ PlayerStats │    Round     │       │
│  │          │ 50x50 RGB │             │             │       │
│  └──────────┴───────────┴─────────────┴─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Admin** initializes the game and starts a round (creates Canvas + Round accounts)
2. **Canvas is delegated** to a MagicBlock ER validator for gasless execution
3. **Players and AI agents** send `place_pixel` transactions to the ER — zero gas fees, sub-second confirmations
4. Each pixel placement writes RGB data directly to the on-chain Canvas account (rate-limited: 1 pixel per ~4 seconds per player)
5. **Admin ends the round** — the Canvas is committed back to Solana L1 as a permanent snapshot

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Anchor 0.32.1, Solana BPF |
| Gasless Execution | MagicBlock Ephemeral Rollups SDK 0.8.5 |
| Frontend | Next.js, Solana Wallet Adapter |
| AI Agents | Node.js, pm2 |
| Canvas | 50x50 pixels, RGB (7,500 bytes on-chain) |

## Smart Contract

**Program ID:** `DTixMqrK6NTWSjVVCeLWojjiHjffRLcVFCdk5LorvR8K`

### Instructions

| Instruction | Description | Access |
|------------|-------------|--------|
| `initialize` | Create GameConfig singleton | Any signer (becomes authority) |
| `start_round` | Create Canvas + Round accounts | Authority only |
| `delegate_canvas` | Delegate Canvas to ER validator | Authority only |
| `place_pixel` | Write a pixel (x, y, r, g, b) | Any signer (runs in ER) |
| `end_round` | Commit Canvas back to L1, finalize round | Authority only (runs in ER) |

### On-Chain Accounts (PDAs)

| Account | Seeds | Size | Purpose |
|---------|-------|------|---------|
| `GameConfig` | `["config"]` | ~46 B | Global state, authority, round counter |
| `Canvas` | `["canvas", round]` | ~7.5 KB | 50x50 RGB pixel data (zero-copy) |
| `PlayerStats` | `["player", round, pubkey]` | ~57 B | Per-player placement count + cooldown |
| `Round` | `["round", round]` | ~38 B | Round metadata, start/end slots |

### Rate Limiting

- **Cooldown:** 10 slots (~4-5 seconds at 400ms/slot)
- **Bounds check:** x < 50, y < 50
- **Pixel format:** RGB, 3 bytes per pixel, row-major layout

## AI Agents

Three autonomous agents compete alongside human players:

| Agent | Strategy | Behavior |
|-------|----------|----------|
| **Picasso** | Template artist | Draws pixel art patterns (hearts, logos, spirals) |
| **Defender** | Territory guard | Claims a quadrant, overwrites enemy pixels |
| **Chaos** | Randomizer | Random position, random color — creates visual noise |

All agents run gaslessly on the ER — zero cost, managed via pm2.

## Development

### Prerequisites

- Rust + Solana CLI
- Anchor CLI 0.32.1
- Node.js 18+

### Build & Test

```bash
# Build the program
anchor build

# Run tests (12/12 passing)
anchor test
```

### Project Structure

```
programs/pixel_wars/src/
├── lib.rs              # Program entry point
├── state.rs            # Account structs + constants
├── errors.rs           # Custom error types
└── instructions/
    ├── initialize.rs    # Setup GameConfig
    ├── start_round.rs   # Create Canvas + Round
    ├── delegate_canvas.rs # Delegate to ER
    ├── place_pixel.rs   # Core gameplay
    └── end_round.rs     # Commit + finalize
```

## License

MIT
