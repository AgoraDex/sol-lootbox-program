import {PROFILE, PROFILE_DEVNET, PROFILE_MAINNET_OLD} from "./profile";
import {Keypair, PublicKey} from "@solana/web3.js";
import {getKeypair, secrets} from "./secrets";

let params: { [name: string]: IParams } = {};

interface IParams {
    programId: PublicKey;
    usdcMint: PublicKey;
    borgMint: PublicKey;
    xbgMint: PublicKey;
    borgyMint: PublicKey;
    gnetMint: PublicKey | undefined;
    lootboxId: number;
    endpoint: string;
    signer: Buffer;
    admin: Keypair;
}

params["mainnet-migrated-3"] = {
    programId: new PublicKey("AGLBQbbahLsenbFRmtZRRCeKgNavgZvcaVDhwWt1teZt"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    gnetMint: undefined,
    lootboxId: 3,
    endpoint: `https://burned-weathered-dinghy.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
    signer: Buffer.from("020b9ecdce09a6ad4e6d0de60f604618aaceec4cb533b1d1e1becb1901c8215515", "hex"),
    admin: getKeypair("admin3_mainnet_key"),
};

params["mainnet-migrated-2"] = {
    programId: new PublicKey("AGLBQbbahLsenbFRmtZRRCeKgNavgZvcaVDhwWt1teZt"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    gnetMint: undefined,
    lootboxId: 2,
    endpoint: `https://burned-weathered-dinghy.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
    signer: Buffer.from("020b9ecdce09a6ad4e6d0de60f604618aaceec4cb533b1d1e1becb1901c8215515", "hex"),
    admin: getKeypair("admin2_mainnet_key"),
};

params["mainnet-migrated-1"] = {
    programId: new PublicKey("AGLBQbbahLsenbFRmtZRRCeKgNavgZvcaVDhwWt1teZt"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    gnetMint: undefined,
    lootboxId: 1,
    endpoint: `https://burned-weathered-dinghy.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
    signer: Buffer.from("020b9ecdce09a6ad4e6d0de60f604618aaceec4cb533b1d1e1becb1901c8215515", "hex"),
    admin: getKeypair("admin1_mainnet_key"),
};

params["mainnet-infinity"] = {
    programId: new PublicKey("AGLBQbbahLsenbFRmtZRRCeKgNavgZvcaVDhwWt1teZt"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    gnetMint: undefined,
    lootboxId: 4,
    endpoint: `https://burned-weathered-dinghy.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
    signer: Buffer.from("020b9ecdce09a6ad4e6d0de60f604618aaceec4cb533b1d1e1becb1901c8215515", "hex"),
    admin: getKeypair("admin4_mainnet_key"),
};

params["mainnet-forgana"] = {
    programId: new PublicKey("AGLBDv2cn7RD5GzJi46zxqqPNvF3GREQdVYkZzhxV3wv"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    gnetMint: undefined,
    lootboxId: 3,
    endpoint: `https://burned-weathered-dinghy.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
    signer: Buffer.from("020b9ecdce09a6ad4e6d0de60f604618aaceec4cb533b1d1e1becb1901c8215515", "hex"),
    admin: getKeypair("admin_mainnet_key"),
};

params[PROFILE_MAINNET_OLD] = {
    programId: new PublicKey("9eMe9ZfiBf8mtcB6RqP45xR4HRoYBRmfcR98EuxXba3X"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    gnetMint: undefined,
    lootboxId: 1,
    endpoint: `https://burned-weathered-dinghy.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
    signer: Buffer.from("020b9ecdce09a6ad4e6d0de60f604618aaceec4cb533b1d1e1becb1901c8215515", "hex"),
    admin: getKeypair("admin_mainnet_key"),
};

params[PROFILE_DEVNET] = {
    programId: new PublicKey("AGLPAUWmu9dT8XAA7S3rDwyt2UUNzTYf3MuAeFx3cxV5"),
    usdcMint: new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF"),
    borgMint: new PublicKey("CVGgUEBWVbKNipC7o37txsDeAyuqG1CMJYiEouReYPg3"),
    xbgMint: new PublicKey("G3bE5wX4fH2sFpjUbECxe62qMEK1V7kY6Ab9m2CG3mij"),
    borgyMint: new PublicKey("A3CmjFeRJ3864nJWcvy8J22vdUSLx3zRLifvCpqATLFz"),
    gnetMint: new PublicKey("3S3XeNPwrETmAQD2kpkrGwxRqwAn7jLidzdRXX1aCepg"),
    lootboxId: 2,
    endpoint: `https://api.devnet.solana.com`,
    signer: Buffer.from("033e2222644f8d418e9b51622ba74eb23313c7cabbba68d45d767ae321bd34b5eb", "hex"),
    admin: getKeypair("admin_devnet_key"),
}

params["devnet-jackpot"] = {
    programId: new PublicKey("AGLPAUWmu9dT8XAA7S3rDwyt2UUNzTYf3MuAeFx3cxV5"),
    usdcMint: new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF"),
    borgMint: new PublicKey("CVGgUEBWVbKNipC7o37txsDeAyuqG1CMJYiEouReYPg3"),
    xbgMint: new PublicKey("G3bE5wX4fH2sFpjUbECxe62qMEK1V7kY6Ab9m2CG3mij"),
    borgyMint: new PublicKey("A3CmjFeRJ3864nJWcvy8J22vdUSLx3zRLifvCpqATLFz"),
    gnetMint: new PublicKey("3S3XeNPwrETmAQD2kpkrGwxRqwAn7jLidzdRXX1aCepg"),
    lootboxId: 7,
    endpoint: `https://api.devnet.solana.com`,
    signer: Buffer.from("033e2222644f8d418e9b51622ba74eb23313c7cabbba68d45d767ae321bd34b5eb", "hex"),
    admin: getKeypair("admin_devnet_key"),
}

params["olddev"] = {
    programId: new PublicKey("HDcKzEZqr13G1rbC24pCN1CKSxKjf7JknC5a8ytX5hoN"),
    usdcMint: new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF"),
    borgMint: new PublicKey("CVGgUEBWVbKNipC7o37txsDeAyuqG1CMJYiEouReYPg3"),
    xbgMint: new PublicKey("G3bE5wX4fH2sFpjUbECxe62qMEK1V7kY6Ab9m2CG3mij"),
    borgyMint: new PublicKey("A3CmjFeRJ3864nJWcvy8J22vdUSLx3zRLifvCpqATLFz"),
    gnetMint: new PublicKey("3S3XeNPwrETmAQD2kpkrGwxRqwAn7jLidzdRXX1aCepg"),
    lootboxId: 2,
    endpoint: `https://api.devnet.solana.com`,
    signer: Buffer.from("033e2222644f8d418e9b51622ba74eb23313c7cabbba68d45d767ae321bd34b5eb", "hex"),
    admin: getKeypair("admin_devnet_key_2"),
}

params["newdev"] = {
    programId: new PublicKey("AGLuuavR5JWtEgvjLUZiw6XswhjVm79HX59aGNipa8Fb"),
    usdcMint: new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF"),
    borgMint: new PublicKey("CVGgUEBWVbKNipC7o37txsDeAyuqG1CMJYiEouReYPg3"),
    xbgMint: new PublicKey("G3bE5wX4fH2sFpjUbECxe62qMEK1V7kY6Ab9m2CG3mij"),
    borgyMint: new PublicKey("A3CmjFeRJ3864nJWcvy8J22vdUSLx3zRLifvCpqATLFz"),
    gnetMint: new PublicKey("3S3XeNPwrETmAQD2kpkrGwxRqwAn7jLidzdRXX1aCepg"),
    lootboxId: 6,
    endpoint: `https://api.devnet.solana.com`,
    signer: Buffer.from("033e2222644f8d418e9b51622ba74eb23313c7cabbba68d45d767ae321bd34b5eb", "hex"),
    admin: getKeypair("admin_devnet_key"),
}

export const PARAMS = params[PROFILE];
export const ALL_PARAMS = params;