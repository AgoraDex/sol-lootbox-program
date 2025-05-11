import {Connection, PublicKey} from "@solana/web3.js";
import {PAYER} from "../secrets";
import * as spl from "@solana/spl-token";
import {getOrCreateAssociatedTokenAccount} from "@solana/spl-token";

export async function transfer(connection: Connection, mint: PublicKey, amount: number, destination: PublicKey) {

    const sourceAta = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        PAYER.publicKey
    );

    const destinationAta = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        destination,
        true
    );

    console.info(`Mint: ${mint}`);
    console.info(`Source ${PAYER.publicKey}, ATA: ${sourceAta.address}`);
    console.info(`Destination ${destination}, ATA: ${destinationAta.address}`);

    await spl.transfer(
        connection,
        PAYER,
        sourceAta.address,
        destinationAta.address,
        PAYER,
        amount
    );

    console.info(`Token ${mint} transferred to: ${destination}, ata: ${destinationAta.address}`);

}