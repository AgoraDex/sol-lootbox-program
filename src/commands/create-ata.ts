import {Connection, PublicKey} from "@solana/web3.js";
import {createMint, getOrCreateAssociatedTokenAccount, mintTo} from "@solana/spl-token";
import {ADMIN, PAYER} from "../secrets";

export async function createAta(connection: Connection, mint: PublicKey, dest: PublicKey) {
    console.info(`Mint: ${mint}`)
    console.info(`Dest: ${dest}`)

    const destAta = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        dest,
        true
    );

    console.info(`ATA: ${destAta.address.toBase58()}`)

}