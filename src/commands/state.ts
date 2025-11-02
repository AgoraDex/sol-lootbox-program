import {
    Connection, Keypair,
    PublicKey
} from "@solana/web3.js";
import {findStateAddress, loadState, VAULT_SEED} from "../state";

export async function state(connection: Connection, admin: Keypair, programId: PublicKey, lootboxId: number) {
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([admin.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = findStateAddress(admin.publicKey, lootboxId, programId);

    console.info(`Vault: ${vaultPda}`);
    console.info(`State: ${statePda}`);

    let data = await connection.getParsedAccountInfo(statePda);
    if (data.value == null) {
        throw new Error(`there is no account ${statePda}`);
    }
    let state = loadState(data.value);
    console.info("State: " + state.toJson());
    // console.info("Data: " + toHex(data.value.data))
}
