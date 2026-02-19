use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

/// End the round: commit canvas back from ER and freeze state.
/// Must be called from INSIDE the ER.
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

    /// CHECK: Canvas — uses AccountInfo because commit CPI changes ownership.
    #[account(mut)]
    pub canvas: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [SEED_ROUND, game_config.current_round.to_le_bytes().as_ref()],
        bump = round.bump,
        constraint = !round.ended @ PixelError::RoundEnded,
    )]
    pub round: Account<'info, Round>,

    /// CHECK: MagicBlock magic context for commit CPI.
    #[account(mut)]
    pub magic_context: AccountInfo<'info>,

    /// CHECK: MagicBlock magic program.
    pub magic_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EndRound>) -> Result<()> {
    // Read total_placements from canvas before commit
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

    // Commit canvas back to base layer and undelegate
    commit_and_undelegate_accounts(
        &ctx.accounts.authority.to_account_info(),
        vec![&ctx.accounts.canvas.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;

    msg!(
        "Round {} ended at slot {}. Total pixels: {}",
        round.round_number,
        round.end_slot,
        total_placements
    );

    Ok(())
}
