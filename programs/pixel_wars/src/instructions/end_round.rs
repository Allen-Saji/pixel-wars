use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;

/// End the round on L1: update config + round metadata.
/// Canvas must already be committed back from ER (via commit_canvas).
#[derive(Accounts)]
pub struct EndRound<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.authority == authority.key() @ PixelError::Unauthorized,
        constraint = game_config.round_active @ PixelError::NoActiveRound,
    )]
    pub game_config: Account<'info, GameConfig>,

    /// CHECK: Canvas — read total_placements from raw data (not mut: may be delegated).
    pub canvas: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [SEED_ROUND, game_config.current_round.to_le_bytes().as_ref()],
        bump = round.bump,
        constraint = !round.ended @ PixelError::RoundEnded,
    )]
    pub round: Account<'info, Round>,
}

pub fn handler(ctx: Context<EndRound>) -> Result<()> {
    // Read total_placements from canvas
    // Canvas zero_copy layout: 8 (discriminator) + 8 (total_placements) + 4 (round) + 1 (bump) + 3 (pad) + pixels
    let canvas_data = ctx.accounts.canvas.try_borrow_data()?;
    let total_placements = u64::from_le_bytes(
        canvas_data[8..16].try_into().unwrap()
    );
    drop(canvas_data);

    let config = &mut ctx.accounts.game_config;
    let round = &mut ctx.accounts.round;
    let clock = Clock::get()?;

    round.end_slot = clock.slot;
    round.total_placements = total_placements;
    round.ended = true;
    config.round_active = false;

    msg!(
        "Round {} ended at slot {}. Total pixels: {}",
        round.round_number,
        round.end_slot,
        total_placements
    );

    Ok(())
}
