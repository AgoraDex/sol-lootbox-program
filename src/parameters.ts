import {PROFILE, PROFILE_DEVNET, PROFILE_MAINNET} from "./profile";
import {PublicKey} from "@solana/web3.js";
import {secrets} from "./secrets";

params[PROFILE_MAINNET] = {
    programId: new PublicKey("9eMe9ZfiBf8mtcB6RqP45xR4HRoYBRmfcR98EuxXba3X"),
    usdcMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    borgMint: new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z"),
    xbgMint: new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY"),
    borgyMint: new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX"),
    lootboxId: 1,
    endpoint: `https://side-special-sunset.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`,
};

params[PROFILE_DEVNET] = {
    programId: new PublicKey("HDcKzEZqr13G1rbC24pCN1CKSxKjf7JknC5a8ytX5hoN"),
    usdcMint: new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF"),
    borgMint: new PublicKey("CVGgUEBWVbKNipC7o37txsDeAyuqG1CMJYiEouReYPg3"),
    gnetMint: new PublicKey("3S3XeNPwrETmAQD2kpkrGwxRqwAn7jLidzdRXX1aCepg"),
    xbgMint: new PublicKey("G3bE5wX4fH2sFpjUbECxe62qMEK1V7kY6Ab9m2CG3mij"),
    borgyMint: new PublicKey("A3CmjFeRJ3864nJWcvy8J22vdUSLx3zRLifvCpqATLFz"),
    lootboxId: 5,
    endpoint: `https://side-special-sunset.solana-devnet.quiknode.pro/${secrets.quick_node_key}`,
}

export const PARAMS = params[PROFILE];
export const ALL_PARAMS = params;