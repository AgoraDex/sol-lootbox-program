import {BorshSchema, borshDeserialize} from 'borsher';
import {AccountInfo, ParsedAccountData, PublicKey} from "@solana/web3.js";

export const STATE_SEED = "state";
export const VAULT_SEED = "vault";
export const TICKET_SEED = "ticket";

export enum StateVersion {
    Version1 = 1,
    Version2,
    Version3,
    Version4,
}

export class Price {
    public static readonly SCHEMA = BorshSchema.Struct({
        amount: BorshSchema.u64,
        ata: BorshSchema.Array(BorshSchema.u8, 32),
    })

    amount: number;
    ata: Uint8Array;

    constructor(amount: number, ata: Uint8Array) {
        this.amount = amount;
        this.ata = ata;
    }
}

export class State {
    version: StateVersion;
    id: number;
    owner: Uint8Array;
    vaultBump: number;
    totalSupply: number;
    maxSupply: number;
    beginTs: number;
    endTs: number;
    name: string;
    signer: Uint8Array;
    prices: Price[];
    withdrawCounter: number;
    specialWithdrawMaxIndex: number;
    specialWithdrawTickets: number[];

    constructor(version: StateVersion, id: number, owner: Uint8Array, vaultBump: number, totalSupply: number, maxSupply: number, beginTs: number, endTs: number, name: string, signer: Uint8Array, prices: Price[], withdrawCounter: number, specialWithdrawMaxIndex: number, specialWithdrawTickets: number[]) {
        this.version = version;
        this.id = id;
        this.owner = owner;
        this.vaultBump = vaultBump;
        this.totalSupply = totalSupply;
        this.maxSupply = maxSupply;
        this.beginTs = beginTs;
        this.endTs = endTs;
        this.name = name;
        this.signer = signer;
        this.prices = prices;
        this.withdrawCounter = withdrawCounter;
        this.specialWithdrawMaxIndex = specialWithdrawMaxIndex;
        this.specialWithdrawTickets = specialWithdrawTickets;
    }
}

const schema = BorshSchema.Struct({
    version: BorshSchema.u8,
    id: BorshSchema.u16,
    owner: BorshSchema.Array(BorshSchema.u8, 32),
    vaultBump: BorshSchema.u8,
    totalSupply: BorshSchema.u32,
    maxSupply: BorshSchema.u32,
    beginTs: BorshSchema.u32,
    endTs: BorshSchema.u32,
    name: BorshSchema.String,
    signer: BorshSchema.Array(BorshSchema.u8, 33),
    prices: BorshSchema.Vec(Price.SCHEMA),
    withdrawCounter: BorshSchema.u32,
    specialWithdrawMaxIndex: BorshSchema.u16,
    specialWithdrawTickets: BorshSchema.Array(BorshSchema.u8, 100),
});

export function createStateSeed(admin: PublicKey, lootboxId: number): Buffer[] {
    const buf = Buffer.alloc(2);
    buf.writeUint16BE(lootboxId);

    return [admin.toBuffer(), Buffer.from(STATE_SEED), buf];
}


function createVaultSeed(admin: PublicKey, lootboxId: number): Buffer[] {
    const buf = Buffer.alloc(2);
    buf.writeUint16BE(lootboxId);

    return [admin.toBuffer(), Buffer.from(VAULT_SEED), buf];
}

export function findStateAddress(admin: PublicKey, lootboxId: number, programId: PublicKey): [PublicKey, number] {
    const seed = createStateSeed(admin, lootboxId);
    return PublicKey.findProgramAddressSync(seed, programId);
}

export function loadState(accountInfo: AccountInfo<Buffer | ParsedAccountData>): State {
    let data = accountInfo.data;
    if (!(data instanceof Buffer)) {
        throw new Error(`data is not a buffer, but ${typeof data}`);
    }
    return borshDeserialize<State>(schema, data);
}
