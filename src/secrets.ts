import {Keypair} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const SECRETS_PATH = '../.secrets.json';
const OLD_SECRETS_PATH = '../.secrets-old.json';

export const secrets = require(SECRETS_PATH);

export const PAYER = Keypair.fromSecretKey(Uint8Array.from(secrets.payer_key.split(",")));
console.info("Payer: " + PAYER.publicKey);
export const ADMIN = Keypair.fromSecretKey(Uint8Array.from(secrets.admin_key.split(",")));
console.info("Admin: " + ADMIN.publicKey);
console.info(`Old Admin: ${Keypair.fromSecretKey(Uint8Array.from(secrets.old_admin_key.split(","))).publicKey}`)

const CUR_ADMIN_KEY = "admin_key";
const OLD_ADMIN_PREFIX = "old_admin_"
const OLD_ADMIN_SUFFIX = "_key"

export function updateAdmin(newKey: Keypair) {
    let keysCount = Object.keys(secrets).length;
    let oldAdminCount = 0;
    Object.keys(secrets).forEach(key => {
        if (!key.startsWith(OLD_ADMIN_PREFIX)) {
            return;
        }

        let indexEnd = key.indexOf("_", OLD_ADMIN_PREFIX.length);
        let indexStr = key.substring(OLD_ADMIN_PREFIX.length, indexEnd);
        let currentIndex = Number.parseInt(indexStr);
        oldAdminCount = Math.max(currentIndex, oldAdminCount);
    });

    let oldKey = OLD_ADMIN_PREFIX + (oldAdminCount + 1) + OLD_ADMIN_SUFFIX;
    secrets[oldKey] = Array.from(ADMIN.secretKey.values()).join(",");

    secrets[CUR_ADMIN_KEY] = Array.from(newKey.secretKey.values()).join(",");

    let oldPath = path.join(__dirname, OLD_SECRETS_PATH);
    let curPath = path.join(__dirname, SECRETS_PATH);

    if (fs.existsSync(oldPath)) {
        const oldSecrets = require(OLD_SECRETS_PATH);
        let oldKey = Object.keys(oldSecrets).length;
        if (oldKey + 1 != keysCount) {
            throw new Error(`There is old file '${oldPath}' which has unexpected amount of keys comparing to current. Please check that both files are correct and drop old file. Script does this check to avoid case when script started generate corrupted files.`);
        }
        fs.unlinkSync(oldPath);
    }
    fs.renameSync(curPath, oldPath);
    fs.writeFileSync(curPath, JSON.stringify(secrets, null, "  "));

    const newSecrets = require(SECRETS_PATH);
    if (keysCount + 1 != Object.keys(newSecrets).length) {
        throw new Error(`The script did something wrong! Please check result in the file '${curPath}'. Backup file is available there '${oldPath}'.`);
    }

    console.info(`Admin key was replaced with new one: ${newKey.publicKey.toString()}`);
    console.info(`Old key was added as '${oldPath}'`);
    console.info(`Secrets file was backed up into '${oldPath}'`);
}

