import {
    AccountMeta,
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {ADMIN, PAYER} from "../secrets";
import {loadState, STATE_SEED, TICKET_SEED, VAULT_SEED} from "../state";
import {ObtainTicket, serializeObtainTicket, serializeWithdraw, Signature, Withdraw} from "../instruction";
import * as spl from "@solana/spl-token";
import * as umiBundle from "@metaplex-foundation/umi-bundle-defaults";
import * as web3 from "@solana/web3.js";
import {keypairIdentity} from "@metaplex-foundation/umi";
import {fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey} from "@metaplex-foundation/umi-web3js-adapters";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";

export class TokenAmount {
    tokenMint: PublicKey;
    amount: number;


    constructor(tokenMint: string, amount: number) {
        this.tokenMint = new PublicKey(tokenMint);
        this.amount = amount;
    }
}

export async function withdraw(connection: Connection, programId: PublicKey, expiredAt: number, ticketIds: PublicKey[], tokenRewards: TokenAmount[], signature: Signature) {
    const blockhashInfo = await connection.getLatestBlockhash();
    const balanceForRentExemption = await connection.getMinimumBalanceForRentExemption(0);
    let tx = new Transaction(blockhashInfo);
    let [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(VAULT_SEED)], programId);
    console.info(`Vault: ${vaultPda}`);
    let [statePda, stateBump] = PublicKey.findProgramAddressSync([ADMIN.publicKey.toBytes(), Buffer.from(STATE_SEED)], programId);
    console.info(`State: ${statePda}`);

    // tx.add(ComputeBudgetProgram.setComputeUnitLimit({units: 300_000}));

    let accounts: AccountMeta[] = [];

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

    for (let tokenReward of tokenRewards) {
        accounts.push({pubkey: tokenReward.tokenMint, isSigner: false, isWritable: true});

        let source = spl.getAssociatedTokenAddressSync(tokenReward.tokenMint, vaultPda, true);
        let destination = spl.getAssociatedTokenAddressSync(tokenReward.tokenMint, PAYER.publicKey, true);

        accounts.push({pubkey: source, isSigner: false, isWritable: true})
        accounts.push({pubkey: destination, isSigner: false, isWritable: true})

        let accountInfo = await connection.getParsedAccountInfo(statePda);
        if (accountInfo.value == null) {
            tx.add(spl.createAssociatedTokenAccountInstruction(
                PAYER.publicKey,
                destination,
                PAYER.publicKey,
                tokenReward.tokenMint,
            ));
        }

        amounts.push(tokenReward.amount);
    }

    let mplId = toWeb3JsPublicKey(mpl.MPL_TOKEN_METADATA_PROGRAM_ID);

    let instructionData = new Withdraw(
        ticketIds.length,
        amounts,
        expiredAt,
        signature
    );

    let inst = new TransactionInstruction({
            programId: programId,
            keys: [
                {pubkey: PAYER.publicKey, isWritable: false, isSigner: true},
                {pubkey: vaultPda, isWritable: false, isSigner: false},
                {pubkey: statePda, isWritable: true, isSigner: false},
                {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
                {pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isWritable: false, isSigner: false},
                {pubkey: spl.TOKEN_PROGRAM_ID, isWritable: false, isSigner: false},
                {pubkey: mplId, isWritable: false, isSigner: false},
                ...accounts
            ],
            data: Buffer.from(serializeWithdraw(instructionData)),
        }
    );

    tx.add(inst);

    console.info(inst.keys);

    let accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let state = loadState(accountInfo.value);

    let hash = await sendAndConfirmTransaction(connection, tx, [PAYER]);
    console.log("tx hash: " + hash);

    // reload account
    accountInfo = await connection.getParsedAccountInfo(statePda);
    if (accountInfo.value == null) {
        throw new Error(`There is no account ${statePda}`);
    }
    let changedState = loadState(accountInfo.value);

    console.log(`total supply was ${state.totalSupply}, but now is ${changedState.totalSupply}`);
}