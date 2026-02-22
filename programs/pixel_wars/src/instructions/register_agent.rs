use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PixelError;

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG],
        bump = game_config.bump,
        constraint = game_config.round_active @ PixelError::NoActiveRound,
    )]
    pub game_config: Account<'info, GameConfig>,

    #[account(
        init,
        payer = agent,
        space = AgentRegistration::LEN,
        seeds = [
            SEED_AGENT,
            agent.key().as_ref(),
            game_config.current_round.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub registration: Account<'info, AgentRegistration>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterAgent>, team_id: u8) -> Result<()> {
    require!(team_id < MAX_TEAMS, PixelError::InvalidTeamId);

    let reg = &mut ctx.accounts.registration;
    reg.agent = ctx.accounts.agent.key();
    reg.round = ctx.accounts.game_config.current_round;
    reg.team_id = team_id;
    reg.registered_at = Clock::get()?.unix_timestamp;
    reg.bump = ctx.bumps.registration;

    msg!(
        "Agent {} registered for round {} as team {}",
        reg.agent,
        reg.round,
        reg.team_id,
    );

    Ok(())
}
