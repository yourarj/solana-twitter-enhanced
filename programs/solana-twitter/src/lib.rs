use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

declare_id!("DheWr3dFgW3D2y6RL1CaWxG33Hnp9kvpoJXEedseVpLu");

#[program]
pub mod solana_twitter {

    use super::*;
    pub fn send_tweet(
        ctx: Context<SendTweet>,
        space_required: u32,
        topic: String,
        content: String,
    ) -> ProgramResult {
        let tweet_account: &mut Account<Tweet> = &mut ctx.accounts.tweet;

        msg!("Requested space: {}", space_required);
        if space_required > 10 * 1000 * 1000 {
            return Err(ErrorCode::AccountSizeTooLarge.into());
        }

        msg!("Topic length {}", tweet_account.topic.len());
        if topic.len() > MAX_TOPIC_LENGTH {
            return Err(ErrorCode::TopicTooLong.into());
        }

        msg!("Content length {}", tweet_account.content.len());
        if content.len() > MAX_CONTENT_LENGTH {
            return Err(ErrorCode::ContentTooLong.into());
        }

        let tweet_author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        tweet_account.author = *tweet_author.key;
        tweet_account.timestamp = clock.unix_timestamp;
        tweet_account.topic = topic;
        tweet_account.content = content;

        Ok(())
    }

    pub fn delete_tweet(ctx: Context<DeleteTweet>) -> ProgramResult {
        let tweet_account: &AccountInfo = &ctx.accounts.account;
        let signer: &Signer = &ctx.accounts.author;
        msg!("Account Balance before: {}", **signer.lamports.borrow());
        let lamports_to_return = **tweet_account.lamports.borrow();

        **tweet_account.lamports.borrow_mut() -= lamports_to_return;
        **signer.lamports.borrow_mut() += lamports_to_return;

        msg!("Account Balance after: {}", **signer.lamports.borrow());
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(space_required: u32)]
pub struct SendTweet<'info> {
    #[account(init_if_needed, payer=author, space= Tweet::TWEET_BAGGAGE + space_required as usize)]
    pub tweet: Account<'info, Tweet>,
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DeleteTweet<'info> {
    #[account(mut)]
    pub account: AccountInfo<'info>,
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

// 1. Define the structure of the Tweet account.
#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

// 2. Add some useful constants for sizing propeties.
const _CHAR_SIZE: usize = 4;
const DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const _STRING_LENGTH_PREFIX: usize = 4; // Stores the size of the string.
const MAX_TOPIC_LENGTH: usize = 50; // 50 chars max.
const MAX_CONTENT_LENGTH: usize = 280; // 280 chars max.

// 3. Add a constant on the Tweet account that provides its total size.
impl Tweet {
    const TWEET_BAGGAGE: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // Author.
        + TIMESTAMP_LENGTH; // Timestamp.
}

#[error]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong,
    #[msg("Account size is bigger than max allowed 10,000,000 bytes")]
    AccountSizeTooLarge,
}
