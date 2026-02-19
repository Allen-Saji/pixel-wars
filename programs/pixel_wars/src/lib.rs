use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

// Re-export at crate root so #[program] macro can find __client_accounts_*
pub use instructions::initialize::*;
pub use instructions::start_round::*;
pub use instructions::delegate_canvas::*;
pub use instructions::place_pixel::*;
pub use instructions::end_round::*;

declare_id!("5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2");

#[program]
pub mod pixel_wars {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn start_round(ctx: Context<StartRound>) -> Result<()> {
        instructions::start_round::handler(ctx)
    }

    pub fn delegate_canvas(ctx: Context<DelegateCanvas>) -> Result<()> {
        instructions::delegate_canvas::handler(ctx)
    }

    pub fn place_pixel(ctx: Context<PlacePixel>, x: u16, y: u16, r: u8, g: u8, b: u8) -> Result<()> {
        instructions::place_pixel::handler(ctx, x, y, r, g, b)
    }

    pub fn end_round(ctx: Context<EndRound>) -> Result<()> {
        instructions::end_round::handler(ctx)
    }
}
