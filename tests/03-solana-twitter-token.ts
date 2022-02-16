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
import { min } from "bn.js";

describe("#03 - solana-twitter token experiments", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  const connection = new Connection(" http://localhost:8899");

  it("create new token", async () => {
    let mint = anchor.web3.Keypair.generate();

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
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint pubkey
        16, // decimals
        program.provider.wallet.publicKey, // mint authority
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

    console.log(`New token ${mint.publicKey} created successfully`);
  });
});
