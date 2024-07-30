use std::ops::{Deref, DerefMut};
use borsh::{BorshSerialize, BorshDeserialize};
use solana_program::pubkey::Pubkey;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;
use crate::state::StateVersion::Version1;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct State {
    pub version: StateVersion,
    pub owner: Pubkey,
    pub total_supply: u32,
    pub max_supply: u32,
    pub name: String,
    pub signer: Pubkey,
}

#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[repr(u8)]
#[borsh(use_discriminant = true)]
pub enum StateVersion {
    // Undefined = 0,
    Version1 = 1,
}

impl State {
    pub fn if_initialized(state_pda: &AccountInfo) -> bool {
        let version = state_pda.data.borrow()[0];
        // the first struct field is version, starting from 1; so the state has already used if it doesn't have 0
        version != 0
    }

    pub fn serialized_len(&self) -> Result<usize, ProgramError> {
        let mut buf: Vec<u8> = Vec::new();

        self.serialize(&mut buf)?;
        Ok(buf.len())
    }

    pub fn save_to(&self, state_pda: &AccountInfo) -> ProgramResult {
        self.serialize(state_pda.data.borrow_mut().deref_mut())?;

        Ok(())
    }
}

#[test]
fn test_save_to() {
    let owner = Pubkey::new_unique();
    println!("Owner: {:?}", owner.to_bytes());
    let signer = Pubkey::new_unique();
    println!("Signer: {:?}", signer.to_bytes());

    let state = State {
        version: Version1,
        owner,
        total_supply: 0,
        max_supply: 100,
        name: "DLS 1".to_string(),
        signer
    };

    let mut buf: Vec<u8> = Vec::with_capacity(100);

    state.serialize(&mut buf).unwrap();

    println!("Result: {:?}", buf);
}