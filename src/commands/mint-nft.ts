import {Connection, PublicKey} from "@solana/web3.js";
import {PAYER} from "../secrets";
import * as umiBundle from "@metaplex-foundation/umi-bundle-defaults";
import {generateSigner, keypairIdentity, percentAmount, TransactionBuilder} from "@metaplex-foundation/umi";
import {fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey} from "@metaplex-foundation/umi-web3js-adapters";
import {createNft, mplTokenMetadata} from "@metaplex-foundation/mpl-token-metadata";
import * as mplToolbox from '@metaplex-foundation/mpl-toolbox';
import * as spl from "@solana/spl-token";

export async function mintNft(connection: Connection, destination: PublicKey) {
    let umiContext = umiBundle
        .createUmi(connection)
        .use(keypairIdentity(fromWeb3JsKeypair(PAYER)))
        .use(mplTokenMetadata());

    // let destinationAta = spl.getAssociatedTokenAddressSync(mint, PAYER.publicKey);
    // let [tokenMetadataPda] = mpl.findMetadataPda(umiContext, {mint: fromWeb3JsPublicKey(mint)});
    // let [tokenMasterPda] = mpl.findMasterEditionPda(umiContext, {mint: fromWeb3JsPublicKey(mint)});

    const mint = generateSigner(umiContext);

    console.info(`Mint: ${mint.publicKey}`);

    await createNft(umiContext, {
        mint,
        name: 'Test NFT',
        uri: `https://lootbox-dev.agoradex.io/api/v1/m/SOLANA_DEVNET/${mint.publicKey}`,
        sellerFeeBasisPoints: percentAmount(6),
        symbol: "TestNFT",
    }).sendAndConfirm(umiContext);

    if (PAYER.publicKey == destination) {
        return;
    }

    const [sourceTokenAccount] = mplToolbox.findAssociatedTokenPda(umiContext, {mint: mint.publicKey, owner: fromWeb3JsPublicKey(PAYER.publicKey)})
        // await spl.getAssociatedTokenAddress(toWeb3JsPublicKey(mint.publicKey), PAYER.publicKey);

    const destinationTokenAccount = await spl.getOrCreateAssociatedTokenAccount(connection, PAYER, toWeb3JsPublicKey(mint.publicKey), destination, true);

    console.info(`Transfer token mint ${mint.publicKey} from ${sourceTokenAccount} to ${destinationTokenAccount.address}`);

    await mplToolbox.transferTokens(umiContext, {
        source: sourceTokenAccount,
        destination: fromWeb3JsPublicKey(destinationTokenAccount.address),
        amount: 1,
    }).sendAndConfirm(umiContext);

    console.info(`Token transferred to: ${destination}, ata: ${destinationTokenAccount.address}`);

}