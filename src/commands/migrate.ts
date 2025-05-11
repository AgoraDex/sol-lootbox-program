import {
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN} from "../secrets";
import {Migrate, serializeMigrate} from "../instruction";
import {findStateAddress, loadState, STATE_SEED, VAULT_SEED} from "../state";

export async function migrate(connection: Connection, programId: PublicKey, lootboxId: number) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);

    {
        let data = await connection.getParsedAccountInfo(statePda);
        if (data.value == null) {
            throw new Error(`there is no account ${statePda}`);
        }
        let buffer : Buffer = <Buffer>data.value.data;
        console.info(`State: ${statePda}, size ${buffer.length}`);
    }

    console.info(`Vault: ${vaultPda}`);

    let init = new Migrate(
        stateBump,
    );

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: ADMIN.publicKey, isWritable: false, isSigner: true},
                {pubkey: statePda, isWritable: true, isSigner: false},
            ],
            data: Buffer.from(serializeMigrate(init)),
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
