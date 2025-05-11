import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {findStateAddress, loadState, STATE_SEED, TICKET_SEED, VAULT_SEED} from "../state";
import {ObtainTicket, serializeObtainTicket, Signature} from "../instruction";
import * as spl from "@solana/spl-token";
import * as umiBundle from "@metaplex-foundation/umi-bundle-defaults";
import * as web3 from "@solana/web3.js";
import {keypairIdentity} from "@metaplex-foundation/umi";
import {fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey} from "@metaplex-foundation/umi-web3js-adapters";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";

export async function obtain(connection: Connection, programId: PublicKey, lootboxId: number, ticketId: number, expiredAt: number, signature: Signature) {
    const blockhashInfo = await connection.getLatestBlockhash();
    const balanceForRentExemption = await connection.getMinimumBalanceForRentExemption(0);
    let tx = new Transaction(blockhashInfo);
    let vaultPda = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId);
    console.info(`Vault: ${vaultPda[0]}`);
    let statePda = findStateAddress(ADMIN.publicKey, lootboxId, programId);
    console.info(`State: ${statePda[0]}`);

    console.info(`Ticket Id: ${ticketId}, Expired At: ${expiredAt}`);
    let ticketIdBuf = Buffer.alloc(4);
    ticketIdBuf.writeUInt32BE(ticketId);
    let [ticketPda, ticketBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(TICKET_SEED), ticketIdBuf], programId)
    console.info(`Ticket: ${ticketPda}`);
    console.info(`Signature recId: ${signature.recId}, rs: ${signature.rs}`);

    let accountInfo = await connection.getParsedAccountInfo(statePda[0]);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda[0]}`);
    }
    let state = loadState(accountInfo.value);

    let destinationAta = spl.getAssociatedTokenAddressSync(ticketPda, PAYER.publicKey);
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({units: 300_000}));

    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(PAYER)));

    let tokenMetadataPda = mpl.findMetadataPda(umiContext, {mint: fromWeb3JsPublicKey(ticketPda)});
    let tokenMasterPda = mpl.findMasterEditionPda(umiContext, {mint: fromWeb3JsPublicKey(ticketPda)});
    let mplId = toWeb3JsPublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);

    let instructionData = new ObtainTicket(
        lootboxId,
        ticketBump,
        ticketId,
        expiredAt,
        signature
    );

    tx.add(new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
                {pubkey: destinationAta, isWritable: true, isSigner: false},
                {pubkey: statePda[0], isWritable: true, isSigner: false},
                {pubkey: vaultPda[0], isWritable: false, isSigner: false},
                {pubkey: ticketPda, isWritable: true, isSigner: false},
                {pubkey: toWeb3JsPublicKey(tokenMetadataPda["0"]), isWritable: true, isSigner: false},
                {pubkey: toWeb3JsPublicKey(tokenMasterPda["0"]), isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isWritable: false, isSigner: false},
                {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                {pubkey: mplId, isWritable: false, isSigner: false},
                {pubkey: spl.ASSOCIATED_TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeObtainTicket(instructionData)),
        }
    ));

    let hash = await sendAndConfirmTransaction(connection, tx, [PAYER]);
    console.log("tx hash: " + hash);

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda[0]);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda[0]}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`total supply was ${state.totalSupply}, but now is ${changedState.totalSupply}`);
}