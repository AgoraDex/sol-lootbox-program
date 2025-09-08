import {Connection, Keypair} from "@solana/web3.js";
import bs58 from 'bs58';

export async function newKey(connection: Connection, prefix: string) {
    let newKey = Keypair.generate();

    if (prefix != null) {
        // check it's correct prefix
        let buf = bs58.decode(prefix);
        let maxIterations = Math.pow(256, buf.length);
        console.info(`Got prefix ${prefix} with byte length ${buf.length}, so it required in about ${maxIterations} iterations.`);

        let index = 0;
        while (!newKey.publicKey.toBase58().startsWith(prefix)) {
            newKey = Keypair.generate();
            if (index % 10000 == 0) {
                console.info(`Passed: ${index} iterations, it's about ${Math.round(index / maxIterations * 100)}%`)
                console.info(`Current key: ${newKey.publicKey.toBase58()}, looking for ${prefix}...`)
            }
            index ++;
        }
    }

    console.info(`New address: "${newKey.publicKey}"`);
    console.info(`Private key: "${JSON.stringify(Array.from(newKey.secretKey.values()))}"`);
    console.info(`Private key b58: "${bs58.encode(newKey.secretKey)}"`);
}