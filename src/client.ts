import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import {newAdmin} from "./commands/new-admin";
import {consoleCmd} from "./commands/console";
import {init} from "./commands/init";
import {buy} from "./commands/buy";
import {createToken} from "./commands/create-token";
import {obtain} from "./commands/obtain";
import {Signature} from "./instruction";
import {mintTokens} from "./commands/mint-tokens";
import {TokenAmount, withdraw} from "./commands/withdraw";
import {migrate} from "./commands/migrate";
import {mintNft} from "./commands/mint-nft";
import {secrets} from "./secrets";
import {updateState} from "./commands/update-state";
import {transfer} from "./commands/transfer";
import {createAta} from "./commands/create-ata";
import {getState} from "./commands/get-state";
import {adminWithdraw} from "./commands/admin-withdraw";
import {newKey} from "./commands/new-key";

// const programId = new PublicKey("HDcKzEZqr13G1rbC24pCN1CKSxKjf7JknC5a8ytX5hoN");
const programId = new PublicKey("9eMe9ZfiBf8mtcB6RqP45xR4HRoYBRmfcR98EuxXba3X");
// const usdcMint = new PublicKey("Bf8SC6jEMH2sZ5wTK8nKrc9MeKUDwjNNGfC1fFFKEckF");
const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
// const borgMint = new PublicKey("CVGgUEBWVbKNipC7o37txsDeAyuqG1CMJYiEouReYPg3");
const borgMint = new PublicKey("3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z");
const gnetMint = new PublicKey("3S3XeNPwrETmAQD2kpkrGwxRqwAn7jLidzdRXX1aCepg");
// const xbgMint = new PublicKey("G3bE5wX4fH2sFpjUbECxe62qMEK1V7kY6Ab9m2CG3mij");
const xbgMint = new PublicKey("XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY");
// const borgyMint = new PublicKey("A3CmjFeRJ3864nJWcvy8J22vdUSLx3zRLifvCpqATLFz");
const borgyMint = new PublicKey("BorGY4ub2Fz4RLboGxnuxWdZts7EKhUTB624AFmfCgX");
const lootboxId = 1;
// my NFT token
// const tokenId = new PublicKey("GM1PUUg1Q8cvG8sfW53aKf5PA2kmxoPEGd28VQueiZTH");

// let mint = Keypair.fromSecretKey(Uint8Array.from(secrets.minter_key));
// console.log("Mint: " + mint);

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

// const connection = new Connection(`https://side-special-sunset.solana-devnet.quiknode.pro/${secrets.quick_node_key}`, "confirmed");
const connection = new Connection(`https://side-special-sunset.solana-mainnet.quiknode.pro/${secrets.quick_node_key}`, "confirmed");

function parseSignature(value: string): Signature {
    if (!value.startsWith("0x") && !value.startsWith("0X")) {
        throw new Error("Signature must be in hex format with '0x' prefix");
    }
    if (value.length != 65*2 + 2) {
        throw new Error("Signature must be 65 bytes length.");
    }
    let vrs = Buffer.from(value.substring(2), "hex");
    let v = vrs[0];
    if (v > 3) {
        // there might be 2 vector formats, 0,1,2,3 or 27,28 (Ethereum)
        v = v - 27;
    }
    let rs = new Uint8Array(vrs);

    return new Signature(v, rs.subarray(1));
}

async function main (argv: string[]) {
    if (argv.length < 3) {
        throw new Error("Usage: npm run action <command> ...<opt-params>.");
    }
    switch (argv[2].toLowerCase()) {
        case "buy":
            await buy(connection, programId, lootboxId, borgMint);
            break;
        case "init":
            await init(connection, programId, lootboxId, usdcMint, borgMint);
            break;
        case "new-admin":
            await newAdmin(connection);
            break;
        case "withdraw": {
            if (argv.length != 7) {
                throw new Error("Usage: npm run action withdraw <expiredAt> '[<ticketIds>,..]' '[{tokenMint: <mint>, amount: <amount>},..]' <signatureHex>.");
            }
            let expiredAt = Number.parseInt(argv[3]);
            let ticketIdsRaw = JSON.parse(argv[4]);
            let ticketIds: PublicKey[];
            if (typeof ticketIdsRaw == "string") {
                ticketIds = [new PublicKey(ticketIdsRaw)];
            }
            else if (Array.isArray(ticketIdsRaw)) {
                ticketIds = ticketIdsRaw.map(s => new PublicKey(s));
            }

            let rewardsRaw = JSON.parse(argv[5]);
            if (!Array.isArray(rewardsRaw)) {
                throw new Error("Wrong 5th parameter, expected array of objects.");
            }
            let rewards = rewardsRaw.map(o => new TokenAmount(o.tokenMint, o.amount)) as TokenAmount[];

            let signature = parseSignature(argv[6]);
            await withdraw(
                connection,
                programId,
                lootboxId,
                expiredAt,
                ticketIds,
                rewards,
                signature
            );
            break;
        }
        case "console":
            await consoleCmd(connection);
            break;
        case "create-token":
            await createToken(connection)
            break;
        case "mint-tokens": {
            if (argv.length != 6) {
                throw new Error("Usage: npm run action mint-tokens <mint> <amount> <destination>.");
            }
            let mint = new PublicKey(argv[3]);
            let amount = BigInt(argv[4]);
            let destination = new PublicKey(argv[5]);
            await mintTokens(connection, mint, amount, destination);
            break;
        }
        case "obtain-ticket":
            if (argv.length != 6) {
                throw new Error("Usage: npm run action obtain-ticket <ticketId> <expiredAt> <signatureHex>.");
            }
            let ticketId = Number.parseInt(argv[3]);
            let expiredAt = Number.parseInt(argv[4]);
            let signature = parseSignature(argv[5]);
            await obtain(connection, programId, lootboxId, ticketId, expiredAt, signature);
            break;
        case "migrate":
            await migrate(connection, programId, lootboxId);
            break;
        case "update-state":
            await updateState(connection, programId, lootboxId);
            break;
        case "mint-nft": {
            if (argv.length != 4) {
                throw new Error("Usage: npm run action mint-nft <destination>.");
            }
            let destination = new PublicKey(argv[3]);
            await mintNft(connection, destination);
            break;
        }
        case "transfer": {
            if (argv.length != 6) {
                throw new Error("Usage: npm run action transfer <mint> <amount> <destination>.");
            }
            let mint = new PublicKey(argv[3]);
            let amount = parseInt(argv[4]);
            let destination = new PublicKey(argv[5]);

            await transfer(connection, mint, amount, destination);
            break;
        }
        case "create-ata": {
            if (argv.length != 5) {
                throw new Error("Usage: npm run action create-ata <mint> <destination>.");
            }
            let mint = new PublicKey(argv[3]);
            let destination = new PublicKey(argv[4]);

            await createAta(connection, mint, destination);
            break;
        }
        case "get-state": {
            await getState(connection, programId, lootboxId);
            break;
        }
        case "admin-withdraw": {
            if (argv.length != 5) {
                throw new Error("Usage: npm run action admin-withdraw <mint> <amount>.");
            }
            let mint = new PublicKey(argv[3]);
            let amount = parseInt(argv[4]);
            await adminWithdraw(connection, programId, lootboxId, {tokenMint: mint, amount: amount});
            break;
        }
        case "new-key": {
            let prefix = argv[3];
            await newKey(connection, prefix);
            break;
        }
        default:
            console.log("Usage: ts-node client.js <buy|init|withdraw|new-admin|obtain-ticket|create-token|mint-tokens|migrate|mint-nft|transfer|create-ata|get-state|admin-withdraw|new-key>");
    }
}

(async () => {
    try {
        await main(process.argv);
    } catch (e) {
        console.error(e);
    }
})();