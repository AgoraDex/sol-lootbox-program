import {
    AccountMeta,
    AddressLookupTableProgram,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {findStateAddress, loadState, VAULT_SEED} from "../state";
import {
    AdminWithdraw,
    serializeAdminWithdraw,
} from "../instruction";
import * as spl from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import {TokenAmount} from "./withdraw";

const ALT_ADDRESSES_LIMIT = 28;
const MAX_TX_SIZE = web3.PACKET_DATA_SIZE;

export async function adminWithdraw(connection: Connection, programId: PublicKey, lootboxId: number, tokenWithdraw: TokenAmount) {
    let blockhashInfo = await connection.getLatestBlockhash();

    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId);
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);

    let accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let state = loadState(accountInfo.value);
    console.info(`State: ${statePda}, withdrawCounter: ${state.withdrawCounter}`);

    // let computeInstruction =  ComputeBudgetProgram.setComputeUnitLimit({units: 400_000})

    let instructionData = new AdminWithdraw(
        lootboxId,
        tokenWithdraw.amount,
    );

    let source = spl.getAssociatedTokenAddressSync(tokenWithdraw.tokenMint, vaultPda, true);
    let destination = spl.getAssociatedTokenAddressSync(tokenWithdraw.tokenMint, ADMIN.publicKey, true);

    let accounts: AccountMeta[] = [
        {pubkey: ADMIN.publicKey, isWritable: false, isSigner: true},
        {pubkey: statePda, isWritable: false, isSigner: false},
        {pubkey: vaultPda, isWritable: false, isSigner: false},
        {pubkey: source, isWritable: true, isSigner: false},
        {pubkey: destination, isWritable: true, isSigner: false},
        {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
    ];

    let withdrawInstruction = new TransactionInstruction({
            programId: programId,
            keys: accounts,
            data: Buffer.from(serializeAdminWithdraw(instructionData)),
        }
    );


    let tx = new Transaction(blockhashInfo);
    // tx.add(computeInstruction);
    tx.add(withdrawInstruction);
    tx.sign(ADMIN);

    let hash = await sendAndConfirmTransaction(connection, tx, [ADMIN]);

    console.log("tx hash: " + hash);
}

async function closeAlt(connection: Connection, lookupTableKey: PublicKey) {
    let altDeactivateInstruction = AddressLookupTableProgram.deactivateLookupTable({
        authority: PAYER.publicKey,
        lookupTable: lookupTableKey
    })

    let altCloseInstruction = AddressLookupTableProgram.closeLookupTable({
        authority: PAYER.publicKey,
        lookupTable: lookupTableKey,
        recipient: PAYER.publicKey
    });

    let tx = new Transaction(await connection.getLatestBlockhash());
    tx.add(altDeactivateInstruction);
    tx.add(altCloseInstruction);
    tx.sign(PAYER);
    await sendAndConfirmTransaction(connection, tx, [PAYER]);
    console.info(`ALT ${lookupTableKey} was successfully closed, resource returned to PAYER.`);
}

function getTxPossibleSize(blockhashInfo: web3.BlockhashWithExpiryBlockHeight, instructions: TransactionInstruction[]): number {
    let tx = new Transaction(blockhashInfo);
    tx.add(...instructions);
    try {
        tx.sign(PAYER);
        let buf = tx.serialize({requireAllSignatures: true, verifySignatures: true});
        return buf.length;
    } catch (e) {
        // unfortunately there is no way to check that error is about length... the just throw Error from the library
        return Number.MAX_VALUE;
    }
}

async function createAndFillAlt(connection: Connection, accounts: AccountMeta[]): Promise<PublicKey> {
    let blockhashInfo = await connection.getLatestBlockhash();
    let latestSlot = await connection.getSlot();
    let restAddresses = accounts.map(value => value.pubkey);

    let createList = restAddresses.slice(0, ALT_ADDRESSES_LIMIT);
    restAddresses = restAddresses.slice(ALT_ADDRESSES_LIMIT);

    let [createALT, lookupTableKey] = AddressLookupTableProgram.createLookupTable({
        payer: PAYER.publicKey,
        authority: PAYER.publicKey,
        recentSlot: latestSlot
    });

    let hash = null;

    {
        let addALT = AddressLookupTableProgram.extendLookupTable({
            payer: PAYER.publicKey,
            authority: PAYER.publicKey,
            addresses: createList,
            lookupTable: lookupTableKey
        });

        let altTx = new Transaction(blockhashInfo);
        altTx.add(createALT);
        altTx.add(addALT);

        altTx.sign(PAYER);
        let altTxBuf = altTx.serialize({requireAllSignatures: true, verifySignatures: true});
        if (altTxBuf.length > MAX_TX_SIZE) {
            throw new Error(`Transaction size exceeded! Got ${altTxBuf.length}, but max ${MAX_TX_SIZE}.`);
        }

        hash = await sendAndConfirmTransaction(connection, altTx, [PAYER]);
        console.info(`ALT was created! Save somewhere to free the resource in case of failure: ${lookupTableKey}`)
    }

    while (restAddresses.length != 0) {
        blockhashInfo = await connection.getLatestBlockhash();
        let nextList = restAddresses.slice(0, ALT_ADDRESSES_LIMIT);
        restAddresses = restAddresses.slice(ALT_ADDRESSES_LIMIT);

        let addALT = AddressLookupTableProgram.extendLookupTable({
            payer: PAYER.publicKey,
            authority: PAYER.publicKey,
            addresses: nextList,
            lookupTable: lookupTableKey
        });

        let altTx = new Transaction(blockhashInfo);
        altTx.add(addALT);

        altTx.sign(PAYER);
        let altTxBuf = altTx.serialize({requireAllSignatures: true, verifySignatures: true});
        if (altTxBuf.length > MAX_TX_SIZE) {
            throw new Error(`Transaction size exceeded! Got ${altTxBuf.length}, but max ${MAX_TX_SIZE}.`);
        }
        hash = await sendAndConfirmTransaction(connection, altTx, [PAYER]);
    }


    // ensure last time that connection was commited
    await connection.confirmTransaction({
        signature: hash,
        blockhash: blockhashInfo.blockhash,
        lastValidBlockHeight: blockhashInfo.lastValidBlockHeight
    }, 'finalized');

    return lookupTableKey;
}