import {Connection, Keypair, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {ADMIN, updateAdmin} from "../secrets";

export async function newAdmin(connection: Connection) {
    let info = await connection.getAccountInfo(ADMIN.publicKey);
    if (info == null) {
        throw new Error(`There is no account info for ${ADMIN.publicKey}`);
    }
    let adminBalance = info.lamports;
    let balanceForRentExemption = await connection.getMinimumBalanceForRentExemption(info.data.length + 2);
    // let balanceForRentExemption2 = await connection.getMinimumBalanceForRentExemption(16);
    console.info(`Admin balance: ${adminBalance} but ${balanceForRentExemption} must be left.`);
    let newKey = Keypair.generate();

    updateAdmin(newKey);
    let toTransfer = Math.max(0, adminBalance - balanceForRentExemption);
    // toTransfer = Math.max(0, adminBalance - balanceForRentExemption2);

    let blockhashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockhashInfo);
    tx.add(SystemProgram.createAccount({
        lamports: toTransfer,
        newAccountPubkey: newKey.publicKey,
        fromPubkey: ADMIN.publicKey,
        space: 0,
        programId: SystemProgram.programId
    }));

    let txHash = await sendAndConfirmTransaction(connection, tx, [ADMIN, newKey]);
    console.info(`${toTransfer} lamports were transferred via transaction ${txHash} to ${newKey.publicKey}`);
}