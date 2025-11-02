import {
    Connection, Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import {Initialize, serializeInitialize} from "../instruction";
import {findStateAddress, loadState, VAULT_SEED} from "../state";

export async function init(connection: Connection, admin: Keypair, programId: PublicKey, lootboxId: number, signer: Buffer, paymentToken1: PublicKey, paymentToken2: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([admin.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = findStateAddress(admin.publicKey, lootboxId, programId);

    console.info(`Admin: ${admin.publicKey}`);
    console.info(`Vault: ${vaultPda}`);
    console.info(`State: ${statePda}`);
    console.info(`Signer: ${signer.toString("hex")} (${signer.length})`);

    let init = new Initialize(
        lootboxId,
        vaultBump,
        stateBump,
        120000,
        new Date('2025-10-30 00:00:00Z').getTime() / 1000,
        new Date('2026-09-04 16:00:00Z').getTime() / 1000,
        new Uint8Array(signer),
        "Infinity Solana",
        [1000000],
        0,
        0
    );

    // let init = new Initialize(
    //     lootboxId,
    //     vaultBump,
    //     stateBump,
    //     125000,
    //     1756918687,
    //     1788454695,
    //     new Uint8Array(signer),
    //     "Solana Lootbox v2 Infinity",
    //     [1_000_000, 4_000_000_000],
    //     60,
    //     2821
    // );

    // let str = Array.from(serializeInstruction(init)).map(value => value.toString(16).padStart(2, "0")).toString()
    // console.log("Ser: " + str);

    let paymentAta1 = await spl.getAssociatedTokenAddress(paymentToken1, vaultPda, true);
    console.info(`Price ATA 1: ${paymentAta1}`);
    let paymentAtaAccount1 = await connection.getAccountInfo(paymentAta1);
    if (paymentAtaAccount1 == null) {
        tx.add(
            spl.createAssociatedTokenAccountInstruction(
                admin.publicKey,
                paymentAta1,
                vaultPda,
                paymentToken1
            )
        );
    }

    // let paymentAta2 = await spl.getAssociatedTokenAddress(paymentToken2, vaultPda, true);
    // console.info(`Price ATA 2: ${paymentAta2}`);
    // let paymentAtaAccount2 = await connection.getAccountInfo(paymentAta2);
    // if (paymentAtaAccount2 == null) {
    //     tx.add(
    //         spl.createAssociatedTokenAccountInstruction(
    //             admin.publicKey,
    //             paymentAta2,
    //             vaultPda,
    //             paymentToken2
    //         )
    //     );
    // }

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: admin.publicKey, isWritable: false, isSigner: true},
                {pubkey: vaultPda, isWritable: true, isSigner: false},
                {pubkey: statePda, isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: paymentAta1, isWritable: false, isSigner: false},
                // {pubkey: paymentAta2, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeInitialize(init)),
        })
    );

    tx.sign(admin);
    let hash = await sendAndConfirmTransaction(connection, tx, [admin], {commitment: "confirmed"});
    console.log(`tx hash: ${hash}`);

    let data = await connection.getParsedAccountInfo(statePda);
    if (data.value == null) {
        throw new Error(`there is no account ${statePda}`);
    }
    let state = loadState(data.value);
    console.info("State: " + state.toJson());
    // console.info("Data: " + toHex(data.value.data))
}
