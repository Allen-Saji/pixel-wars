use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

/// Commit canvas from ER back to base layer.
/// Must be called from INSIDE the ER by the authority.
#[derive(Accounts)]
pub struct CommitCanvas<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Canvas — uses AccountInfo because commit CPI changes ownership.
    #[account(mut)]
    pub canvas: AccountInfo<'info>,

    /// CHECK: MagicBlock magic context for commit CPI.
    #[account(mut)]
    pub magic_context: AccountInfo<'info>,

    /// CHECK: MagicBlock magic program.
    pub magic_program: AccountInfo<'info>,
}

pub fn handler(ctx: Context<CommitCanvas>) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.authority.to_account_info(),
        vec![&ctx.accounts.canvas.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;

    msg!("Canvas committed and undelegated");
    Ok(())
}
