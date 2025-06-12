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
import {findStateAddress, loadState, STATE_SEED, VAULT_SEED} from "../state";

export async function getState(connection: Connection, programId: PublicKey, lootboxId: number) {
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);

    console.info(`Vault: ${vaultPda}`);
    console.info(`State: ${statePda}`);
    // console.info(`Signer: ${signer.toString("hex")} (${signer.length})`);

    let data = await connection.getParsedAccountInfo(statePda);
    if (data.value == null) {
        throw new Error(`there is no account ${statePda}`);
    }
    let state = loadState(data.value);
    console.info("State: " + JSON.stringify(state, null, "  "));
    // console.info("Data: " + toHex(data.value.data))
}
