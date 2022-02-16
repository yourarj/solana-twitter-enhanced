import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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
import { min } from "bn.js";
import { token } from "@project-serum/anchor/dist/cjs/utils";

describe("#03 - solana-twitter token experiments", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  const connection = new Connection(" http://localhost:8899");

  it("cannot check n transfer with uninitialized token account", async () => {
    let mint = anchor.web3.Keypair.generate();
    await createNewToken(program, mint, connection);

    let assocTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      program.provider.wallet.publicKey
    );

    try {
      const tx = await program.rpc.checkNTransferBalance({
        accounts: {
          account: mint.publicKey,
          tokenAccount: assocTokenAddress,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
      console.log("tx info: ", tx);
    } catch (error) {
      assert.equal(3012, error.code);
      assert.equal(
        "The program expected this account to be already initialized",
        error.msg
      );
      return;
    }
    assert.fail(
      "The instruction should have failed with 'account to be already initialized' error"
    );
  });

  it("cannot execute tx if signer doesn't have 1000 tokens", async () => {
    let mint = anchor.web3.Keypair.generate();
    await createNewToken(program, mint, connection);

    let assocTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      program.provider.wallet.publicKey
    );

    let createTokenAccTx = new Transaction().add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        assocTokenAddress, // ata

        program.provider.wallet.publicKey, // owner of token account
        program.provider.wallet.publicKey // fee payer
      )
    );

    // set transaction fee payers
    createTokenAccTx.feePayer = program.provider.wallet.publicKey;
    // set recent block hash
    let blockHashInfoForToken = await connection.getRecentBlockhash();
    let blockHashForToken = await blockHashInfoForToken.blockhash;
    createTokenAccTx.recentBlockhash = blockHashForToken;

    let signedCreateTokAccTx = await program.provider.wallet.signTransaction(
      createTokenAccTx
    );

    let createTokenAccSig = await connection.sendRawTransaction(
      signedCreateTokAccTx.serialize()
    );
    await connection.confirmTransaction(createTokenAccSig);

    try {
      const tx = await program.rpc.checkNTransferBalance({
        accounts: {
          account: mint.publicKey,
          tokenAccount: assocTokenAddress,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
      console.log("tx info: ", tx);
    } catch (error) {
      assert.equal(6003, error.code);
      assert.equal(
        "Account doesn't meet expected token balance requirement",
        error.msg
      );
      return;
    }
  });

  it("cannot execute tx if signer is not owner of token account", async () => {
    let otheruser = anchor.web3.Keypair.generate();
    let mint = anchor.web3.Keypair.generate();
    await createNewToken(program, mint, connection);

    let assocTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      otheruser.publicKey
    );

    let createTokenAccTx = new Transaction().add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        assocTokenAddress, // ata

        otheruser.publicKey, // owner of token account
        program.provider.wallet.publicKey // fee payer
      )
    );

    // set transaction fee payers
    createTokenAccTx.feePayer = program.provider.wallet.publicKey;
    // set recent block hash
    let blockHashInfoForToken = await connection.getRecentBlockhash();
    let blockHashForToken = await blockHashInfoForToken.blockhash;
    createTokenAccTx.recentBlockhash = blockHashForToken;

    let signedCreateTokAccTx = await program.provider.wallet.signTransaction(
      createTokenAccTx
    );

    let createTokenAccSig = await connection.sendRawTransaction(
      signedCreateTokAccTx.serialize()
    );
    await connection.confirmTransaction(createTokenAccSig);

    try {
      const tx = await program.rpc.checkNTransferBalance({
        accounts: {
          account: mint.publicKey,
          tokenAccount: assocTokenAddress,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
      console.log("tx info: ", tx);
    } catch (error) {
      assert.equal(6004, error.code);
      assert.equal(
        "Transaction signer is not owner of given tokens",
        error.msg
      );
      return;
    }
  });

  it("can execute tx if signer is owner of token account & has more than 1000 tokens", async () => {
    let mint = anchor.web3.Keypair.generate();
    await createNewToken(program, mint, connection);

    // get associated token account address for wallet owner
    console.log(
      `getting associated token account for ${program.provider.wallet.publicKey}`
    );
    let assocTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      program.provider.wallet.publicKey
    );
    console.log("assoc token account: ", assocTokenAddress.toBase58());

    console.log("creating token account", assocTokenAddress.toBase58());
    let createTokenAccTx = new Transaction().add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        assocTokenAddress, // ata

        program.provider.wallet.publicKey, // owner of token account
        program.provider.wallet.publicKey // fee payer
      )
    );

    // set transaction fee payers
    createTokenAccTx.feePayer = program.provider.wallet.publicKey;
    // set recent block hash
    let blockHashInfoForToken = await connection.getRecentBlockhash();
    let blockHashForToken = await blockHashInfoForToken.blockhash;
    createTokenAccTx.recentBlockhash = blockHashForToken;

    let signedCreateTokAccTx = await program.provider.wallet.signTransaction(
      createTokenAccTx
    );

    let createTokenAccSig = await connection.sendRawTransaction(
      signedCreateTokAccTx.serialize()
    );
    await connection.confirmTransaction(createTokenAccSig);

    console.log("minting new tokens");
    let mintTx = new Transaction().add(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        assocTokenAddress, // receiver (sholud be a token account)
        program.provider.wallet.publicKey, // mint authority
        [], // only multisig account will use. leave it empty now.
        1000e8 // amount. if your decimals is 8, you mint 10^8 for 1 token.
      )
    );

    // set transaction fee payers
    mintTx.feePayer = program.provider.wallet.publicKey;
    // set recent block hash
    let hashInfoForTokenMint = await connection.getRecentBlockhash();
    let hashForTokenMint = await hashInfoForTokenMint.blockhash;
    mintTx.recentBlockhash = hashForTokenMint;

    let signedTokenMintTx = await program.provider.wallet.signTransaction(
      mintTx
    );

    let tokenMintTxSig = await connection.sendRawTransaction(
      signedTokenMintTx.serialize()
    );
    await connection.confirmTransaction(tokenMintTxSig);

    console.log("sending check n transfer ix");
    const tx = await program.rpc.checkNTransferBalance({
      accounts: {
        account: mint.publicKey,
        tokenAccount: assocTokenAddress,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    console.log("tx info: ", tx);
  });
});

/**
 * Create new token
 * @param program program object
 * @param mint mintKeypair
 * @param connection connection object
 */
async function createNewToken(
  program: anchor.Program<SolanaTwitter>,
  mint: anchor.web3.Keypair,
  connection: anchor.web3.Connection
) {
  let createTokenTx = new Transaction().add(
    // create mint account
    SystemProgram.createAccount({
      fromPubkey: program.provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports: await Token.getMinBalanceRentForExemptMint(connection),
      programId: TOKEN_PROGRAM_ID,
    }),
    // init mint account
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      16,
      program.provider.wallet.publicKey,
      program.provider.wallet.publicKey // freeze authority (if you don't need it, you can set `null`)
    )
  );

  // set transaction fee payers
  createTokenTx.feePayer = program.provider.wallet.publicKey;
  // set recent block hash
  let blockHashInfoForToken = await connection.getRecentBlockhash();
  let blockHashForToken = await blockHashInfoForToken.blockhash;
  createTokenTx.recentBlockhash = blockHashForToken;

  let mintKeypairSignature = nacl.sign.detached(
    createTokenTx.serializeMessage(),
    mint.secretKey
  );

  createTokenTx.addSignature(mint.publicKey, mintKeypairSignature as Buffer);

  // sign transaction
  let createTokenSignedTx = await program.provider.wallet.signTransaction(
    createTokenTx
  );

  // verify signature
  let areSignatureValidForCreateTokenTx =
    createTokenSignedTx.verifySignatures();
  console.log(
    `The signatures for create New Token were verifed: ${areSignatureValidForCreateTokenTx}`
  );

  // send transaction
  let createTokenSig = await connection.sendRawTransaction(
    createTokenSignedTx.serialize()
  );
  await connection.confirmTransaction(createTokenSig);

  console.log(
    `New token ${mint.publicKey} created successfully via ${createTokenSig}`
  );
}
