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
    ObtainTicket {
        id: u32,
        expire_at: u32,
        signature: Signature
    } = 2,
    MigrateToV2 {
        state_bump: u8,
    } = 253,
    AdminWithdraw {
        transfer_params: TransferParams
    } = 254,
    Initialize {
        vault_bump: u8,
        state_bump: u8,
        max_supply: u32,
        signer: Pubkey,
        name: String,
        price: u64,
        base_url: String,
    } = 255,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct TransferParams {
    pub source_ata: Pubkey,
    pub destination_ata: Pubkey,
    pub amount: u64
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct Signature {
    v: u8,
    r: [u8; 32],
    s: [u8; 32],
}

impl Instruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let instruction = Instruction::try_from_slice(input)?;

        Ok(instruction)
    }
}