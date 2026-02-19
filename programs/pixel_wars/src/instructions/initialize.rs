use anchor_lang::prelude::*;
use crate::state::{GameConfig, SEED_CONFIG};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = GameConfig::LEN,
        seeds = [SEED_CONFIG],
        bump,
    )]
    pub game_config: Account<'info, GameConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.game_config;
    config.authority = ctx.accounts.authority.key();
    config.current_round = 0;
    config.round_active = false;
    config.bump = ctx.bumps.game_config;

    msg!("Pixel Wars initialized! Authority: {}", config.authority);
    Ok(())
}
