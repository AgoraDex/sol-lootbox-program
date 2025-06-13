use crate::error::CustomError;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use std::cmp::{min, PartialEq};
use std::io::Cursor;
use std::mem::size_of;
use std::ops::{Deref, DerefMut};
use solana_program::clock::{Clock, UnixTimestamp};

pub const STATE_SEED: &[u8] = b"state";
pub const VAULT: &[u8] = b"vault";
pub const TICKET: &[u8] = b"ticket";
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct StateV3 {
    pub version: StateVersion,
    pub owner: Pubkey,
    pub vault_bump: u8,
    pub total_supply: u32,
    pub max_supply: u32,
    pub name: String,
    pub signer: [u8; 33],
    pub price: u64,
    pub base_url: String,
    pub payment_ata: Pubkey,
    // pub first_index: u32,
    pub withdraw_counter: u32, // used for synchronization
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Price {
    pub amount: u64,
    pub ata: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct State {
    pub version: StateVersion,
    pub id: u16,
    pub owner: Pubkey,
    pub vault_bump: u8,
    pub total_supply: u32,
    pub max_supply: u32,
    pub begin_ts: u32,
    pub end_ts: u32,
    pub name: String,
    pub signer: [u8; 33],
    pub prices: Vec<Price>,
    pub base_url: String,
    pub withdraw_counter: u32, // used for synchronization
}

#[derive(Debug, PartialEq, BorshSerialize, BorshDeserialize)]
#[repr(u8)]
#[borsh(use_discriminant = true)]
pub enum StateVersion {
    // Undefined = 0,
    Version1 = 1,
    Version2 = 2,
    Version3 = 3,
    Version4 = 4,
}

impl State {
    pub const MAX_STATE_SIZE: usize = size_of::<State>() + 1024;

    pub fn verify_and_load(program_id: &Pubkey, state_pda: &AccountInfo, lootbox_id: u16, bump: Option<u8>) -> Result<State, ProgramError> {
        if !State::if_initialized(state_pda) {
            msg!("State is not properly initialized.");
            return Err(CustomError::StateNotInitialized.into());
        }

        if Self::get_version(state_pda) != Self::get_last_version() {
            msg!("State has wrong version, should be {}", Self::get_last_version());
            return Err(CustomError::StateWrongVersion.into());
        }

        let state = Self::load_from(state_pda)?;

        let state_pub = if bump.is_some() {
            let seed = [state.owner.as_ref(), STATE_SEED, &lootbox_id.to_be_bytes(), &[bump.unwrap()]];
            Pubkey::create_program_address(&seed, program_id)?
        } else {
            let seed = [state.owner.as_ref(), STATE_SEED, &lootbox_id.to_be_bytes()];
            Pubkey::find_program_address(&seed, program_id).0
        };

        if state_pub != *state_pda.key {
            msg!("State doesn't belongs to the specified lootbox_id.");
            return Err(CustomError::WrongState.into());
        }

        Ok(state)
    }

    pub fn if_initialized(state_pda: &AccountInfo) -> bool {
        if state_pda.data_is_empty() {
            return false;
        }
        let version = state_pda.data.borrow()[0];
        // the first struct field is version, starting from 1; so the state has already used if it doesn't have 0
        version != 0
    }

    pub fn get_version(state_pda: &AccountInfo) -> u8 {
        let version = state_pda.data.borrow()[0];
        version
    }

    pub fn get_last_version() -> u8 {
        StateVersion::Version4 as u8
    }

    pub fn serialized_len(&self) -> Result<usize, ProgramError> {
        // let mut buf: [u8; Self::MAX_STATE_SIZE];
        let mut cursor = Cursor::new([0u8; Self::MAX_STATE_SIZE]);

        self.serialize(&mut cursor)?;

        Ok(cursor.position() as usize)
    }

    pub fn save_to(&self, state_pda: &AccountInfo) -> ProgramResult {
        self.serialize(state_pda.data.borrow_mut().deref_mut())?;

        Ok(())
    }

    pub fn load_from(state_pda: &AccountInfo) -> Result<Self, ProgramError> {
        let data = state_pda.data.borrow();
        let mut buf: &[u8] = data.deref();
        let state = State::deserialize(&mut buf)?;
        Ok(state)
    }

    pub fn find_price(&self, price_ata: &AccountInfo) -> Result<u64, ProgramError> {
        for price in &self.prices {
            if price.ata == *price_ata.key {
                return Ok(price.amount);
            }
        }

        Err(CustomError::WrongPaymentAta.into())
    }

    pub fn check_and_get_correct_count(&self, count: u8) -> Result<u8, ProgramError> {
        if self.total_supply >= self.max_supply {
            msg!("state.total_supply >= state.max_supply");
            return Err(CustomError::MaxSupplyReached.into());
        }

        let tickets_left = self.max_supply - self.total_supply;

        Ok(min(count as u32, tickets_left) as u8)
    }

    pub fn check_time(&self, clock: &Clock) -> ProgramResult {
        if (self.begin_ts as UnixTimestamp) > clock.unix_timestamp {
            msg!("too early, now {} is less then begin {}", clock.unix_timestamp, self.begin_ts);
            return Err(CustomError::TooEarly.into());
        }
        if (self.end_ts as UnixTimestamp) < clock.unix_timestamp {
            msg!("too late, now {} is grater then end {}", clock.unix_timestamp, self.end_ts);
            return Err(CustomError::TooLate.into());
        }

        Ok(())
    }

    pub fn check_vault_with_seed(&self, program_id: &Pubkey, vault_pda: &AccountInfo, seed: &[&[u8]]) -> ProgramResult {
        let vault_pub = Pubkey::create_program_address(
            seed,
            program_id,
        )?;

        if *vault_pda.key != vault_pub {
            msg!("Vault account doesn't match with pubkey from state.");
            return Err(CustomError::WrongVault.into());
        }

        Ok(())
    }
    pub fn check_vault(&self, program_id: &Pubkey, vault_pda: &AccountInfo) -> ProgramResult {
        self.check_vault_with_seed(program_id, vault_pda, &[&self.owner.to_bytes(), VAULT, &[self.vault_bump]])
    }
}

#[test]
fn test_save_to() {
    let owner = Pubkey::new_unique();
    println!("Owner: {:?}", owner.to_bytes());
    let signer = [0; 33];
    println!("Signer: {:?}", signer);
    let payment_ata = Pubkey::new_unique();
    println!("Payment: {:?}", payment_ata.to_bytes());

    let state = State {
        version: StateVersion::Version4,
        id: 42,
        owner,
        total_supply: 0,
        max_supply: 100,
        begin_ts: 1,
        end_ts: 2,
        name: "DLS 1".to_string(),
        signer,
        vault_bump: 255,
        prices: vec!(Price { amount: 123, ata: Pubkey::new_unique() }),
        base_url: "https://example.com/".to_string(),
        withdraw_counter: 0,
    };

    let mut buf: Vec<u8> = Vec::with_capacity(State::MAX_STATE_SIZE);

    state.serialize(&mut buf).unwrap();

    println!("Result: {:?}", buf);
}