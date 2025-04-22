import {
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN} from "../secrets";
import {Migrate, serializeMigrate, serializeUpdateState, UpdateState} from "../instruction";
import {loadState, STATE_SEED, VAULT_SEED} from "../state";

export async function updateState(connection: Connection, programId: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(STATE_SEED)], programId)

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
        stateBump,
        500
    );

    console.log(`Data: ${Buffer.from(serializeUpdateState(params)).toString('hex')}`);

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: ADMIN.publicKey, isWritable: false, isSigner: true},
                {pubkey: statePda, isWritable: true, isSigner: false},
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
