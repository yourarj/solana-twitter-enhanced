use crate::constants::*;
use anchor_lang::prelude::*;

// 1. Define the structure of the Tweet account.
#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

// 3. Add a constant on the Tweet account that provides its total size.
impl Tweet {
    pub const TWEET_BAGGAGE: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // Author.
        + TIMESTAMP_LENGTH; // Timestamp.
}
