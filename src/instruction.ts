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

    constructor(vault_bump: number, state_bump: number, max_supply: number, signer: Uint8Array, name: string) {
        this.vault_bump = vault_bump;
        this.state_bump = state_bump;
        this.max_supply = max_supply;
        this.signer = signer;
        this.name = name;
    }
}

const schema = BorshSchema.Struct({
    instruction: BorshSchema.u8,
    vault_bump: BorshSchema.u8,
    state_bump: BorshSchema.u8,
    max_supply: BorshSchema.u32,
    signer: BorshSchema.Array(BorshSchema.u8, 32),
    name: BorshSchema.String
});


export function serializeInstruction(instruction: Initialize): Uint8Array {
    return borshSerialize(schema, instruction);
}