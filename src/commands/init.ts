import {
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN} from "../secrets";
import {Initialize, serializeInitialize} from "../instruction";
import {loadState} from "../state";

export async function init(connection: Connection, programId: PublicKey) {
    const blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    let vault_pda = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from("vault")], programId)
    let state_pda = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from("state")], programId)

    console.info(`Vault: ${vault_pda[0]}`);
    console.info(`State: ${state_pda[0]}`);

    let init = new Initialize(
        vault_pda[1],
        state_pda[1],
        100,
        ADMIN.publicKey.toBytes(),
        "DLS 0.1",
        5,
        "https://lootbox-dev.agoradex.io/api/v1/metadata/"
    );

    // let str = Array.from(serializeInstruction(init)).map(value => value.toString(16).padStart(2, "0")).toString()
    // console.log("Ser: " + str);

    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: ADMIN.publicKey, isWritable: false, isSigner: true},
                {pubkey: vault_pda[0], isWritable: true, isSigner: false},
                {pubkey: state_pda[0], isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeInitialize(init)),
        })
    );

    tx.sign(ADMIN);
    let hash = await sendAndConfirmTransaction(connection, tx, [ADMIN]);
    console.log(`tx hash: ${hash}`);

    let data = await connection.getParsedAccountInfo(state_pda[0]);
    if (data.value == null) {
        throw new Error(`there is no account ${state_pda[0]}`);
    }
    let state = loadState(data.value);
    console.info("State: " + JSON.stringify(state, null, "  "));
    // console.info("Data: " + toHex(data.value.data))
}
