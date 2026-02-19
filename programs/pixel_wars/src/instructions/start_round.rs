use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;

/// Canvas account size: 8 (discriminator) + struct size with repr(C) alignment
/// Layout: round(u32,4) + pad(4) + total_placements(u64,8) + bump(u8,1) + _padding(3) + pixels(7500)
/// = 8 + 4 + 4 + 8 + 1 + 3 + 7500 = 7528
pub const CANVAS_ACCOUNT_SIZE: usize = 8 + std::mem::size_of::<Canvas>();

#[derive(Accounts)]
pub struct StartRound<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.authority == authority.key() @ PixelError::Unauthorized,
        constraint = !game_config.round_active @ PixelError::RoundAlreadyActive,
    )]
    pub game_config: Account<'info, GameConfig>,

    /// Canvas uses zero_copy — init with `zero` constraint
    #[account(
        init,
        payer = authority,
        space = CANVAS_ACCOUNT_SIZE,
        seeds = [SEED_CANVAS, (game_config.current_round + 1).to_le_bytes().as_ref()],
        bump,
    )]
    pub canvas: AccountLoader<'info, Canvas>,

    #[account(
        init,
        payer = authority,
        space = Round::LEN,
        seeds = [SEED_ROUND, (game_config.current_round + 1).to_le_bytes().as_ref()],
        bump,
    )]
    pub round: Account<'info, Round>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<StartRound>) -> Result<()> {
    let config = &mut ctx.accounts.game_config;
    let new_round_num = config.current_round
        .checked_add(1)
        .ok_or(PixelError::ArithmeticOverflow)?;

    config.current_round = new_round_num;
    config.round_active = true;

    // Initialize canvas via zero_copy loader
    {
        let mut canvas = ctx.accounts.canvas.load_init()?;
        canvas.round = new_round_num;
        canvas.total_placements = 0;
        canvas.bump = ctx.bumps.canvas;
        // pixels array is zero-initialized (black canvas)
    }

    let round = &mut ctx.accounts.round;
    round.round_number = new_round_num;
    round.start_slot = Clock::get()?.slot;
    round.end_slot = 0;
    round.total_placements = 0;
    round.ended = false;
    round.bump = ctx.bumps.round;

    msg!("Round {} started at slot {}", new_round_num, round.start_slot);
    Ok(())
}
