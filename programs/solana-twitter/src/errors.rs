//! ### Errors
//!
//! all possible errors which could occur during the
//! solana program execution
//!
//! **TopicTooLong** - if the provided topic is longer than anticipated value
//! **ContentTooLong** - if provided tweet content is longer than allowed length
//!
use anchor_lang::prelude::*;

/// ErroCode enum\
/// **TopicTooLong** - if the provided topic is longer than anticipated value\
/// **ContentTooLong** - if provided tweet content is longer than allowed length\
///
#[error_code]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong,
    #[msg("Account size is bigger than max allowed 10,000,000 bytes")]
    AccountSizeTooLarge,
}
