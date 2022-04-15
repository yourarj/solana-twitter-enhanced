import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import * as nacl from "tweetnacl";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { sha256 } from "js-sha256";

describe("#01 - solana-twitter tweet tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  // max account size created is capped at 10240
  // because the account is being created in anchor by
  // a CPI call which has realloc limit 10240 bytes.
  const MAX_ALLOWED_ACCOUNT_SIZE_VIA_CPI = 10 * 1024;
  const TWEET_BAGGAGE_SIZE = 248;

  // TODO instead of sending MAX_ALLOWED_TWEET_BODY_SIZE will
  // calculate the tweet size dynamically and then
  // accordingly can send create account with specified
  // space
  // NOTE: we have to calculate required bytes after encoding
  // it string utf8 only.
  const MAX_ALLOWED_TWEET_BODY_SIZE =
    MAX_ALLOWED_ACCOUNT_SIZE_VIA_CPI - TWEET_BAGGAGE_SIZE;

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  const connection = new Connection(" http://localhost:8899");
  const tweetContent = "B".repeat(270);
  const localWallet = anchor.AnchorProvider.local().wallet;

  it("Can send a new tweet", async () => {
    const keypair = anchor.web3.Keypair.generate();
    const tx = await program.methods
      .sendTweet(MAX_ALLOWED_TWEET_BODY_SIZE, "Bharat", tweetContent)
      .accounts({
        tweet: keypair.publicKey,
        author: localWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();
    console.log("Your transaction signature", tx);

    //fetch account details of newly created tweet
    const tweetAccount = await program.account.tweet.fetch(keypair.publicKey);

    // Ensure it has the right data.
    assert.equal(
      tweetAccount.author.toBase58(),
      localWallet.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "Bharat");
    assert.equal(tweetAccount.content, tweetContent);
    assert.ok(tweetAccount.timestamp);
  });

  xit("Can send 100 tweets", async () => {
    for (let counter = 1; counter <= 100; counter++) {
      const keypair = anchor.web3.Keypair.generate();
      const tx = await program.methods
        .sendTweet(
          MAX_ALLOWED_TWEET_BODY_SIZE,
          "Bharat",
          "Bharat is VishwaGuru. You can't move it around!"
        )
        .accounts({
          tweet: keypair.publicKey,
          author: localWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();

      if (counter % 10 == 0) {
        console.log(new Date(), "Tweets sent: ", counter);
      }
    }
  });

  it("can send a new tweet without a topic", async () => {
    // Call the "SendTweet" instruction.
    const tweet = anchor.web3.Keypair.generate();
    await program.methods
      .sendTweet(MAX_ALLOWED_TWEET_BODY_SIZE, "", tweetContent)
      .accounts({
        tweet: tweet.publicKey,
        author: localWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tweet])
      .rpc();

    // Fetch the account details of the created tweet.
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(
      tweetAccount.author.toBase58(),
      localWallet.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "");
    assert.equal(tweetAccount.content, tweetContent);
    assert.ok(tweetAccount.timestamp);
  });

  it("can send a new tweet from a different author", async () => {
    // Generate another user and airdrop them some SOL.
    const otherUser = anchor.web3.Keypair.generate();

    const signature = await program.provider.connection.requestAirdrop(
      otherUser.publicKey,
      1000000000
    );
    await program.provider.connection.confirmTransaction(signature);

    // Call the "SendTweet" instruction on behalf of this other user.
    const tweet = anchor.web3.Keypair.generate();
    await program.methods
      .sendTweet(MAX_ALLOWED_TWEET_BODY_SIZE, "Bharat", tweetContent)
      .accounts({
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([otherUser, tweet])
      .rpc();

    // Fetch the account details of the created tweet.
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(
      tweetAccount.author.toBase58(),
      otherUser.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "Bharat");
    assert.equal(tweetAccount.content, tweetContent);
    assert.ok(tweetAccount.timestamp);
  });

  it("cannot provide a topic with more than 50 characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const topicWith51Chars = "B".repeat(51);
      await program.methods
        .sendTweet(
          MAX_ALLOWED_TWEET_BODY_SIZE,
          topicWith51Chars,
          "Bharat will always be great!!!!"
        )
        .accounts({
          tweet: tweet.publicKey,
          author: localWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc();

      //fetch account details of newly created tweet
      const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
      console.log(tweetAccount);
    } catch (error) {
      assert.equal(
        error.error.errorMessage,
        "The provided topic should be 50 characters long maximum."
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 51-character topic."
    );
  });

  it("cannot provide a content with more than 280 characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const contentWith281Chars = "B".repeat(281);
      await program.methods
        .sendTweet(MAX_ALLOWED_TWEET_BODY_SIZE, "veganism", contentWith281Chars)
        .accounts({
          tweet: tweet.publicKey,
          author: localWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc();
    } catch (error) {
      assert.equal(
        error.error.errorMessage,
        "The provided content should be 280 characters long maximum."
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 281-character content."
    );
  });

  it("cannot request account size more than with more than 280 characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const contentWith281Chars = "B".repeat(281);
      await program.methods
        .sendTweet(MAX_ALLOWED_TWEET_BODY_SIZE, "veganism", contentWith281Chars)
        .accounts({
          tweet: tweet.publicKey,
          author: localWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc();
    } catch (error) {
      assert.equal(
        error.error.errorMessage,
        "The provided content should be 280 characters long maximum."
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 281-character content."
    );
  });

  it("can fetch all tweets", async () => {
    console.log(new Date(), "Fetching all account with data");
    const tweetAccounts = await program.account.tweet.all();
    console.log(new Date(), "Fetching all account with data done!");
    assert.equal(tweetAccounts.length, 3);
  });

  it("can fetch all tweets without data", async () => {
    const TweetDescriminator = Buffer.from(
      sha256.digest("account:Tweet")
    ).slice(0, 8);
    console.log(
      new Date(),
      "Fetching account for ",
      program.programId.toBase58()
    );
    console.log(new Date(), "Fetching all account with no data");

    const tweetAccounts = await connection.getProgramAccounts(
      program.programId,
      {
        commitment: "confirmed",
        dataSlice: { offset: 0, length: 0 }, // Fetch without any data.
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(TweetDescriminator),
            },
          }, // Ensure it's a CandyMachine account.
        ],
      }
    );
    console.log(new Date(), "Fetching all account with no data done!");
    assert.equal(tweetAccounts.length, 3);
  });

  it("can filter tweets by author", async () => {
    const authorPublicKey = localWallet.publicKey;
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8, // Discriminator.
          bytes: authorPublicKey.toBase58(),
        },
      },
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(
      tweetAccounts.every((tweetAccount) => {
        return (
          tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
        );
      })
    );
  });

  it("can filter tweets by topics", async () => {
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset:
            8 + // Discriminator.
            32 + // Author public key.
            8 + // Timestamp.
            4, // Topic string prefix.
          bytes: bs58.encode(Buffer.from("Bharat")),
        },
      },
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(
      tweetAccounts.every((tweetAccount) => {
        return tweetAccount.account.topic === "Bharat";
      })
    );
  });
});
