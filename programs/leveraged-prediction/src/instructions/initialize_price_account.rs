use super::*;

pub fn handler(
    ctx: Context<InitializePriceAccount>,
    asset_symbol: [u8; 16],
    dex: [u8; 8],
) -> Result<()> {
    let price_account = &mut ctx.accounts.price_account;
    price_account.authority = ctx.accounts.authority.key();
    price_account.asset_symbol = asset_symbol;
    price_account.dex = dex;
    price_account.price = 0;
    price_account.timestamp = Clock::get()?.unix_timestamp;
    price_account.bump = ctx.bumps.price_account;
    Ok(())
}

#[derive(Accounts)]
#[instruction(asset_symbol: [u8; 16])]
pub struct InitializePriceAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + PriceAccount::INIT_SPACE,
        seeds = [PRICE_SEED, asset_symbol.as_ref()],
        bump
    )]
    pub price_account: Account<'info, PriceAccount>,
    pub system_program: Program<'info, System>,
}
