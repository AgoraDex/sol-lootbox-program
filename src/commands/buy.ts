import {
    Connection, Keypair,
    PublicKey,
    sendAndConfirmTransaction, SendTransactionError,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {loadState, STATE_SEED, VAULT_SEED} from "../state";
import {Buy, serializeBuy} from "../instruction";
import * as spl from "@solana/spl-token";
import * as umiBundle from "@metaplex-foundation/umi-bundle-defaults";
import * as web3 from "@solana/web3.js";
import {keypairIdentity} from "@metaplex-foundation/umi";
import {fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey} from "@metaplex-foundation/umi-web3js-adapters";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";

export async function buy(connection: Connection, programId: PublicKey, paymentTokenMint: PublicKey) {
    const blockHashInfo = await connection.getLatestBlockhash();
    let tx = new Transaction(blockHashInfo);
    let programInfo = await connection.getAccountInfo(programId);
    programInfo?.data.length

    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId);
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(STATE_SEED)], programId);
    console.info(`State: ${statePda}`);

    let accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let state = loadState(accountInfo.value);

    // if a user has these token on the balance they must be on the ATA
    let payerAtaPub = spl.getAssociatedTokenAddressSync(paymentTokenMint, PAYER.publicKey);
    console.info(`Payer ATA: ${payerAtaPub}`);
    let paymentAtaPub = new PublicKey(state.paymentAta);
    console.info(`Payment ATA: ${paymentAtaPub}`);
    let tokenBalance = await connection.getTokenAccountBalance(payerAtaPub);

    let ticketAmount = 3;
    let amount = state.price * BigInt(ticketAmount);

    console.info(`Payment token: ${paymentTokenMint}, balance: ${tokenBalance.value.amount}, credit: ${amount}`)

    tx.add(spl.createApproveInstruction(
        payerAtaPub,
        paymentAtaPub,
        PAYER.publicKey,
        amount
    ));

    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(PAYER)));

    let ticketMints = [];

    for (let i = 0; i < ticketAmount; i ++) {
        let ticketMint = Keypair.generate();
        ticketMints.push(ticketMint); // save all ticket mints to sign
        console.info(`Ticket mint: ${ticketMint.publicKey}`)
        let destinationAta = spl.getAssociatedTokenAddressSync(ticketMint.publicKey, PAYER.publicKey);
        let tokenMetadataPda = mpl.findMetadataPda(umiContext, {mint: fromWeb3JsPublicKey(ticketMint.publicKey)});
        let tokenMasterPda = mpl.findMasterEditionPda(umiContext, {mint: fromWeb3JsPublicKey(ticketMint.publicKey)});
        let mplId = toWeb3JsPublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);

        let buy = new Buy;

        console.info(`buy: ${buy.instruction}, buy data: ${serializeBuy(buy).toString('hex')}`);

        tx.add(new TransactionInstruction({
                programId: programId,
                keys: [
                    {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
                    {pubkey: payerAtaPub, isWritable: true, isSigner: false},
                    {pubkey: paymentAtaPub, isWritable: true, isSigner: false},
                    {pubkey: vaultPda, isWritable: true, isSigner: false},
                    {pubkey: statePda, isWritable: true, isSigner: false},
                    {pubkey: destinationAta, isWritable: true, isSigner: false},
                    {pubkey: ticketMint.publicKey, isWritable: true, isSigner: true},
                    {pubkey: toWeb3JsPublicKey(tokenMetadataPda["0"]), isWritable: true, isSigner: false},
                    {pubkey: toWeb3JsPublicKey(tokenMasterPda["0"]), isWritable: true, isSigner: false},
                    {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                    {pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isWritable: false, isSigner: false},
                    {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                    {pubkey: mplId, isWritable: false, isSigner: false},
                    {pubkey: spl.ASSOCIATED_TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                ],
                data: serializeBuy(buy),
            }
        ));
    }

    try {
        // payer MUST be first signature!
        let hash = await sendAndConfirmTransaction(connection, tx, [PAYER, ...ticketMints]);
        console.log("tx hash: " + hash);
    }
    catch (e: SendTransactionError) {
        console.error(e);
        console.error(await e.getLogs(connection));
    }

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`total supply was ${state.totalSupply}, but now is ${changedState.totalSupply}`);
}