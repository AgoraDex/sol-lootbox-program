use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

#[repr(u8)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
#[borsh(use_discriminant = true)]
pub enum Instruction {
    Buy = 0,
    Withdraw {
        ids: Vec<u32>,
        transfer_params: Vec<TransferParams>,
        expire_at: u32,
        signature: Signature
    } = 1,
    ObtainTicket(ObtainTicketParams) = 2,
    MigrateToV2(MigrateToV2Params) = 253,
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
pub struct MigrateToV2Params {
    pub state_bump: u8,
    pub signer: [u8; 33],
    pub first_index: u32,
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

impl Instruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let instruction = Instruction::try_from_slice(input)?;

        Ok(instruction)
    }
}