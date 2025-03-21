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
import {loadState, STATE_SEED, VAULT_SEED} from "../state";

export async function init(connection: Connection, programId: PublicKey, paymentToken: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(STATE_SEED)], programId)
    let signer = Buffer.from("033e2222644f8d418e9b51622ba74eb23313c7cabbba68d45d767ae321bd34b5eb", "hex");

    console.info(`Vault: ${vaultPda}`);
    console.info(`State: ${statePda}`);
    console.info(`Signer: ${signer.toString("hex")} (${signer.length})`);

    let init = new Initialize(
        vaultBump,
        stateBump,
        100,
        new Uint8Array(signer),
        "DLS 0.2",
        5_000_000,
        "https://lootbox-dev.agoradex.io/api/v1/m/SOLANA_DEVNET/"
    );

    // let str = Array.from(serializeInstruction(init)).map(value => value.toString(16).padStart(2, "0")).toString()
    // console.log("Ser: " + str);

    let paymentAta = await spl.getAssociatedTokenAddress(paymentToken, vaultPda, true);
    let paymentAtaAccount = await connection.getAccountInfo(paymentAta);
    if (paymentAtaAccount == null) {
        tx.add(
            spl.createAssociatedTokenAccountInstruction(
                ADMIN.publicKey,
                paymentAta,
                vaultPda,
                paymentToken
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
                {pubkey: paymentAta, isWritable: false, isSigner: false},
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
