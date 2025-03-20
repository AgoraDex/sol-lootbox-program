import {
    AccountInfo,
    Connection, Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {loadState} from "../state";
import {Buy, serializeBuy} from "../instruction";
import * as spl from "@solana/spl-token";
import * as umiBundle from "@metaplex-foundation/umi-bundle-defaults";
import {keypairIdentity} from "@metaplex-foundation/umi";
import {fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey} from "@metaplex-foundation/umi-web3js-adapters";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {createToken} from "./create-token";
import {getOrCreateAssociatedTokenAccount} from "@solana/spl-token";
import {getAssociatedTokenAddressSync} from "@solana/spl-token/src/state/mint";
import type {Account} from "@solana/spl-token/src/state/account";
import {getAccount} from "@solana/spl-token/src/state/account";
import {TokenAccountNotFoundError, TokenInvalidAccountOwnerError} from "@solana/spl-token/src/errors";
import {createAssociatedTokenAccountInstruction} from "@solana/spl-token/src/instructions/associatedTokenAccount";
import {createApproveInstruction} from "@solana/spl-token/src/instructions/approve";

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

const SYSVAR_INSTRUCTIONS_PUBKEY = new PublicKey(
    'Sysvar1nstructions1111111111111111111111111',
);

export async function buy(connection: Connection, programId: PublicKey, tokenMint: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    const balanceForRentExemption = await connection.getMinimumBalanceForRentExemption(0);
    let tx = new Transaction(blockhashInfo);
    let vaultPda = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from("vault")], programId);
    console.info(`Vault: ${vaultPda[0]}`);
    let statePda = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from("state")], programId);
    console.info(`State: ${statePda[0]}`);

    let accountInfo = await connection.getParsedAccountInfo(statePda[0]);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda[0]}`);
    }
    let state = loadState(accountInfo.value);

    let payerAtaPub = getAssociatedTokenAddressSync(tokenMint, PAYER.publicKey);
    let payerAtaAccount=  await connection.getAccountInfo(payerAtaPub);
    if (payerAtaAccount == null) {
        tx.add(createAssociatedTokenAccountInstruction(
            PAYER.publicKey,
            payerAtaPub,
            PAYER.publicKey,
            tokenMint,
        ));
    }

    let amount = state.price * 3;

    tx.add(createApproveInstruction(
        payerAtaPub,
        PAYER.publicKey,
        PAYER.publicKey,
        amount
    ));

    let tokenId = Keypair.generate();
    const rentExemptMintLamports = await spl.getMinimumBalanceForRentExemptMint(connection);

    tx.add(
        // create token account
        SystemProgram.createAccount({
            fromPubkey: PAYER.publicKey,
            newAccountPubkey: tokenId.publicKey,
            space: spl.MINT_SIZE,
            lamports: rentExemptMintLamports,
            programId: spl.TOKEN_PROGRAM_ID,
        }),

        // initialize token account
        spl.createInitializeMintInstruction(
            tokenId.publicKey,
            0,
            vaultPda[0],
            vaultPda[0],
            spl.TOKEN_PROGRAM_ID
        ),
    )

    let destinationAta = spl.getAssociatedTokenAddressSync(tokenId.publicKey, PAYER.publicKey);
    tx.add(
        // create destination account (ATA)
        spl.createAssociatedTokenAccountInstruction(
            PAYER.publicKey,
            destinationAta,
            PAYER.publicKey,
            tokenId.publicKey
        )
    );

    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(PAYER)));

    let tokenMetadataPda = mpl.findMetadataPda(umiContext, {mint: fromWeb3JsPublicKey(tokenId.publicKey)});
    let tokenMasterPda = mpl.findMasterEditionPda(umiContext, {mint: fromWeb3JsPublicKey(tokenId.publicKey)});
    let mplId = toWeb3JsPublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);

    let buy = new Buy;

    tx.add(new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
                {pubkey: vaultPda[0], isWritable: true, isSigner: false},
                {pubkey: statePda[0], isWritable: true, isSigner: false},
                {pubkey: invoice_pub, isWritable: true, isSigner: false},
                {pubkey: destinationAta, isWritable: true, isSigner: false},
                {pubkey: tokenId.publicKey, isWritable: true, isSigner: true},
                {pubkey: toWeb3JsPublicKey(tokenMetadataPda["0"]), isWritable: true, isSigner: false},
                {pubkey: toWeb3JsPublicKey(tokenMasterPda["0"]), isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isWritable: false, isSigner: false},
                {pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                {pubkey: mplId, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeBuy(buy)),
        }
    ));

    let hash = await sendAndConfirmTransaction(connection, tx, [PAYER, tokenId]);
    console.log("tx hash: " + hash);

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda[0]);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda[0]}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`total supply was ${state.total_supply}, but now is ${changedState.total_supply}`);
}