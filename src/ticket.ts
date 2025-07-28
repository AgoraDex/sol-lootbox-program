import {borshDeserialize, BorshSchema, borshSerialize} from "borsher";
import {AccountInfo, ParsedAccountData, PublicKey} from "@solana/web3.js";

export class Ticket {
    static readonly TICKET_PREFIX = "AGLB";

    static readonly SCHEMA = BorshSchema.Struct({
        prefix: BorshSchema.Array(BorshSchema.u8, 4),
        version: BorshSchema.u8,
        owner: BorshSchema.Array(BorshSchema.u8, 32),
        lootboxId: BorshSchema.u16,
        issueIndex: BorshSchema.u32,
        externalId: BorshSchema.u32,
    });

    prefix: Array<number>;
    version: number;
    owner: Uint8Array;
    lootboxId: number;
    issueIndex: number;
    externalId: number;


    constructor(prefix: Array<number>, version: number, owner: Uint8Array, lootboxId: number, issueIndex: number, externalId: number) {
        this.prefix = prefix;
        this.version = version;
        this.owner = owner;
        this.lootboxId = lootboxId;
        this.issueIndex = issueIndex;
        this.externalId = externalId;
    }

    public serialize(): Buffer {
        return borshSerialize(Ticket.SCHEMA, this);
    }

    public static load(accountInfo: AccountInfo<Buffer | ParsedAccountData>): Ticket {
        let data = accountInfo.data;
        if (!(data instanceof Buffer)) {
            throw new Error(`data is not a buffer, but ${typeof data}`);
        }
        return borshDeserialize<Ticket>(Ticket.SCHEMA, data);
    }

    public static findPDA(programId: PublicKey, owner: PublicKey, lootboxId: number, seed: number, index: number): [PublicKey, number] {
        const buf = Buffer.alloc(2 + 4 + 1);
        let offset = buf.writeUint16BE(lootboxId);
        offset = buf.writeUint32BE(seed, offset);
        buf.writeUint8(index, offset);

        // console.info(`PDA: ${owner} + ${lootboxId} + ${seed} + ${index} : ${buf.length}`);
        return PublicKey.findProgramAddressSync([owner.toBytes(), buf], programId);
    }
}