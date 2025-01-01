use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

#[repr(u8)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
#[borsh(use_discriminant = true)]
pub enum Instruction {
    Buy {
        count: u8,
    } = 0,
    Withdraw = 1,
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

impl Instruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let instruction = Instruction::try_from_slice(input)?;

        Ok(instruction)
    }
}