use crate::constants::*;
use anchor_lang::prelude::*;

/// Tweet Account Storage
///
/// stores author, topic and content of tweet\
/// with the timestamp when it was created
#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

// 3. Add a constant on the Tweet account that provides its total size.
impl Tweet {
    /// Additional memory required as baggage
    pub const TWEET_BAGGAGE: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // Author.
        + TIMESTAMP_LENGTH; // Timestamp.
}
