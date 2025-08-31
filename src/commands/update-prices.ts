import {
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN} from "../secrets";
import {serializeUpdateState, UpdateState} from "../instruction";
import {findStateAddress, loadState, VAULT_SEED} from "../state";
import * as spl from "@solana/spl-token";

export async function updatePrices(connection: Connection, programId: PublicKey, lootboxId: number, paymentToken1: PublicKey, paymentToken2: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);

    {
        let data = await connection.getParsedAccountInfo(statePda);
        if (data.value == null) {
            throw new Error(`there is no account ${statePda}`);
        }
        let buffer : Buffer = <Buffer>data.value.data;
        console.info(`State: ${statePda}, size ${buffer.length}`);
        let state = loadState(data.value);
        console.info(`State: ${JSON.stringify(state, null, "  ")}`);
    }

    let params = new UpdateState(
        lootboxId,
        stateBump,
    );

    params.withPrices([5_000_000, 19_000_000_000])

    let paymentAta1 = await spl.getAssociatedTokenAddress(paymentToken1, vaultPda, true);
    console.info(`Price ATA 1: ${paymentAta1}`);
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
    console.info(`Price ATA 2: ${paymentAta2}`);
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

    console.log(`Data: ${Buffer.from(serializeUpdateState(params)).toString('hex')}`);

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: ADMIN.publicKey, isWritable: false, isSigner: true},
                {pubkey: statePda, isWritable: true, isSigner: false},
                {pubkey: paymentAta1, isWritable: false, isSigner: false},
                {pubkey: paymentAta2, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeUpdateState(params)),
        })
    );

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
