import { BorshSchema, borshSerialize, borshDeserialize, Unit } from 'borsher';

// Определение enum типов
enum InstructionType {
    Buy = 1,
    Withdraw,
    ObtainTicket,
    UpdateState = 252,
    Migrate = 253,
    AdminWithdraw = 254,
    Initialize = 255,
}

export class Initialize {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        lootboxId: BorshSchema.u16,
        vaultBump: BorshSchema.u8,
        stateBump: BorshSchema.u8,
        maxSupply: BorshSchema.u32,
        beginTs: BorshSchema.u32,
        endTs: BorshSchema.u32,
        signer: BorshSchema.Array(BorshSchema.u8, 33),
        name: BorshSchema.String,
        prices: BorshSchema.Vec(BorshSchema.u64),
        baseUrl: BorshSchema.String,
    });

    instruction: InstructionType = InstructionType.Initialize;
    lootboxId: number;
    vaultBump: number;
    stateBump: number;
    maxSupply: number;
    beginTs: number;
    endTs: number;
    signer: Uint8Array;
    name: string;
    prices: number[];
    baseUrl: string;

    constructor(lootboxId: number, vaultBump: number, stateBump: number, maxSupply: number, beginTs: number, endTs: number, signer: Uint8Array, name: string, prices: number[], baseUrl: string) {
        this.lootboxId = lootboxId;
        this.vaultBump = vaultBump;
        this.stateBump = stateBump;
        this.maxSupply = maxSupply;
        this.beginTs = beginTs;
        this.endTs = endTs;
        this.signer = signer;
        this.name = name;
        this.prices = prices;
        this.baseUrl = baseUrl;
    }
}

export class Migrate {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        stateBump: BorshSchema.u8,
    });

    instruction: InstructionType = InstructionType.Migrate;
    stateBump: number

    constructor(stateBump: number) {
        this.stateBump = stateBump;
    }
}

export class UpdateState {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        lootboxId: BorshSchema.u16,
        stateBump: BorshSchema.u8,
        maxSupply: BorshSchema.u32,
    });

    instruction: InstructionType = InstructionType.UpdateState;
    lootboxId: number;
    stateBump: number;
    maxSupply: number;

    constructor(lootboxId: number, stateBump: number, maxSupply: number) {
        this.lootboxId = lootboxId;
        this.stateBump = stateBump;
        this.maxSupply = maxSupply;
    }
}

export class Buy {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        lootboxId: BorshSchema.u16,
    });

    instruction: InstructionType = InstructionType.Buy;
    lootboxId: number;

    constructor(lootboxId: number) {
        this.lootboxId = lootboxId;
    }
}


export class Signature {
    readonly static SCHEMA = BorshSchema.Struct({
        recId: BorshSchema.u8,
        rs: BorshSchema.Array(BorshSchema.u8, 64),
    });

    recId: number;
    rs: Uint8Array;

    constructor(recId: number, rs: Uint8Array) {
        this.recId = recId;
        this.rs = rs;
    }
}

export class ObtainTicket {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        lootboxId: BorshSchema.u16,
        ticketBump: BorshSchema.u8,
        ticketId: BorshSchema.u32,
        expireAt: BorshSchema.u32,
        signature: Signature.SCHEMA,
    });

    instruction: InstructionType = InstructionType.ObtainTicket;
    lootboxId: number;
    ticketBump: number;
    ticketId: number;
    expireAt: number;
    signature: Signature;

    constructor(lootboxId: number, ticketBump: number, ticketId: number, expireAt: number, signature: Signature) {
        this.lootboxId = lootboxId;
        this.ticketBump = ticketBump;
        this.ticketId = ticketId;
        this.expireAt = expireAt;
        this.signature = signature;
    }
}

export class Withdraw {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        lootboxId: BorshSchema.u16,
        expireAt: BorshSchema.u32,
        signature: Signature.SCHEMA,
        tickets: BorshSchema.u8,
        amounts: BorshSchema.Vec(BorshSchema.u64),
    });

    instruction: InstructionType = InstructionType.Withdraw;
    lootboxId: number;
    tickets: number;
    amounts: number[];
    expireAt: number;
    signature: Signature;

    constructor(lootboxId: number, tickets: number, amounts: number[], expireAt: number, signature: Signature) {
        this.lootboxId = lootboxId;
        this.tickets = tickets;
        this.amounts = amounts;
        this.expireAt = expireAt;
        this.signature = signature;
    }
}

export class AdminWithdraw {
    readonly static SCHEMA = BorshSchema.Struct({
        instruction: BorshSchema.u8,
        lootboxId: BorshSchema.u16,
        amount: BorshSchema.u64,
    });

    instruction: InstructionType = InstructionType.AdminWithdraw;
    lootboxId: number;
    amount: number;

    constructor(lootboxId: number, amount: number) {
        this.lootboxId = lootboxId;
        this.amount = amount;
    }
}

export function serializeInitialize(instruction: Initialize): Uint8Array {
    return borshSerialize(Initialize.SCHEMA, instruction);
}

export function serializeBuy(instruction: Buy): Buffer {
    return borshSerialize(Buy.SCHEMA, instruction);
}

export function serializeObtainTicket(instruction: ObtainTicket): Uint8Array {
    return borshSerialize(ObtainTicket.SCHEMA, instruction);
}

export function serializeWithdraw(instruction: Withdraw): Uint8Array {
    return borshSerialize(Withdraw.SCHEMA, instruction);
}

export function serializeMigrate(instruction: Migrate): Uint8Array {
    return borshSerialize(Migrate.SCHEMA, instruction);
}

export function serializeUpdateState(instruction: UpdateState): Uint8Array {
    return borshSerialize(UpdateState.SCHEMA, instruction);
}

export function serializeAdminWithdraw(instruction: AdminWithdraw): Uint8Array {
    return borshSerialize(AdminWithdraw.SCHEMA, instruction);
}