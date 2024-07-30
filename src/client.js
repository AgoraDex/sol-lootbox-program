"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const secrets = require('../.secrets.json');
// import secrets from '../.secrets.json' assert {type: "json"};
const programId = new web3_js_1.PublicKey("HCovB9zJmXYtUWPPYVFkPzULynEcS7R9eTpmrmKEN1Go");
let payer = web3_js_1.Keypair.fromSecretKey(secrets.payer_key);
let receiver = web3_js_1.Keypair.fromSecretKey(secrets.receiver_key);
let mint = web3_js_1.Keypair.fromSecretKey(secrets.minter_key);
const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)("devnet"), "confirmed");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const blockhashInfo = yield connection.getLatestBlockhash();
        let tx = new web3_js_1.Transaction(blockhashInfo);
        tx.add(new web3_js_1.TransactionInstruction({
            programId: programId,
            keys: [
                { pubkey: payer.publicKey, isWritable: true, isSigner: true },
                { pubkey: receiver.publicKey, isWritable: true, isSigner: false },
                { pubkey: web3_js_1.SystemProgram.programId, isWritable: false, isSigner: false }
            ],
            data: Buffer.from([]),
        }));
        tx.sign(payer);
        let hash = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, tx, [payer]);
        console.log("tx hash: " + hash);
    });
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield main();
    }
    catch (e) {
        console.error(e);
    }
}))();
