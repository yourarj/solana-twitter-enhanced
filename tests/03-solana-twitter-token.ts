import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import { MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import * as nacl from "tweetnacl";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { sha256 } from "js-sha256";

describe("#03 - solana-twitter token experiments", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  // max account size allowed is 10 MiB
  const MAX_ALLOWED_ACCOUNT_SIZE = 10 * 1024 * 1024;
  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  const connection = new Connection(" http://localhost:8899");

  it("Get token account balance", async () => {
    let mint = anchor.web3.Keypair.generate();

    let tx = new Transaction().add(
      // create mint account
      SystemProgram.createAccount({
        fromPubkey: program..publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports: await Token.getMinBalanceRentForExemptMint(connection),
        programId: TOKEN_PROGRAM_ID,
      }),
      // init mint account
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint pubkey
        8, // decimals
        alice.publicKey, // mint authority
        alice.publicKey // freeze authority (if you don't need it, you can set `null`)
      )
    );

    // calculate rent
    let rent = await connection.getMinimumBalanceForRentExemption(
      MAX_ALLOWED_ACCOUNT_SIZE
    );

    // Derive the address (public key) of a greeting account from the program so that it's easy to find later.
    const TWEETING_SEED = "tweet";
    let tweetPubKey = await PublicKey.createWithSeed(
      program.provider.wallet.publicKey,
      TWEETING_SEED,
      program.programId
    );
    console.log("account address: ", tweetPubKey.toBase58());

    // create new transaction for creating account
    let createTransaction = new Transaction();

    // add create account instruction
    createTransaction.add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: program.provider.wallet.publicKey,
        basePubkey: program.provider.wallet.publicKey,
        newAccountPubkey: tweetPubKey,
        seed: TWEETING_SEED,
        lamports: rent,
        programId: program.programId,
        space: MAX_ALLOWED_ACCOUNT_SIZE,
      })
    );
    // set transaction fee payers
    createTransaction.feePayer = program.provider.wallet.publicKey;
    // set recent block hash
    let newBlockHashInfo = await connection.getRecentBlockhash();
    let newBlockhash = await newBlockHashInfo.blockhash;
    createTransaction.recentBlockhash = newBlockhash;

    // sign transaction
    let signedTx = await program.provider.wallet.signTransaction(
      createTransaction
    );

    // verify signature
    let isVerifiedSignature = signedTx.verifySignatures();
    console.log(`The signatures were verifed: ${isVerifiedSignature}`);

    // send transaction
    let signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature);

    let tweet_account = await connection.getAccountInfo(
      tweetPubKey,
      "confirmed"
    );
    let my_wallet = await connection.getAccountInfo(
      program.provider.wallet.publicKey,
      "confirmed"
    );

    console.log(
      "Before: tweet_account balance: ",
      tweet_account.lamports / LAMPORTS_PER_SOL,
      "wallet balance: ",
      my_wallet.lamports / LAMPORTS_PER_SOL
    );
    assert.equal(tweet_account.data.length, MAX_ALLOWED_ACCOUNT_SIZE);

    const tx = await program.rpc.deleteTweet({
      accounts: {
        account: tweetPubKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    console.log("tx info: ", tx);

    await new Promise((r) => setTimeout(r, 1000));

    tweet_account = await connection.getAccountInfo(tweetPubKey, "confirmed");
    my_wallet = await connection.getAccountInfo(
      program.provider.wallet.publicKey,
      "confirmed"
    );

    // make sure account has been deleted
    console.log(
      "After: my wallet balance: ",
      my_wallet.lamports / LAMPORTS_PER_SOL
    );

    assert.equal(tweet_account, null);
  });
});
