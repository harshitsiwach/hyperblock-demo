use super::*;

pub fn handler(ctx: Context<UpdatePrice>, price: u64) -> Result<()> {
    require!(price != 0, ErrorCode::InvalidPrice);
    require_keys_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.price_account.authority,
        ErrorCode::UnauthorizedOracle
    );
    let price_account = &mut ctx.accounts.price_account;
    let clock = Clock::get()?;
    price_account.price = price;
    price_account.timestamp = clock.unix_timestamp;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority @ ErrorCode::UnauthorizedOracle)]
    pub price_account: Account<'info, PriceAccount>,
}
