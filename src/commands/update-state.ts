import {
    Connection, Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {serializeUpdateState, UpdateState} from "../instruction";
import {findStateAddress, loadState, VAULT_SEED} from "../state";

export async function updateState(connection: Connection, admin :Keypair, programId: PublicKey, lootboxId: number) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    console.info(`Admin: ${admin.publicKey}`);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([admin.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = findStateAddress(admin.publicKey, lootboxId, programId);

    {
        let data = await connection.getParsedAccountInfo(statePda);
        if (data.value == null) {
            throw new Error(`there is no account ${statePda}`);
        }
        let buffer : Buffer = <Buffer>data.value.data;
        console.info(`State: ${statePda}, size ${buffer.length}`);
        let state = loadState(data.value);
        console.info(`State: ${state.toJson()}`);
    }

    let params = new UpdateState(
        lootboxId,
        stateBump,
    ).withTotalSupply(1000);

    console.log(`Data: ${Buffer.from(serializeUpdateState(params)).toString('hex')}`);

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: admin.publicKey, isWritable: false, isSigner: true},
                {pubkey: statePda, isWritable: true, isSigner: false},
            ],
            data: Buffer.from(serializeUpdateState(params)),
        })
    );

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
