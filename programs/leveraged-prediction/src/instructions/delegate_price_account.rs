use super::*;
use ephemeral_rollups_sdk::anchor::delegate;

pub fn handler(ctx: Context<DelegatePriceAccount>, asset_symbol: [u8; 16], validator: Pubkey) -> Result<()> {
    ctx.accounts.delegate_price_account(
        &ctx.accounts.payer,
        &[PRICE_SEED, asset_symbol.as_ref()],
        price_delegation_config(validator),
    )?;
    Ok(())
}

fn price_delegation_config(validator: Pubkey) -> DelegateConfig {
    let mut config = delegated_state_config();
    config.validator = Some(validator);
    config
}

#[delegate]
#[derive(Accounts)]
#[instruction(asset_symbol: [u8; 16])]
pub struct DelegatePriceAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = protocol_config.bump, constraint = protocol_config.admin == payer.key() @ ErrorCode::InvalidConfig)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    /// CHECK: Program-owned PriceAccount PDA before delegation.
    #[account(mut, del, seeds = [PRICE_SEED, asset_symbol.as_ref()], bump)]
    pub price_account: UncheckedAccount<'info>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_account_is_pinned_to_validator() {
        let validator = Pubkey::new_unique();
        let config = price_delegation_config(validator);
        assert_eq!(config.validator, Some(validator));
        assert_eq!(config.commit_frequency_ms, 10_000);
    }
}
