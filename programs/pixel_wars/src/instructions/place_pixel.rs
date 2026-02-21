use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;

#[derive(Accounts)]
pub struct PlacePixel<'info> {
    pub player: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.round_active @ PixelError::NoActiveRound,
    )]
    pub game_config: Account<'info, GameConfig>,

    /// The canvas — uses zero_copy AccountLoader.
    /// Lives inside ER during active round.
    #[account(
        mut,
        seeds = [SEED_CANVAS, game_config.current_round.to_le_bytes().as_ref()],
        bump,
    )]
    pub canvas: AccountLoader<'info, Canvas>,
}

pub fn handler(ctx: Context<PlacePixel>, x: u16, y: u16, r: u8, g: u8, b: u8) -> Result<()> {
    require!(x < CANVAS_WIDTH && y < CANVAS_HEIGHT, PixelError::OutOfBounds);

    let mut canvas = ctx.accounts.canvas.load_mut()?;
    let offset = ((y as usize) * (CANVAS_WIDTH as usize) + (x as usize)) * BYTES_PER_PIXEL;
    canvas.pixels[offset] = r;
    canvas.pixels[offset + 1] = g;
    canvas.pixels[offset + 2] = b;

    canvas.total_placements = canvas.total_placements
        .checked_add(1)
        .ok_or(PixelError::ArithmeticOverflow)?;

    msg!(
        "pixel({},{}) = #{:02x}{:02x}{:02x} by {}",
        x, y, r, g, b,
        ctx.accounts.player.key(),
    );

    Ok(())
}
