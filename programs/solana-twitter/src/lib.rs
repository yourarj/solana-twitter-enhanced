pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::delete_tweet::*;
use instructions::send_tweet::*;

declare_id!("BTh1KPhZc3LLMkvqvKqyWyELo63f3MwPN1DHsVrMYqWb");

#[program]
pub mod solana_twitter {

    use super::*;
    pub fn send_tweet(
        ctx: Context<SendTweet>,
        space_required: u32,
        topic: String,
        content: String,
    ) -> Result<()> {
        instructions::send_tweet::send_tweet(ctx, space_required, topic, content)
    }

    pub fn delete_tweet(ctx: Context<DeleteTweet>) -> Result<()> {
        instructions::delete_tweet::delete_tweet(ctx)
    }
}
