import {
    AccountMeta, AddressLookupTableAccount, AddressLookupTableProgram,
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction, TransactionMessage, VersionedTransaction
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {findStateAddress, loadState, STATE_SEED, TICKET_SEED, VAULT_SEED} from "../state";
import {ObtainTicket, serializeObtainTicket, serializeWithdraw, Signature, Withdraw} from "../instruction";
import * as spl from "@solana/spl-token";
import * as umiBundle from "@metaplex-foundation/umi-bundle-defaults";
import * as web3 from "@solana/web3.js";
import {keypairIdentity} from "@metaplex-foundation/umi";
import {fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey} from "@metaplex-foundation/umi-web3js-adapters";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {PACKET_DATA_SIZE} from "@solana/web3.js/src/transaction/constants";

export class TokenAmount {
    tokenMint: PublicKey;
    amount: number;


    constructor(tokenMint: string, amount: number) {
        this.tokenMint = new PublicKey(tokenMint);
        this.amount = amount;
    }
}

const ALT_ADDRESSES_LIMIT = 28;
const MAX_TX_SIZE = web3.PACKET_DATA_SIZE;

export async function withdraw(connection: Connection, programId: PublicKey, lootboxId: number, expiredAt: number, ticketIds: PublicKey[], tokenRewards: TokenAmount[], signature: Signature) {
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

    let mplId = toWeb3JsPublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);
    let computeInstruction =  ComputeBudgetProgram.setComputeUnitLimit({units: 400_000})

    let accounts: AccountMeta[] = [
        {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
        {pubkey: vaultPda, isWritable: false, isSigner: false},
        {pubkey: statePda, isWritable: true, isSigner: false},
        {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
        {pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isWritable: false, isSigner: false},
        {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
        {pubkey: mplId, isWritable: false, isSigner: false},
    ];

    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(PAYER)));

    for (let ticketMint of ticketIds) {
        let ticketAta = spl.getAssociatedTokenAddressSync(ticketMint, PAYER.publicKey);
        let [tokenMetadataPda] = mpl.findMetadataPda(umiContext, {mint: fromWeb3JsPublicKey(ticketMint)});
        let [tokenMasterPda] = mpl.findMasterEditionPda(umiContext, {mint: fromWeb3JsPublicKey(ticketMint)});

        accounts.push({pubkey: ticketMint, isSigner: false, isWritable: true});
        accounts.push({pubkey: ticketAta, isSigner: false, isWritable: true});
        accounts.push({pubkey: toWeb3JsPublicKey(tokenMetadataPda), isSigner: false, isWritable: true});
        accounts.push({pubkey: toWeb3JsPublicKey(tokenMasterPda), isSigner: false, isWritable: true});
    }

    let amounts: number[] = [];
    let ataInstructions: TransactionInstruction[] = [];

    for (let tokenReward of tokenRewards) {
        accounts.push({pubkey: tokenReward.tokenMint, isSigner: false, isWritable: false});

        let source = spl.getAssociatedTokenAddressSync(tokenReward.tokenMint, vaultPda, true);
        let destination = spl.getAssociatedTokenAddressSync(tokenReward.tokenMint, PAYER.publicKey, true);

        accounts.push({pubkey: source, isSigner: false, isWritable: true})
        accounts.push({pubkey: destination, isSigner: false, isWritable: true})

        let accountInfo = await connection.getParsedAccountInfo(statePda);
        if (accountInfo.value == null) {
            ataInstructions.push(spl.createAssociatedTokenAccountInstruction(
                PAYER.publicKey,
                destination,
                PAYER.publicKey,
                tokenReward.tokenMint,
            ));
        }

        amounts.push(tokenReward.amount);
    }

    let instructionData = new Withdraw(
        lootboxId,
        ticketIds.length,
        amounts,
        expiredAt,
        signature
    );

    let withdrawInstruction = new TransactionInstruction({
            programId: programId,
            keys: accounts,
            data: Buffer.from(serializeWithdraw(instructionData)),
        }
    );

    let lookupTableKey: PublicKey | null = null;
    let hash: string;

    let txSize = getTxPossibleSize(blockhashInfo, [computeInstruction, ...ataInstructions, withdrawInstruction]);
    if (txSize > MAX_TX_SIZE) {
        // TODO: do not use that, it's sucks; now we know that we can send more than one transaction, so it's much better to send multiple transactions.
        console.info(`Withdraw tx size ${txSize} > ${MAX_TX_SIZE}, lookup table is required`);
        lookupTableKey = await createAndFillAlt(connection, accounts);

        const lookupTableAccount = await connection.getAddressLookupTable(lookupTableKey);
        if (lookupTableAccount.value == null) {
            throw new Error(`ALT table ${lookupTableKey} was not found in blockchain.`);
        }

        let altDeleteInstruction = AddressLookupTableProgram.deactivateLookupTable({
            authority: PAYER.publicKey,
            lookupTable: lookupTableKey,
        });

        // must be after createAndFillAlt
        blockhashInfo = await connection.getLatestBlockhash();

        let txMsg = new TransactionMessage({
            payerKey: PAYER.publicKey,
            instructions: [computeInstruction, ...ataInstructions, withdrawInstruction, altDeleteInstruction],
            recentBlockhash: blockhashInfo.blockhash
        }).compileToV0Message([lookupTableAccount.value]);

        let tx = new VersionedTransaction(txMsg);
        tx.sign([PAYER]);

        let txBuffer = tx.serialize();
        if (txBuffer.length > MAX_TX_SIZE) {
            throw new Error(`Transaction size exceeded! Got ${txBuffer.length}, but max ${MAX_TX_SIZE}.`);
        }

        hash = await connection.sendTransaction(tx);
        await connection.confirmTransaction({
            signature: hash,
            blockhash: blockhashInfo.blockhash,
            lastValidBlockHeight: blockhashInfo.lastValidBlockHeight
        });
    } else {
        console.info("Withdraw tx size is OK for legacy mode.");
        blockhashInfo = await connection.getLatestBlockhash();

        let tx = new Transaction(blockhashInfo);
        tx.add(computeInstruction);
        if (ataInstructions.length > 0) {
            tx.add(...ataInstructions);
        }
        tx.add(withdrawInstruction);
        tx.sign(PAYER);

        let txBuffer = tx.serialize({requireAllSignatures: true, verifySignatures: true});
        if (txBuffer.length > MAX_TX_SIZE) {
            throw new Error(`Transaction size exceeded! Got ${txBuffer.length}, but max ${MAX_TX_SIZE}.`);
        }

        hash = await sendAndConfirmTransaction(connection, tx, [PAYER]);
    }

    console.log("tx hash: " + hash);

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`withdraw counter was ${state.withdrawCounter}, but now is ${changedState.withdrawCounter}`);

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