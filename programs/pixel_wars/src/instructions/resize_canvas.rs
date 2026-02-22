use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;
use super::start_round::CANVAS_ACCOUNT_SIZE;

/// Grow the canvas account toward its full size.
/// Solana limits realloc to 10KB per instruction, so call multiple times.
#[derive(Accounts)]
pub struct ResizeCanvas<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.authority == authority.key() @ PixelError::Unauthorized,
        constraint = game_config.round_active @ PixelError::NoActiveRound,
    )]
    pub game_config: Account<'info, GameConfig>,

    /// CHECK: Canvas account being resized — validated via seeds
    #[account(
        mut,
        seeds = [SEED_CANVAS, game_config.current_round.to_le_bytes().as_ref()],
        bump,
    )]
    pub canvas: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResizeCanvas>) -> Result<()> {
    let canvas = &ctx.accounts.canvas;
    let current_len = canvas.data_len();
    let target_len = CANVAS_ACCOUNT_SIZE;

    if current_len >= target_len {
        msg!("Canvas already at full size: {}", current_len);
        return Ok(());
    }

    // Grow by up to 10KB per call
    let max_growth: usize = 10240;
    let new_len = std::cmp::min(current_len + max_growth, target_len);
    let rent = Rent::get()?;
    let new_rent = rent.minimum_balance(new_len);
    let current_rent = canvas.lamports();

    if new_rent > current_rent {
        let diff = new_rent - current_rent;
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: canvas.to_account_info(),
                },
            ),
            diff,
        )?;
    }

    #[allow(deprecated)]
    canvas.realloc(new_len, true)?;

    msg!("Canvas resized: {} -> {} (target: {})", current_len, new_len, target_len);
    Ok(())
}
