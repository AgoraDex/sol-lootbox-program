import {
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import {ADMIN} from "../secrets";
import {Initialize, serializeInitialize} from "../instruction";
import {findStateAddress, loadState, VAULT_SEED} from "../state";

export async function init(connection: Connection, programId: PublicKey, lootboxId: number, signer: Buffer, paymentToken1: PublicKey, paymentToken2: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);

    console.info(`Vault: ${vaultPda}`);
    console.info(`State: ${statePda}`);
    console.info(`Signer: ${signer.toString("hex")} (${signer.length})`);

    let now = new Date();
    let later = new Date();
    later.setFullYear(2026);

    let init = new Initialize(
        lootboxId,
        vaultBump,
        stateBump,
        2000,
        Math.floor(now.getTime() / 1000),
        Math.floor(later.getTime() / 1000),
        new Uint8Array(signer),
        "Solana Lootbox v2",
        [5_000_000, 20_000_000],
        ""
    );

    // let str = Array.from(serializeInstruction(init)).map(value => value.toString(16).padStart(2, "0")).toString()
    // console.log("Ser: " + str);

    let paymentAta1 = await spl.getAssociatedTokenAddress(paymentToken1, vaultPda, true);
    let paymentAtaAccount1 = await connection.getAccountInfo(paymentAta1);
    if (paymentAtaAccount1 == null) {
        tx.add(
            spl.createAssociatedTokenAccountInstruction(
                ADMIN.publicKey,
                paymentAta1,
                vaultPda,
                paymentToken1
            )
        );
    }

    let paymentAta2 = await spl.getAssociatedTokenAddress(paymentToken2, vaultPda, true);
    let paymentAtaAccount2 = await connection.getAccountInfo(paymentAta2);
    if (paymentAtaAccount2 == null) {
        tx.add(
            spl.createAssociatedTokenAccountInstruction(
                ADMIN.publicKey,
                paymentAta2,
                vaultPda,
                paymentToken2
            )
        );
    }

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: ADMIN.publicKey, isWritable: false, isSigner: true},
                {pubkey: vaultPda, isWritable: true, isSigner: false},
                {pubkey: statePda, isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: paymentAta1, isWritable: false, isSigner: false},
                {pubkey: paymentAta2, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeInitialize(init)),
        })
    );

    tx.sign(ADMIN);
    let hash = await sendAndConfirmTransaction(connection, tx, [ADMIN]);
    console.log(`tx hash: ${hash}`);

    let data = await connection.getParsedAccountInfo(statePda);
    if (data.value == null) {
        throw new Error(`there is no account ${statePda}`);
    }
    let state = loadState(data.value);
    console.info("State: " + JSON.stringify(state, null, "  "));
    // console.info("Data: " + toHex(data.value.data))
}
