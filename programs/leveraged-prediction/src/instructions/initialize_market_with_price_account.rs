use super::*;

pub fn handler(
    ctx: Context<InitializeMarketWithPriceAccount>,
    market_id: u16,
    sponsor_lamports: u64,
    payout_bps: u16,
    max_open_exposure: u64,
) -> Result<()> {
    if sponsor_lamports > 0 {
        transfer_lamports(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                LamportsTransfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.market.to_account_info(),
                },
            ),
            sponsor_lamports,
        )?;
    }

    let market = &mut ctx.accounts.market;
    market.market_id = market_id;
    market.oracle = Pubkey::default();
    market.oracle_feed_id = [0; 32];
    market.total_shares = 0;
    market.open_collateral = 0;
    market.risk_epoch_equity = 0;
    market.active_positions = 0;
    market.next_position_nonce = 0;
    market.mode = MarketMode::Open;
    market.bump = ctx.bumps.market;
    market.price_account = ctx.accounts.price_account.key();
    market.payout_bps = if payout_bps == 0 {
        DEFAULT_PAYOUT_BPS
    } else {
        payout_bps
    };
    market.max_open_exposure = if max_open_exposure == 0 {
        DEFAULT_MAX_OPEN_EXPOSURE
    } else {
        max_open_exposure
    };
    Ok(())
}

#[derive(Accounts)]
#[instruction(market_id: u16)]
pub struct InitializeMarketWithPriceAccount<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub collateral_mint: Account<'info, Mint>,
    #[account(seeds = [CONFIG_SEED], bump = protocol_config.bump, has_one = admin, has_one = collateral_mint)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    /// CHECK: PriceAccount must exist and be owned by program.
    pub price_account: Account<'info, PriceAccount>,
    #[account(init, payer = admin, space = 8 + Market::INIT_SPACE, seeds = [MARKET_SEED, &market_id.to_le_bytes()], bump)]
    pub market: Account<'info, Market>,
    #[account(init_if_needed, payer = admin, associated_token::mint = collateral_mint, associated_token::authority = market)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(seeds = [FEE_AUTHORITY_SEED, market.key().as_ref()], bump)]
    pub derived_fee_authority: UncheckedAccount<'info>,
    #[account(init_if_needed, payer = admin, associated_token::mint = collateral_mint, associated_token::authority = derived_fee_authority)]
    pub fee_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
