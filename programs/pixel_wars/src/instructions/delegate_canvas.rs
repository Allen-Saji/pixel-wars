use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

/// Delegate the canvas account to an ER validator.
/// Called by admin after start_round.
#[delegate]
#[derive(Accounts)]
pub struct DelegateCanvas<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.authority == payer.key() @ PixelError::Unauthorized,
        constraint = game_config.round_active @ PixelError::NoActiveRound,
    )]
    pub game_config: Account<'info, GameConfig>,

    /// CHECK: Canvas account to delegate — uses AccountInfo because
    /// Canvas is zero_copy and the delegation CPI changes ownership.
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,

    /// CHECK: ER validator identity
    pub validator: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DelegateCanvas>) -> Result<()> {
    let round_bytes = ctx.accounts.game_config.current_round.to_le_bytes();

    ctx.accounts.delegate_pda(
        &ctx.accounts.payer,
        &[SEED_CANVAS, &round_bytes],
        DelegateConfig {
            validator: Some(ctx.accounts.validator.key()),
            ..DelegateConfig::default()
        },
    )?;

    msg!(
        "Canvas for round {} delegated to ER",
        ctx.accounts.game_config.current_round
    );
    Ok(())
}
