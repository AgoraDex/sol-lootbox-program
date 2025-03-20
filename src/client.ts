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
    SYSVAR_INSTRUCTIONS_PUBKEY, ParsedAccountData, CreateAccountParams
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
import {newAdmin} from "./commands/new-admin";
import {ADMIN, PAYER} from "./secrets";
import {consoleCmd} from "./commands/console";
import {init} from "./commands/init";
import {buy} from "./commands/buy";
import {createToken} from "./commands/create-token";

const programId = new PublicKey("HDcKzEZqr13G1rbC24pCN1CKSxKjf7JknC5a8ytX5hoN");
const usdcMint = new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF");
// my NFT token
// const tokenId = new PublicKey("GM1PUUg1Q8cvG8sfW53aKf5PA2kmxoPEGd28VQueiZTH");

// let mint = Keypair.fromSecretKey(Uint8Array.from(secrets.minter_key));
// console.log("Mint: " + mint);

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function main1() {
    const blockhashInfo = await connection.getLatestBlockhash();

    let tx = new Transaction(blockhashInfo);
    let tokenId = Keypair.generate();

    console.info("Token Id: " + tokenId.publicKey);

    const rentExemptMintLamports = await spl.getMinimumBalanceForRentExemptMint(connection);

    let invoicePda = PublicKey.findProgramAddressSync([Buffer.from("invoice_seed"), PAYER.publicKey.toBuffer()], programId)
    console.info("Invoice PDA: " + invoicePda[0] + ", bump: " + invoicePda[1]);

    let authorityPda = PublicKey.findProgramAddressSync([Buffer.from("mint_authority_seed")], programId);
    console.info("authority PDA: " + authorityPda[0] + ", bump: " + authorityPda[1]);

    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(PAYER)));

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
            authorityPda[0],
            authorityPda[0],
            spl.TOKEN_PROGRAM_ID
        ),
    )

    let destinationAta = spl.getAssociatedTokenAddressSync(tokenId.publicKey, PAYER.publicKey);
    tx.add(
        // create destination account
        spl.createAssociatedTokenAccountInstruction(
            PAYER.publicKey,
            destinationAta,
            PAYER.publicKey,
            tokenId.publicKey
        )
    );

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
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

    tx.sign(PAYER);

    let hash = await sendAndConfirmTransaction(connection, tx, [PAYER, tokenId]);
    console.log("tx hash: " + hash);
    // console.log("Dry run");
}

async function main (argv: string[]) {
    if (argv.length != 3) {
        throw new Error("Expected at least one argument.");
    }
    switch (argv[2].toLowerCase()) {
        case "buy":
            await buy(connection, programId, usdcMint);
            break;
        case "init":
            await init(connection, programId);
            break;
        case "new-admin":
            await newAdmin(connection);
            break;
        case "withdraw":
            break;
        case "console":
            await consoleCmd(connection);
            break;
        case "create-token":
            await createToken(connection)
            break;
        default:
            console.log("Usage: ts-node client.js <buy|init|withdraw|new-admin>");
    }
}

(async () => {
    try {
        await main(process.argv);
    } catch (e) {
        console.error(e);
    }
})();