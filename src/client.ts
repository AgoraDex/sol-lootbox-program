import {
    AccountMeta,
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    SYSVAR_INSTRUCTIONS_PUBKEY, ParsedAccountData
} from "@solana/web3.js";
import * as spl from '@solana/spl-token';
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
    fromWeb3JsKeypair,
    fromWeb3JsPublicKey,
    toWeb3JsPublicKey
} from "@metaplex-foundation/umi-web3js-adapters";
import * as umiBundle from '@metaplex-foundation/umi-bundle-defaults';
import {keypairIdentity} from "@metaplex-foundation/umi";
import {Initialize, serializeInstruction} from "./instruction";

// import * as fs from 'fs';
const secrets = require('../.secrets.json');
// import secrets from '../.secrets.json' assert {type: "json"};

const programId = new PublicKey("HDcKzEZqr13G1rbC24pCN1CKSxKjf7JknC5a8ytX5hoN");
// my NFT token
// const tokenId = new PublicKey("GM1PUUg1Q8cvG8sfW53aKf5PA2kmxoPEGd28VQueiZTH");

let payer = Keypair.fromSecretKey(Uint8Array.from(secrets.payer_key));
console.info("Payer: " + payer.publicKey);
let receiver = Keypair.fromSecretKey(Uint8Array.from(secrets.receiver_key));
console.info("Receiver: " + receiver.publicKey);
// let mint = Keypair.fromSecretKey(Uint8Array.from(secrets.minter_key));
// console.log("Mint: " + mint);

function toHex(key: Buffer | PublicKey | ParsedAccountData | undefined) {
    if (key == undefined) {
        return "undefined";
    }
    let buf;
    if (key instanceof Buffer) {
        buf = key;
    }
    else if (key instanceof PublicKey) {
        buf = key.toBuffer();
    }
    else {
        return key.parsed.toString();
    }
    return Array.from(buf).map(value => value.toString(16).padStart(2, "0")).toString()
}

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
async function main() {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let vault_pda = PublicKey.findProgramAddressSync([payer.publicKey.toBytes(), Buffer.from("vault")], programId)
    let state_pda = PublicKey.findProgramAddressSync([payer.publicKey.toBytes(), Buffer.from("state")], programId)

    console.info("Vault: " + toHex(vault_pda[0]));
    console.info("State: " + toHex(state_pda[0]));

    let init = new Initialize(
        vault_pda[1],
        state_pda[1],
        100,
        payer.publicKey.toBytes(),
        "DLS 0.1"
    );

    // let str = Array.from(serializeInstruction(init)).map(value => value.toString(16).padStart(2, "0")).toString()
    // console.log("Ser: " + str);

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: payer.publicKey, isWritable: false, isSigner: true},
                {pubkey: vault_pda[0], isWritable: true, isSigner: false},
                {pubkey: state_pda[0], isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeInstruction(init)),
        })
    );

    // tx.sign(payer);
    // let hash = await sendAndConfirmTransaction(connection, tx, [payer]);
    // console.log("tx hash: " + hash);

    let data = await connection.getParsedAccountInfo(state_pda[0]);
    console.info("Data: " + toHex(data.value?.data))
}

async function main2() {
    const blockhashInfo = await connection.getLatestBlockhash();

    let tx = new Transaction(blockhashInfo);
    let tokenId = Keypair.generate();

    console.info("Token Id: " + tokenId.publicKey);

    const rentExemptMintLamports = await spl.getMinimumBalanceForRentExemptMint(connection);

    let invoicePda = PublicKey.findProgramAddressSync([Buffer.from("invoice_seed"), payer.publicKey.toBuffer()], programId)
    console.info("Invoice PDA: " + invoicePda[0] + ", bump: " + invoicePda[1]);

    let authorityPda = PublicKey.findProgramAddressSync([Buffer.from("mint_authority_seed")], programId);
    console.info("authority PDA: " + authorityPda[0] + ", bump: " + authorityPda[1]);

    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(payer)));

    let tokenMetadataPda = mpl.findMetadataPda(umiContext, {mint: fromWeb3JsPublicKey(tokenId.publicKey)});
    let tokenMasterPda = mpl.findMasterEditionPda(umiContext, {mint: fromWeb3JsPublicKey(tokenId.publicKey)});
    let mplId = toWeb3JsPublicKey(mpl.getMplTokenMetadataProgramId(umiContext));

    // let umiMint = umi.createSignerFromKeypair(umiContext, fromWeb3JsKeypair(tokenId));
    //
    // let umiInstructions = mpl.createV1(umiContext, {
    //     mint: umiMint,
    //     name: "DLS 1",
    //     tokenStandard: TokenStandard.NonFungible,
    //     uri: 'https://lootbox.agorahub.io/solana/dls1/' + tokenId.publicKey.toString(),
    //     sellerFeeBasisPoints: umi.percentAmount(6),
    // }).getInstructions();
    //
    // console.info(umiInstructions[0].keys);

    // inst.map(toWeb3JsInstruction)
    //     .forEach(value => value.keys.forEach(console.info));
    // let mintAuthority = PublicKey.findProgramAddressSync(
    //     [Buffer.from("mint_authority_seed")],
    //     programId
    // );

    // tx.add(SystemProgram.transfer(
    //     {
    //         programId: SystemProgram.programId,
    //         lamports:
    //     }
    // ))

    // create token
    tx.add(
        // create token account
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: tokenId.publicKey,
            space: spl.MINT_SIZE,
            lamports: rentExemptMintLamports,
            programId: spl.TOKEN_PROGRAM_ID,
        }),
        // initialize token account
        spl.createInitializeMintInstruction(
            tokenId.publicKey,
            0,
            authorityPda[0],
            authorityPda[0],
            spl.TOKEN_PROGRAM_ID
        ),
    )

    let destinationAta = spl.getAssociatedTokenAddressSync(tokenId.publicKey, payer.publicKey);
    tx.add(
        // create destination account
        spl.createAssociatedTokenAccountInstruction(
            payer.publicKey,
            destinationAta,
            payer.publicKey,
            tokenId.publicKey
        )
    );

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: payer.publicKey, isWritable: false, isSigner: true},
                {pubkey: tokenId.publicKey, isWritable: true, isSigner: false},
                {pubkey: authorityPda[0], isWritable: true, isSigner: false},
                {pubkey: destinationAta, isWritable: true, isSigner: false},
                {pubkey: toWeb3JsPublicKey(tokenMetadataPda["0"]), isWritable: true, isSigner: false},
                {pubkey: toWeb3JsPublicKey(tokenMasterPda["0"]), isWritable: true, isSigner: false},
                {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: mplId, isWritable: false, isSigner: false},
                {pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isWritable: false, isSigner: false},
            ],
            data: Buffer.from([authorityPda[1]]),
        })
    );

    tx.sign(payer);

    let hash = await sendAndConfirmTransaction(connection, tx, [payer, tokenId]);
    console.log("tx hash: " + hash);
    // console.log("Dry run");
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
    }
})();