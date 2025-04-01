use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

#[repr(u8)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
#[borsh(use_discriminant = true)]
pub enum Instruction {
    Buy = 1,
    Withdraw(WithdrawParam) = 2,
    ObtainTicket(ObtainTicketParams) = 3,
    MigrateToV3(MigrateToV3Params) = 253,
    AdminWithdraw {
        transfer_params: TransferParams
    } = 254,
    Initialize {
        vault_bump: u8,
        state_bump: u8,
        max_supply: u32,
        signer: [u8; 33],
        name: String,
        price: u64,
        base_url: String,
    } = 255,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct MigrateToV3Params {
    pub state_bump: u8,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct ObtainTicketParams {
    pub bump: u8,
    pub id: u32,
    pub expire_at: u32,
    pub signature: Signature,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct TransferParams {
    pub source_ata: Pubkey,
    pub destination_ata: Pubkey,
    pub amount: u64
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct Signature {
    pub rec_id: u8,
    pub rs: [u8; 64],
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct WithdrawParam {
    pub expire_at: u32,
    pub signature: Signature,
    pub tickets: u8,
    pub amounts: Vec<u64>, // 1 for NFT
}

impl Instruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let instruction = Instruction::try_from_slice(input)?;

        Ok(instruction)
    }

    pub fn name(&self) -> &'static str {
        match self {
            Instruction::Buy => "Buy",
            Instruction::Withdraw(_) => "Withdraw",
            Instruction::ObtainTicket(_) => "ObtainTicket",
            Instruction::MigrateToV3(_) => "MigrationToV3",
            Instruction::AdminWithdraw { .. } => "AdminWithdraw",
            Instruction::Initialize { .. } => "Initialize",
        }
    }
}