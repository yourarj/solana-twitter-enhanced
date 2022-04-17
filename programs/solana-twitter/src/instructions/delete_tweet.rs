//! Delete Tweet Operation
//! 
//! facilitates deleting a tweet

use crate::state::tweet::Tweet;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

/// ## delete tweet method
/// 
/// deletes the tweet account from blockchain an returns the rent to owner of account
/// 
pub fn delete_tweet(ctx: Context<DeleteTweet>) -> Result<()> {
    let tweet_account = &ctx.accounts.account.to_account_info();
    let signer: &Signer = &ctx.accounts.author;
    msg!("Account Balance before: {}", **signer.lamports.borrow());
    let lamports_to_return = **tweet_account.lamports.borrow();

    **tweet_account.lamports.borrow_mut() -= lamports_to_return;
    **signer.lamports.borrow_mut() += lamports_to_return;

    msg!("Account Balance after: {}", **signer.lamports.borrow());
    Ok(())
}

/// DeleteTweet struct
/// 
/// Hold metadata reqired to identify target tweet account \
/// to be deleted
#[derive(Accounts)]
pub struct DeleteTweet<'info> {
    #[account(mut)]
    pub account: Account<'info, Tweet>,
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}
