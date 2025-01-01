import { BorshSchema, borshSerialize, borshDeserialize, Unit } from 'borsher';
import {AccountInfo, ParsedAccountData, PublicKey} from "@solana/web3.js";

export enum StateVersion {
    Version1 = 1,
}

export class State {
    version: StateVersion;
    owner: PublicKey;
    vault_bump: number;
    total_supply: number;
    max_supply: number;
    name: string;
    signer: PublicKey;
    price: bigint;
    base_url: string;

    constructor(version: StateVersion, owner: PublicKey, vault_bump: number, total_supply: number, max_supply: number, name: string, signer: PublicKey, price: bigint, base_url: string) {
        this.version = version;
        this.owner = owner;
        this.vault_bump = vault_bump;
        this.total_supply = total_supply;
        this.max_supply = max_supply;
        this.name = name;
        this.signer = signer;
        this.price = price;
        this.base_url = base_url;
    }
}

const schema = BorshSchema.Struct({
    version: BorshSchema.u8,
    owner: BorshSchema.Array(BorshSchema.u8, 32),
    vault_bump: BorshSchema.u8,
    total_supply: BorshSchema.u32,
    max_supply: BorshSchema.u32,
    name: BorshSchema.String,
    signer: BorshSchema.Array(BorshSchema.u8, 32),
    price: BorshSchema.u64,
    base_url: BorshSchema.String,
});

export function loadState(accountInfo: AccountInfo<Buffer | ParsedAccountData>) : State {
    let data = accountInfo.data;
    if (!(data instanceof Buffer)) {
        throw new Error(`data is not a buffer, but ${typeof data}`);
    }
    return borshDeserialize<State>(schema, data);
}
