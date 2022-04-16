//! Twitter 🐤 alternative built on top on
//! of solana blockchain
//!
//! This project aims at mitigation of problems
//! revolving around microbloging giant
//! giving back control to users
//! where users can freely open up and share
//! whatever they want without the fear of sensorship
//!
//! @author: Arjun.
//! contact: twitter.com/yourarj

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::delete_tweet::*;
use instructions::send_tweet::*;

declare_id!("DheWr3dFgW3D2y6RL1CaWxG33Hnp9kvpoJXEedseVpLu");

/// ## program module
///
/// contains all extrinsic method to interact with smart contract
#[program]
pub mod solana_twitter {

    use super::*;

    /// ## Send tweet
    ///
    /// Send the tweet method
    ///
    /// - space_required - space intended to be occupied
    /// - topic - topic of the tweet
    /// - content - tweet body
    ///
    pub fn send_tweet(
        ctx: Context<SendTweet>,
        space_required: u32,
        topic: String,
        content: String,
    ) -> Result<()> {
        instructions::send_tweet::send_tweet(ctx, space_required, topic, content)
    }

    /// ### Delete Tweet
    ///
    /// Delete the tweet specified by the account in request
    pub fn delete_tweet(ctx: Context<DeleteTweet>) -> Result<()> {
        instructions::delete_tweet::delete_tweet(ctx)
    }
}
