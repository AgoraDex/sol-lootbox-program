import { BorshSchema, borshSerialize, borshDeserialize, Unit } from 'borsher';

// Определение enum типов
enum InstructionType {
    Buy,
    Withdraw,
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

const initializeSchema = BorshSchema.Struct({
    instruction: BorshSchema.u8,
    vault_bump: BorshSchema.u8,
    state_bump: BorshSchema.u8,
    max_supply: BorshSchema.u32,
    signer: BorshSchema.Array(BorshSchema.u8, 32),
    name: BorshSchema.String,
    price: BorshSchema.u64,
    base_url: BorshSchema.String,
});


const buySchema = BorshSchema.Struct({
    instruction: BorshSchema.u8,
});


export function serializeInitialize(instruction: Initialize): Uint8Array {
    return borshSerialize(initializeSchema, instruction);
}

export function serializeBuy(instruction: Buy): Uint8Array {
    return borshSerialize(buySchema, instruction);
}