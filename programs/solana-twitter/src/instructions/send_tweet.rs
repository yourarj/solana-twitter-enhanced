use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::tweet::Tweet;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

pub fn send_tweet(
    ctx: Context<SendTweet>,
    space_required: u32,
    topic: String,
    content: String,
) -> Result<()> {
    let tweet_account: &mut Account<Tweet> = &mut ctx.accounts.tweet;

    msg!("Requested space: {}", space_required);
    require!(
        space_required < 10 * 1000 * 1000,
        ErrorCode::AccountSizeTooLarge
    );

    msg!("Topic length {}", topic.len());
    require!(topic.len() < MAX_TOPIC_LENGTH, ErrorCode::TopicTooLong);

    msg!("Content length {}", content.len());
    require!(
        content.len() < MAX_CONTENT_LENGTH,
        ErrorCode::ContentTooLong
    );

    let tweet_author: &Signer = &ctx.accounts.author;
    let clock: Clock = Clock::get().unwrap();

    tweet_account.author = *tweet_author.key;
    tweet_account.timestamp = clock.unix_timestamp;
    tweet_account.topic = topic;
    tweet_account.content = content;

    Ok(())
}

#[derive(Accounts)]
#[instruction(space_required: u32)]
pub struct SendTweet<'info> {
    #[account(init, payer=author, space= Tweet::TWEET_BAGGAGE + space_required as usize)]
    pub tweet: Account<'info, Tweet>,
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}
