use std::convert::Into;

use borsh::BorshSerialize;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::system_instruction::create_account;
use solana_program::sysvar::rent::Rent;
use solana_program::sysvar::Sysvar;
use crate::error::CustomError;
use crate::state::{State, StateVersion};

const VAULT: &[u8] = b"vault";
const STATE: &[u8] = b"state";

pub fn initialize<'a>(program_id: &Pubkey,
                      admin: &AccountInfo<'a>,
                      vault_pda: &AccountInfo<'a>,
                      vault_bump: u8,
                      state_pda: &AccountInfo<'a>,
                      state_bump: u8,
                      max_supply: u32,
                      name: &str,
                      signer: &Pubkey,
                      system_account: &AccountInfo<'a>,
) -> ProgramResult {
    if !admin.is_signer {
        return Err(CustomError::WrongSigner.into());
    }

    if vault_pda.is_signer || state_pda.is_signer {
        return Err(CustomError::PdaCannotBeSigner.into());
    }

    msg!("Creating vault.");
    create_vault(program_id, admin, vault_pda, vault_bump, system_account)?;

    msg!("Initializing state.");
    create_state(program_id, admin, state_pda, state_bump, max_supply, name, signer, system_account)?;

    Ok(())
}

fn create_vault<'a>(program_id: &Pubkey, admin: &AccountInfo<'a>, vault_pda: &AccountInfo<'a>, vault_bump: u8, system_account: &AccountInfo<'a>) -> ProgramResult {
    let rent = Rent::get()?
        .minimum_balance(0);

    let seed = [admin.key.as_ref(), VAULT, &[vault_bump]];

    let vault = &Pubkey::create_program_address(&seed, program_id)?;

    if vault_pda.key != vault {
        msg!("The vault key mismatch, seed is {:?}", seed);
        return Err(ProgramError::InvalidSeeds);
    }

    invoke_signed(
        &create_account(
            admin.key,
            vault,
            rent,
            0,
            program_id,
        ),
        &[admin.clone(), vault_pda.clone(), system_account.clone()],
        &[
            &seed
        ],
    )?;

    Ok(())
}

fn create_state<'a>(program_id: &Pubkey, admin: &AccountInfo<'a>, state_pda: &AccountInfo<'a>, state_bump: u8, max_supply: u32, name: &str, signer: &Pubkey, system_account: &AccountInfo<'a>) -> ProgramResult {
    let seed = [&admin.key.to_bytes(), STATE, &[state_bump]];
    let state_account = &Pubkey::create_program_address(&seed, program_id)?;

    let rent = Rent::get()?;
    let state = State {
        version: StateVersion::Version1,
        total_supply: 0,
        max_supply,
        owner: *admin.key,
        name: name.to_string(),
        signer: *signer,
    };
    let len = state.serialized_len()?;
    let lamports = rent.minimum_balance(len);
    invoke_signed(
        &create_account(
            admin.key,
            state_account,
            lamports,
            len as u64,
            program_id,
        ),
        &[admin.clone(), state_pda.clone(), system_account.clone()],
        &[
            &seed
        ],
    )?;

    if State::if_initialized(state_pda) {
        return Err(CustomError::StateAlreadyInitialized.into());
    }

    state.save_to(state_pda)?;

    Ok(())
}
