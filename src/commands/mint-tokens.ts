import {Connection, PublicKey} from "@solana/web3.js";
import {createMint, getOrCreateAssociatedTokenAccount, mintTo} from "@solana/spl-token";
import {ADMIN, PAYER} from "../secrets";

export async function mintTokens(connection: Connection, mint: PublicKey, amount: BigInt, dest: PublicKey) {

    const payerAta = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        dest
    );

    await mintTo(
        connection,
        ADMIN,
        mint,
        payerAta.address,
        ADMIN,
        amount
    );
}