import {
    Connection, Keypair,
    PublicKey,
    sendAndConfirmTransaction, SendTransactionError,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {findStateAddress, loadState, VAULT_SEED} from "../state";
import {Buy, serializeBuy} from "../instruction";
import * as spl from "@solana/spl-token";
import {Ticket} from "../ticket";

export async function buy(connection: Connection, programId: PublicKey, buyer: Keypair, lootboxId: number, paymentTokenMint: PublicKey) {
    const blockHashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockHashInfo);

    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId);
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = findStateAddress(ADMIN.publicKey, lootboxId, programId);
    console.info(`State: ${statePda}`);

    let accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let state = loadState(accountInfo.value);

    // if a user has these token on the balance they must be on the ATA
    let payerAtaPub = spl.getAssociatedTokenAddressSync(paymentTokenMint, PAYER.publicKey);
    console.info(`Payer ATA: ${payerAtaPub}`);
    let paymentAtaPub = spl.getAssociatedTokenAddressSync(paymentTokenMint, vaultPda, true);
    console.info(`Payment ATA: ${paymentAtaPub}`);
    let tokenBalance = await connection.getTokenAccountBalance(payerAtaPub);

    let ticketAmount = 20;
    let amount = 0;
    for (let price of state.prices) {
        console.info(`Amount ${price.amount} sends to ${new PublicKey(price.ata)}`);
        if (new PublicKey(price.ata).equals(paymentAtaPub)) {
            amount = price.amount;
            break;
        }
    }
    if (amount == null || amount == 0) {
        throw new Error(`There is no configured price with ata ${paymentAtaPub}.`);
    }
    let total = BigInt(amount) * BigInt(ticketAmount);

    console.info(`Payment token: ${paymentTokenMint}, balance: ${tokenBalance.value.amount}, credit: ${amount}`)

    tx.add(spl.createApproveInstruction(
        payerAtaPub,
        paymentAtaPub,
        PAYER.publicKey,
        total
    ));

    let ticketMints = [];
    let ticketBumps = [];

    let seed = Math.floor(new Date().getTime() / 1000);
    // let seed = 1750107191;

    for (let i = 0; i < ticketAmount; i ++) {
        let ticketPda = Ticket.findPDA(programId, buyer.publicKey, lootboxId, seed, i);
        ticketMints.push(ticketPda[0]); // save all ticket mints to sign
        ticketBumps.push(ticketPda[1]);
        console.info(`Ticket pda: ${ticketPda[0]} with bump ${ticketPda[1]}`)
    }

    let buy = new Buy(lootboxId, ticketBumps, seed);

    console.info(`buy: ${buy.instruction}, buy data: ${serializeBuy(buy).toString('hex')}`);

    tx.add(new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
                {pubkey: payerAtaPub, isWritable: true, isSigner: false},
                {pubkey: paymentAtaPub, isWritable: true, isSigner: false},
                {pubkey: vaultPda, isWritable: true, isSigner: false},
                {pubkey: statePda, isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                ...ticketMints.map((v) => {
                    return {pubkey: v, isWritable: true, isSigner: false};
                })
            ],
            data: serializeBuy(buy),
        }
    ));

    try {
        let hash = await sendAndConfirmTransaction(connection, tx, [buyer]);
        console.log("tx hash: " + hash);
    }
    catch (e: any) {
        console.error(e);
        if (e instanceof SendTransactionError) {
            console.error(await e.getLogs(connection));
        }
    }

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`total supply was ${state.totalSupply}, but now is ${changedState.totalSupply}`);
}