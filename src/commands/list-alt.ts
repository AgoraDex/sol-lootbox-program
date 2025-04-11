import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AddressLookupTableProgram } from '@solana/web3.js';
import {PAYER} from "../secrets";

const ALT_PROGRAM_ID = AddressLookupTableProgram.programId;

async function listAlt(connection: Connection) {
    const authority = PAYER.publicKey;
    const currentSlot = await connection.getSlot();

    // Offset 45 - start of authority field in ALT account
    const filters = [{
        memcmp: {
            offset: 45,
            bytes: authority.toBase58(),
        },
    }];

    const lookupTables = await connection.getProgramAccounts(ALT_PROGRAM_ID, { filters });

    console.log(`Found ${lookupTables.length} ALT(s) for authority ${authority.toBase58()}:`);

    for (const lt of lookupTables) {
        const pubkey = lt.pubkey.toBase58();
        const data = lt.account.data;

        const deactivationSlot = data.readBigUInt64LE(1); // byte offset 1–8 (skip discriminator)
        const isDeactivated = deactivationSlot !== BigInt("0xffffffffffffffff");

        console.log(`→ ALT: ${pubkey}`);
        console.log(`   Deactivation Slot: ${deactivationSlot.toString()}`);
        console.log(`   Deactivated: ${isDeactivated}`);

        if (isDeactivated && currentSlot > Number(deactivationSlot) + 512) {
            console.log(`   ✅ Can be closed (expired by ${currentSlot - Number(deactivationSlot)} slots)`);
        } else if (isDeactivated) {
            console.log(`   ⏳ Waiting for expiry (${512 - (currentSlot - Number(deactivationSlot))} slots left)`);
        } else {
            console.log(`   🟢 Still active`);
        }
    }
}