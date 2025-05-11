import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import {
  findMetadataPda,
  findMasterEditionPda,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata'
import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters'

type NftPdaInfo = {
  mplIdPubkey: string
  tokenMetadataPdaPubkey: string
  tokenMasterPdaPubkey: string
}

export async function getNftPdaInfo({
  nftPubkey,
  userPubkey,
  connection = new Connection(clusterApiUrl('devnet'), 'confirmed'),
}: {
  nftPubkey: string
  userPubkey: string
  connection?: Connection
}): Promise<NftPdaInfo> {
  const payerPubkey = new PublicKey(userPubkey)
  const tokenPubkey = new PublicKey(nftPubkey)

  const umiContext = createUmi(connection).use(
    walletAdapterIdentity({ publicKey: payerPubkey })
  )

  const [tokenMetadataPda] = findMetadataPda(umiContext, {
    mint: fromWeb3JsPublicKey(tokenPubkey),
  })

  const [tokenMasterPda] = findMasterEditionPda(umiContext, {
    mint: fromWeb3JsPublicKey(tokenPubkey),
  })

  const mplId = toWeb3JsPublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
  const tokenMetadataPdaPubkey = toWeb3JsPublicKey(tokenMetadataPda)
  const tokenMasterPdaPubkey = toWeb3JsPublicKey(tokenMasterPda)

  return {
    mplIdPubkey: mplId.toBase58(),
    tokenMetadataPdaPubkey: tokenMetadataPdaPubkey.toBase58(),
    tokenMasterPdaPubkey: tokenMasterPdaPubkey.toBase58(),
  }
}
