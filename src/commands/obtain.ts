import {
    ComputeBudgetProgram,
    Connection, Keypair,
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
import {Ticket} from "../ticket";

export async function obtain(connection: Connection, programId: PublicKey, buyer: Keypair, lootboxId: number, ticketId: number, expiredAt: number, signature: Signature) {
    const blockhashInfo = await connection.getLatestBlockhash();
    // const balanceForRentExemption = await connection.getMinimumBalanceForRentExemption(0);
    let tx = new Transaction(blockhashInfo);
    let vaultPda = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId);
    console.info(`Vault: ${vaultPda[0]}`);
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);
    console.info(`State: ${statePda}`);

    console.info(`Ticket Id: ${ticketId}, Expired At: ${expiredAt}`);
    let [ticketPda, ticketBump] = Ticket.findPDA(programId, buyer.publicKey, lootboxId, ticketId, 0);
    console.info(`Ticket: ${ticketPda}`);
    console.info(`Signature recId: ${signature.recId}, rs: ${signature.rs}`);

    let accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let state = loadState(accountInfo.value);

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
                {pubkey: buyer.publicKey, isWritable: false, isSigner: true},
                {pubkey: statePda, isWritable: true, isSigner: false},
                {pubkey: vaultPda[0], isWritable: false, isSigner: false},
                {pubkey: ticketPda, isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
            ],
            data: Buffer.from(serializeObtainTicket(instructionData)),
        }
    ));

    let hash = await sendAndConfirmTransaction(connection, tx, [buyer]);
    console.log("tx hash: " + hash);

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`total supply was ${state.totalSupply}, but now is ${changedState.totalSupply}`);
}