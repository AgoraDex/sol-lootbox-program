import {Connection, Keypair, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {ADMIN, updateAdmin} from "../secrets";
import bs58 from 'bs58';

export async function unpackTx(txBase64: string) {
    let txBuf = Buffer.from(txBase64, "base64");
    console.info(`Tx length: ${txBuf.length}`);

    let tx = Transaction.from(txBuf);
    console.info(`Tx: ${tx.signature?.toString("base58")}`);
    console.info(`Tx instructions: ${tx.instructions.length}:`);

    tx.instructions.forEach(inst => {
        console.info("------------------------------------------")
        console.info(` - Program: ${inst.programId}`)
        console.info(` - Data: ${inst.data.toString("hex")}`)
        console.info(` - Keys: ${inst.keys.map(value => value.pubkey.toBase58() + `(${value.isWritable ? "w" : "-"}${value.isSigner ? "s": "-"})`).join(", ")}`)
    })

    console.info(`Signatures: ${tx.signatures.map(value => value.publicKey.toBase58()).join(", ")}`)
}