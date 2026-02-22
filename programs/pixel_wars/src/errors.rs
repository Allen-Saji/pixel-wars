use anchor_lang::prelude::*;

#[error_code]
pub enum PixelError {
    #[msg("Unauthorized — only authority can perform this action")]
    Unauthorized = 6000,

    #[msg("No active round")]
    NoActiveRound,

    #[msg("Round is already active")]
    RoundAlreadyActive,

    #[msg("Pixel coordinates out of bounds (max 99x99)")]
    OutOfBounds,

    #[msg("Placement cooldown not elapsed — wait a few seconds")]
    CooldownNotElapsed,

    #[msg("Round has already ended")]
    RoundEnded,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid team ID")]
    InvalidTeamId,

    #[msg("Agent already registered for this round")]
    AgentAlreadyRegistered,
}
