use anchor_lang::prelude::*;

/// Canvas dimensions
pub const CANVAS_WIDTH: u16 = 50;
pub const CANVAS_HEIGHT: u16 = 50;
/// 3 bytes per pixel (RGB)
pub const BYTES_PER_PIXEL: usize = 3;
/// Total pixel data size: 100*100*3 = 30,000
pub const CANVAS_DATA_SIZE: usize =
    (CANVAS_WIDTH as usize) * (CANVAS_HEIGHT as usize) * BYTES_PER_PIXEL;

/// Max number of teams
pub const MAX_TEAMS: u8 = 10;

/// PDA seeds
pub const SEED_CONFIG: &[u8] = b"config";
pub const SEED_CANVAS: &[u8] = b"canvas";
pub const SEED_PLAYER: &[u8] = b"player";
pub const SEED_ROUND: &[u8] = b"round";
pub const SEED_AGENT: &[u8] = b"agent";

/// Game configuration (singleton)
#[account]
pub struct GameConfig {
    /// Admin authority
    pub authority: Pubkey,
    /// Current round number (0 = no active round)
    pub current_round: u32,
    /// Whether a round is currently active
    pub round_active: bool,
    /// Bump seed
    pub bump: u8,
}

impl GameConfig {
    pub const LEN: usize = 8 + 32 + 4 + 1 + 1;
}

/// The pixel canvas — delegated to ER during active rounds.
/// Uses zero_copy to avoid BPF stack overflow (7.5KB+ data).
#[account(zero_copy(unsafe))]
#[repr(C)]
pub struct Canvas {
    /// Total pixels placed this round
    pub total_placements: u64,
    /// Which round this canvas belongs to
    pub round: u32,
    /// Bump seed
    pub bump: u8,
    /// Padding for alignment
    pub _padding: [u8; 3],
    /// Raw pixel data: [r0, g0, b0, r1, g1, b1, ...] row-major
    pub pixels: [u8; CANVAS_DATA_SIZE],
}

/// Per-player stats for a round
#[account]
pub struct PlayerStats {
    /// Player pubkey
    pub player: Pubkey,
    /// Round number
    pub round: u32,
    /// Total pixels placed
    pub pixels_placed: u32,
    /// Last placement slot (for rate limiting)
    pub last_placement_slot: u64,
    /// Bump seed
    pub bump: u8,
}

impl PlayerStats {
    pub const LEN: usize = 8 + 32 + 4 + 4 + 8 + 1;
}

/// Round metadata
#[account]
pub struct Round {
    /// Round number
    pub round_number: u32,
    /// Start slot
    pub start_slot: u64,
    /// End slot (0 if still active)
    pub end_slot: u64,
    /// Total pixels placed
    pub total_placements: u64,
    /// Whether the round has ended
    pub ended: bool,
    /// Bump seed
    pub bump: u8,
}

impl Round {
    pub const LEN: usize = 8 + 4 + 8 + 8 + 8 + 1 + 1;
}

/// Agent registration for a round (PDA: ["agent", agent_pubkey, round_le_bytes])
#[account]
pub struct AgentRegistration {
    /// Agent wallet pubkey
    pub agent: Pubkey,
    /// Round registered for
    pub round: u32,
    /// Team ID (0-indexed)
    pub team_id: u8,
    /// Registration timestamp
    pub registered_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl AgentRegistration {
    pub const LEN: usize = 8 + 32 + 4 + 1 + 8 + 1;
}
