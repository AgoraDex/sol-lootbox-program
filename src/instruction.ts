import { BorshSchema, borshSerialize, borshDeserialize, Unit } from 'borsher';
import ts, {Signature} from "typescript";

// Определение enum типов
enum InstructionType {
    Buy,
    Withdraw,
    ObtainTicket,
    Initialize = 255
}

export class Initialize {
    instruction: InstructionType = InstructionType.Initialize;
    vault_bump: number;
    state_bump: number;
    max_supply: number;
    signer: Uint8Array;
    name: string;
    price: number;
    base_url: string;

    constructor(vault_bump: number, state_bump: number, max_supply: number, signer: Uint8Array, name: string, price: number, base_url: string) {
        this.vault_bump = vault_bump;
        this.state_bump = state_bump;
        this.max_supply = max_supply;
        this.signer = signer;
        this.name = name;
        this.price = price;
        this.base_url = base_url;
    }
}

export class Buy {
    instruction: InstructionType = InstructionType.Buy;

    constructor() {
    }
}

export class ObtainTicket {
    instruction: InstructionType = InstructionType.ObtainTicket;
    ticketBump: number;
    ticketId: number;
    expireAt: number;
    signature: Signature;

    constructor(ticketBump: number, ticketId: number, expireAt: number, signature: Signature) {
        this.ticketBump = ticketBump;
        this.ticketId = ticketId;
        this.expireAt = expireAt;
        this.signature = signature;
    }
}

export class Signature {
    recId: number;
    rs: Uint8Array;

    constructor(recId: number, rs: Uint8Array) {
        this.recId = recId;
        this.rs = rs;
    }
}

const initializeSchema = BorshSchema.Struct({
    instruction: BorshSchema.u8,
    vault_bump: BorshSchema.u8,
    state_bump: BorshSchema.u8,
    max_supply: BorshSchema.u32,
    signer: BorshSchema.Array(BorshSchema.u8, 33),
    name: BorshSchema.String,
    price: BorshSchema.u64,
    base_url: BorshSchema.String,
});

const buySchema = BorshSchema.Struct({
    instruction: BorshSchema.u8,
});

const signatureSchema = BorshSchema.Struct({
    recId: BorshSchema.u8,
    rs: BorshSchema.Array(BorshSchema.u8, 64),
});

const obtainTicketSchema = BorshSchema.Struct({
    instruction: BorshSchema.u8,
    ticketBump: BorshSchema.u8,
    ticketId: BorshSchema.u32,
    expireAt: BorshSchema.u32,
    signature: signatureSchema
});

export function serializeInitialize(instruction: Initialize): Uint8Array {
    return borshSerialize(initializeSchema, instruction);
}

export function serializeBuy(instruction: Buy): Uint8Array {
    return borshSerialize(buySchema, instruction);
}

export function serializeObtainTicket(instruction: ObtainTicket): Uint8Array {
    return borshSerialize(obtainTicketSchema, instruction);
}