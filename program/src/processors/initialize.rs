use std::convert::Into;
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
use crate::state::{State, STATE_SEED, StateVersion, VAULT};

pub fn initialize<'a>(program_id: &Pubkey,
                      admin: &AccountInfo<'a>,
                      price: u64,
                      payment_ata: &AccountInfo<'a>,
                      vault_pda: &AccountInfo<'a>,
                      vault_bump: u8,
                      state_pda: &AccountInfo<'a>,
                      state_bump: u8,
                      max_supply: u32,
                      name: &str,
                      signer: [u8; 33],
                      system_account: &AccountInfo<'a>,
                      base_url: String,
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
    create_state(program_id, admin, price, state_pda, state_bump, max_supply, name, signer,
                 system_account, vault_bump, base_url, payment_ata)?;

    Ok(())
}

fn create_vault<'a>(program_id: &Pubkey,
                    admin: &AccountInfo<'a>,
                    vault_pda: &AccountInfo<'a>,
                    vault_bump: u8,
                    system_account: &AccountInfo<'a>) -> ProgramResult {
    let seed = [admin.key.as_ref(), VAULT, &[vault_bump]];

    let vault = &Pubkey::create_program_address(&seed, program_id)?;

    if vault_pda.key != vault {
        msg!("The vault key mismatch, seed is {:?}", seed);
        return Err(ProgramError::InvalidSeeds);
    }

    if !vault_pda.data_is_empty() || vault_pda.lamports() > 0 {
        msg!("Vault account has already been created.");
        return Ok(());
    }

    let rent = Rent::get()?.minimum_balance(0);

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

fn create_state<'a>(program_id: &Pubkey,
                    admin: &AccountInfo<'a>,
                    price: u64,
                    state_pda: &AccountInfo<'a>,
                    state_bump: u8,
                    max_supply: u32,
                    name: &str,
                    signer: [u8; 33],
                    system_account: &AccountInfo<'a>,
                    vault_bump: u8,
                    base_url: String,
                    payment_ata: &AccountInfo) -> ProgramResult {
    let seed = [&admin.key.to_bytes(), STATE_SEED, &[state_bump]];
    let state_pub = &Pubkey::create_program_address(&seed, program_id)?;

    if state_pda.key != state_pub {
        msg!("The state key mismatch, seed is {:?}", seed);
        return Err(ProgramError::InvalidSeeds);
    }

    let state = State {
        version: StateVersion::Version1,
        total_supply: 0,
        max_supply,
        owner: *admin.key,
        name: name.to_string(),
        signer,
        price,
        vault_bump,
        base_url,
        payment_ata: *payment_ata.key,
        first_index: 0,
    };
    let len = state.serialized_len()?;
    let lamports = Rent::get()?.minimum_balance(len + 1024);

    invoke_signed(
        &create_account(
            admin.key,
            state_pub,
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
