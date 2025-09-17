import {Connection, PublicKey} from "@solana/web3.js";
import {getOrCreateAssociatedTokenAccount, mintTo} from "@solana/spl-token";
import {PAYER, TOKEN_OWNER} from "../secrets";

export async function mintTokens(connection: Connection, mint: PublicKey, amount: bigint, dest: PublicKey) {

    const payerAta = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        dest,
        true
    );

    console.info(`ATA: ${payerAta.address.toBase58()}`)

    await mintTo(
        connection,
        TOKEN_OWNER,
        mint,
        payerAta.address,
        TOKEN_OWNER,
        amount
    );

    console.info(`Mint ${amount} to ${payerAta.address.toBase58()} is done.`);

}