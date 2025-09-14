import {
    Connection,
    PublicKey
} from "@solana/web3.js";
import {ADMIN} from "../secrets";
import {findStateAddress, loadState, VAULT_SEED} from "../state";

export async function state(connection: Connection, programId: PublicKey, lootboxId: number) {
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId)
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);

    console.info(`Vault: ${vaultPda}`);
    console.info(`State: ${statePda}`);

    let data = await connection.getParsedAccountInfo(statePda);
    if (data.value == null) {
        throw new Error(`there is no account ${statePda}`);
    }
    let state = loadState(data.value);
    console.info("State: " + JSON.stringify(state, (key: string, value: any): any => {
        if (value == null) {
            return value;
        }
        if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'object') {
            return `[${value.join(',')}]`;
        }
        return value;
    }, "  "));
    // console.info("Data: " + toHex(data.value.data))
}
