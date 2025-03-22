import {BorshSchema, borshSerialize, borshDeserialize, Unit} from 'borsher';
import {AccountInfo, ParsedAccountData, PublicKey} from "@solana/web3.js";

export const STATE_SEED = "state2";
export const VAULT_SEED = "vault";
export const TICKET_SEED = "ticket";

export enum StateVersion {
    Version1 = 1,
    Version2,
}

export class State {
    version: StateVersion;
    owner: Uint8Array;
    vaultBump: number;
    totalSupply: number;
    maxSupply: number;
    name: string;
    signer: Uint8Array;
    price: bigint;
    baseUrl: string;
    paymentAta: Uint8Array;
    firstIndex: number;

    constructor(version: StateVersion, owner: Uint8Array, vaultBump: number, totalSupply: number, maxSupply: number, name: string, signer: Uint8Array, price: bigint, baseUrl: string, paymentAta: Uint8Array, firstIndex: number) {
        this.version = version;
        this.owner = owner;
        this.vaultBump = vaultBump;
        this.totalSupply = totalSupply;
        this.maxSupply = maxSupply;
        this.name = name;
        this.signer = signer;
        this.price = price;
        this.baseUrl = baseUrl;
        this.paymentAta = paymentAta;
        this.firstIndex = firstIndex;
    }
}

const schema = BorshSchema.Struct({
    version: BorshSchema.u8,
    owner: BorshSchema.Array(BorshSchema.u8, 32),
    vaultBump: BorshSchema.u8,
    totalSupply: BorshSchema.u32,
    maxSupply: BorshSchema.u32,
    name: BorshSchema.String,
    signer: BorshSchema.Array(BorshSchema.u8, 33),
    price: BorshSchema.u64,
    baseUrl: BorshSchema.String,
    paymentAta: BorshSchema.Array(BorshSchema.u8, 32),
    firstIndex: BorshSchema.u32,
});

export function loadState(accountInfo: AccountInfo<Buffer | ParsedAccountData>): State {
    let data = accountInfo.data;
    if (!(data instanceof Buffer)) {
        throw new Error(`data is not a buffer, but ${typeof data}`);
    }
    return borshDeserialize<State>(schema, data);
}
