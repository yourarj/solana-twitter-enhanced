//! Constants used in program
//!
//! Constants used in the solana program

/// size of character after serialization
pub const _CHAR_SIZE: usize = 4;

/// account discriminator lenth
pub const DISCRIMINATOR_LENGTH: usize = 8;

/// size in bytes occupied by public key when serialized
pub const PUBLIC_KEY_LENGTH: usize = 32;

/// size occupied by timestamp field
pub const TIMESTAMP_LENGTH: usize = 8;

/// string prefix length
pub const _STRING_LENGTH_PREFIX: usize = 4; // Stores the size of the string.

/// max allowed size of topic
pub const MAX_TOPIC_LENGTH: usize = 50; // 50 chars max.

/// max allowed content size
pub const MAX_CONTENT_LENGTH: usize = 280; // 280 chars max.
