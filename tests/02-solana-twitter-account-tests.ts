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
  PublicKey,
} from "@solana/web3.js";
import { sha256 } from "js-sha256";

describe("#02 - solana-twitter account experiments", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  // max account size allowed is 10 MiB
  const MAX_ALLOWED_ACCOUNT_SIZE = 10 * 1024 * 1024;
  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  const connection = anchor.getProvider().connection;
  const localWallet = anchor.AnchorProvider.local().wallet;

  it("Transfer 50 SOL to another account", async () => {
    let toKeypair = Keypair.generate();
    let transaction = new Transaction();

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: localWallet.publicKey,
        toPubkey: toKeypair.publicKey,
        lamports: 50 * LAMPORTS_PER_SOL,
      })
    );

    transaction.feePayer = localWallet.publicKey;
    let blockHashInfo = await connection.getRecentBlockhash();

    let blockhash = await blockHashInfo.blockhash;
    transaction.recentBlockhash = blockhash;

    let signed_tx = await localWallet.signTransaction(transaction);
    console.log(new Date(), "sending transaction");
    let signature = await connection.sendRawTransaction(signed_tx.serialize());
    console.log(new Date(), "confirming transaction");
    let tx = await connection.confirmTransaction(signature);

    let account_info = await connection.getAccountInfo(toKeypair.publicKey);
    assert.equal(account_info.lamports, 50 * LAMPORTS_PER_SOL);
  });

  it("can create account of Size 10MiB from frontend without CPI", async () => {
    let toKeypair = Keypair.generate();
    let rent = await connection.getMinimumBalanceForRentExemption(
      MAX_ALLOWED_ACCOUNT_SIZE
    );
    console.log(
      "It will require ",
      rent,
      "lamports to create rent-exempt account"
    );

    let createTransaction = new Transaction();
    createTransaction.add(
      SystemProgram.createAccount({
        fromPubkey: localWallet.publicKey,
        newAccountPubkey: toKeypair.publicKey,
        lamports: rent,
        programId: program.programId,
        space: MAX_ALLOWED_ACCOUNT_SIZE,
      })
    );

    createTransaction.feePayer = localWallet.publicKey;
    let newBlockHashInfo = await connection.getRecentBlockhash();
    let newBlockhash = await newBlockHashInfo.blockhash;
    createTransaction.recentBlockhash = newBlockhash;

    let signedTx = await localWallet.signTransaction(createTransaction);

    let toKeypairSignature = nacl.sign.detached(
      signedTx.serializeMessage(),
      toKeypair.secretKey
    );

    signedTx.addSignature(toKeypair.publicKey, toKeypairSignature as Buffer);

    let isVerifiedSignature = signedTx.verifySignatures();
    console.log(`The signatures were verifed: ${isVerifiedSignature}`);

    let signature = await connection.sendRawTransaction(signedTx.serialize());
    const confirmOutput = await connection.confirmTransaction(signature);

    console.log(new Date(), confirmOutput);

    let account_info = await connection.getAccountInfo(toKeypair.publicKey);
    assert.equal(account_info.data.length, MAX_ALLOWED_ACCOUNT_SIZE);
  });

  it("can not create account of Size greater than 10MB from frontend without CPI", async () => {
    let toKeypair = Keypair.generate();
    let accountSize = MAX_ALLOWED_ACCOUNT_SIZE + 1;
    let rent = await connection.getMinimumBalanceForRentExemption(accountSize);
    console.log(
      "It will require ",
      rent,
      "lamports to create rent-exempt account"
    );

    let createTransaction = new Transaction();
    createTransaction.add(
      SystemProgram.createAccount({
        fromPubkey: localWallet.publicKey,
        newAccountPubkey: toKeypair.publicKey,
        lamports: rent,
        programId: program.programId,
        space: accountSize,
      })
    );

    createTransaction.feePayer = localWallet.publicKey;
    let newBlockHashInfo = await connection.getRecentBlockhash();
    let newBlockhash = await newBlockHashInfo.blockhash;
    createTransaction.recentBlockhash = newBlockhash;

    let signedTx = await localWallet.signTransaction(createTransaction);

    let toKeypairSignature = nacl.sign.detached(
      signedTx.serializeMessage(),
      toKeypair.secretKey
    );

    signedTx.addSignature(toKeypair.publicKey, toKeypairSignature as Buffer);

    let isVerifiedSignature = signedTx.verifySignatures();
    console.log(`The signatures were verifed: ${isVerifiedSignature}`);

    try {
      let signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature);
    } catch (error) {
      // error log should contain size restriction message
      assert.equal(
        true,
        error.logs.indexOf(
          "Allocate: requested 10485761, max allowed 10485760"
        ) > -1
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 281-character content."
    );
  });

  it("Get program accounts by Program ID", async () => {
    let accounts = await connection.getProgramAccounts(
      program.programId,
      "confirmed"
    );

    for (let index in accounts) {
      console.log(
        "account publickey: ",
        accounts[index].pubkey.toBase58(),
        "data length: ",
        accounts[index].account.data.length,
        "owner: ",
        accounts[index].account.owner.toBase58(),
        "balance: ",
        accounts[index].account.lamports / LAMPORTS_PER_SOL
      );
    }
  });

  // FIXME Check if this can be fixed (Good to have)
  xit("Can create and close accountwithSeed", async () => {
    // calculate rent
    let rent = await connection.getMinimumBalanceForRentExemption(
      MAX_ALLOWED_ACCOUNT_SIZE
    );

    // Derive the address (public key) of a greeting account from the program so that it's easy to find later.
    const TWEETING_SEED = "tweet";
    let tweetPubKey = await PublicKey.createWithSeed(
      localWallet.publicKey,
      TWEETING_SEED,
      program.programId
    );
    console.log("account address: ", tweetPubKey.toBase58());

    // create new transaction for creating account
    let createTransaction = new Transaction();
    // add create account instruction
    createTransaction.add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: localWallet.publicKey,
        basePubkey: localWallet.publicKey,
        newAccountPubkey: tweetPubKey,
        seed: TWEETING_SEED,
        lamports: rent,
        programId: program.programId,
        space: MAX_ALLOWED_ACCOUNT_SIZE,
      })
    );
    // set transaction fee payers
    createTransaction.feePayer = localWallet.publicKey;
    // set recent block hash
    let newBlockHashInfo = await connection.getRecentBlockhash();
    let newBlockhash = await newBlockHashInfo.blockhash;
    createTransaction.recentBlockhash = newBlockhash;

    // sign transaction
    let signedTx = await localWallet.signTransaction(createTransaction);

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
      localWallet.publicKey,
      "confirmed"
    );

    console.log(
      "Before: tweet_account balance: ",
      tweet_account.lamports / LAMPORTS_PER_SOL,
      "wallet balance: ",
      my_wallet.lamports / LAMPORTS_PER_SOL
    );
    assert.equal(tweet_account.data.length, MAX_ALLOWED_ACCOUNT_SIZE);

    const tx = await program.methods
      .deleteTweet()
      .accounts({
        account: tweetPubKey,
        author: localWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("tx info: ", tx);

    await new Promise((r) => setTimeout(r, 1000));

    tweet_account = await connection.getAccountInfo(tweetPubKey, "confirmed");
    my_wallet = await connection.getAccountInfo(
      localWallet.publicKey,
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
