import {Connection} from "@solana/web3.js";
import {createMint, getOrCreateAssociatedTokenAccount, mintTo} from "@solana/spl-token";
import {ADMIN, PAYER} from "../secrets";

export async function createToken(connection: Connection) {

    const mint = await createMint(
        connection,
        ADMIN,
        ADMIN.publicKey,        // Mint authority
        null,
        6
    );

    console.info("Test USDC token: " + mint.toBase58())

    const payerAta = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        PAYER.publicKey
    );

    await mintTo(
        connection,
        ADMIN,
        mint,
        payerAta.address,
        ADMIN,
        1_000_000_000 // 1000 USDC
    );
}