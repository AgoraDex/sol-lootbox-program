import { BorshSchema, borshSerialize, borshDeserialize, Unit } from 'borsher';
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
    owner: PublicKey;
    vault_bump: number;
    total_supply: number;
    max_supply: number;
    name: string;
    signer: Uint8Array;
    price: bigint;
    base_url: string;
    payment_ata: PublicKey;
    first_index: number;

    constructor(version: StateVersion, owner: PublicKey, vault_bump: number, total_supply: number, max_supply: number, name: string, signer: Uint8Array, price: bigint, base_url: string, payment_ata: PublicKey, first_index: number) {
        this.version = version;
        this.owner = owner;
        this.vault_bump = vault_bump;
        this.total_supply = total_supply;
        this.max_supply = max_supply;
        this.name = name;
        this.signer = signer;
        this.price = price;
        this.base_url = base_url;
        this.payment_ata = payment_ata;
        this.first_index = first_index;
    }
}

const schema = BorshSchema.Struct({
    version: BorshSchema.u8,
    owner: BorshSchema.Array(BorshSchema.u8, 32),
    vault_bump: BorshSchema.u8,
    total_supply: BorshSchema.u32,
    max_supply: BorshSchema.u32,
    name: BorshSchema.String,
    signer: BorshSchema.Array(BorshSchema.u8, 33),
    price: BorshSchema.u64,
    base_url: BorshSchema.String,
    payment_ata: BorshSchema.Array(BorshSchema.u8, 32),
    first_index: BorshSchema.u32,
});

export function loadState(accountInfo: AccountInfo<Buffer | ParsedAccountData>) : State {
    let data = accountInfo.data;
    if (!(data instanceof Buffer)) {
        throw new Error(`data is not a buffer, but ${typeof data}`);
    }
    return borshDeserialize<State>(schema, data);
}
