use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;
use ephemeral_rollups_sdk::cpi::{delegate_account, DelegateAccounts, DelegateConfig};

/// Delegate the canvas account to an ER validator.
/// Called by admin after start_round.
#[derive(Accounts)]
pub struct DelegateCanvas<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.authority == authority.key() @ PixelError::Unauthorized,
        constraint = game_config.round_active @ PixelError::NoActiveRound,
    )]
    pub game_config: Account<'info, GameConfig>,

    /// CHECK: Canvas account to delegate — uses AccountInfo because
    /// delegation CPI changes the owner mid-instruction.
    #[account(mut)]
    pub canvas: AccountInfo<'info>,

    /// CHECK: Owner program (this program).
    #[account(address = crate::ID)]
    pub owner_program: AccountInfo<'info>,

    /// CHECK: Buffer PDA used by delegation program.
    #[account(mut)]
    pub buffer: AccountInfo<'info>,

    /// CHECK: Delegation record PDA.
    #[account(mut)]
    pub delegation_record: AccountInfo<'info>,

    /// CHECK: Delegation metadata PDA.
    #[account(mut)]
    pub delegation_metadata: AccountInfo<'info>,

    /// CHECK: MagicBlock delegation program.
    pub delegation_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // remaining_accounts[0] = ER validator identity (for localnet)
}

pub fn handler(ctx: Context<DelegateCanvas>) -> Result<()> {
    let round_bytes = ctx.accounts.game_config.current_round.to_le_bytes();
    let pda_seeds: &[&[u8]] = &[SEED_CANVAS, &round_bytes];

    let validator = ctx.remaining_accounts.first().map(|a| a.key());

    delegate_account(
        DelegateAccounts {
            payer: &ctx.accounts.authority.to_account_info(),
            pda: &ctx.accounts.canvas,
            owner_program: &ctx.accounts.owner_program,
            buffer: &ctx.accounts.buffer,
            delegation_record: &ctx.accounts.delegation_record,
            delegation_metadata: &ctx.accounts.delegation_metadata,
            delegation_program: &ctx.accounts.delegation_program,
            system_program: &ctx.accounts.system_program.to_account_info(),
        },
        pda_seeds,
        DelegateConfig {
            commit_frequency_ms: 30000,
            validator,
        },
    )?;

    msg!(
        "Canvas for round {} delegated to ER",
        ctx.accounts.game_config.current_round
    );
    Ok(())
}
