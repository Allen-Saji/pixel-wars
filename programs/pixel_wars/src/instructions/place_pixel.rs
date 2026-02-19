use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;

#[derive(Accounts)]
pub struct PlacePixel<'info> {
    #[account(mut)]
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

    /// Player stats — init if first placement this round.
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerStats::LEN,
        seeds = [SEED_PLAYER, game_config.current_round.to_le_bytes().as_ref(), player.key().as_ref()],
        bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlacePixel>, x: u16, y: u16, r: u8, g: u8, b: u8) -> Result<()> {
    // Bounds check
    require!(x < CANVAS_WIDTH && y < CANVAS_HEIGHT, PixelError::OutOfBounds);

    let clock = Clock::get()?;
    let stats = &mut ctx.accounts.player_stats;

    // Rate limit: check cooldown (skip for first placement)
    if stats.pixels_placed > 0 {
        let elapsed = clock.slot.saturating_sub(stats.last_placement_slot);
        require!(elapsed >= PLACEMENT_COOLDOWN_SLOTS, PixelError::CooldownNotElapsed);
    }

    // Write pixel to canvas via zero_copy
    {
        let mut canvas = ctx.accounts.canvas.load_mut()?;
        let offset = ((y as usize) * (CANVAS_WIDTH as usize) + (x as usize)) * BYTES_PER_PIXEL;
        canvas.pixels[offset] = r;
        canvas.pixels[offset + 1] = g;
        canvas.pixels[offset + 2] = b;

        canvas.total_placements = canvas.total_placements
            .checked_add(1)
            .ok_or(PixelError::ArithmeticOverflow)?;
    }

    // Update player stats
    if stats.pixels_placed == 0 {
        stats.player = ctx.accounts.player.key();
        stats.round = ctx.accounts.game_config.current_round;
        stats.bump = ctx.bumps.player_stats;
    }
    stats.pixels_placed = stats.pixels_placed
        .checked_add(1)
        .ok_or(PixelError::ArithmeticOverflow)?;
    stats.last_placement_slot = clock.slot;

    msg!(
        "pixel({},{}) = #{:02x}{:02x}{:02x} by {} [#{}]",
        x, y, r, g, b,
        ctx.accounts.player.key(),
        stats.pixels_placed
    );

    Ok(())
}
