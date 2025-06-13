use std::convert::Into;
use std::slice::Iter;
use solana_program::account_info::{next_account_info, AccountInfo};
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::system_instruction::create_account;
use solana_program::sysvar::rent::Rent;
use solana_program::sysvar::Sysvar;
use crate::error::CustomError;
use crate::instruction::InitializeParams;
use crate::state::{State, STATE_SEED, StateVersion, VAULT, Price};

pub fn initialize<'a>(program_id: &Pubkey,
                      admin: &AccountInfo<'a>,
                      vault_pda: &AccountInfo<'a>,
                      state_pda: &AccountInfo<'a>,
                      system_account: &AccountInfo<'a>,
                      params: &InitializeParams,
                      accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {
    if !admin.is_signer {
        return Err(CustomError::WrongSigner.into());
    }

    if vault_pda.is_signer || state_pda.is_signer {
        return Err(CustomError::PdaCannotBeSigner.into());
    }

    msg!("Creating vault.");
    create_vault(program_id, admin, vault_pda, params.vault_bump, system_account)?;

    msg!("Initializing state.");
    create_state(program_id, admin, state_pda, system_account, params, accounts_iter)?;

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
                    state_pda: &AccountInfo<'a>,
                    system_account: &AccountInfo<'a>,
                    params: &InitializeParams,
                    accounts_iter: &mut Iter<AccountInfo<'a>>,
                    ) -> ProgramResult {
    msg!("Get state address using id {} and bump {}", params.lootbox_id, params.state_bump);
    let seed = [admin.key.as_ref(), STATE_SEED, &params.lootbox_id.to_be_bytes(), &[params.state_bump]];
    let state_pub = &Pubkey::create_program_address(&seed, program_id)?;

    if state_pda.key != state_pub {
        msg!("The state key mismatch, seed is {:?}", seed);
        return Err(ProgramError::InvalidSeeds);
    }

    if State::if_initialized(state_pda) {
        return Err(CustomError::StateAlreadyInitialized.into());
    }

    msg!("Build prices set");
    let mut prices: Vec<Price> = Vec::with_capacity(params.prices.len());
    for amount in &params.prices {
        let account = next_account_info(accounts_iter)?;
        prices.push(Price {
            amount: *amount,
            ata: *account.key,
        });
    }

    let state = State {
        version: StateVersion::Version4,
        id: params.lootbox_id,
        total_supply: 0,
        max_supply: params.max_supply,
        begin_ts: params.begin_ts,
        end_ts: params.end_ts,
        owner: *admin.key,
        name: params.name.clone(),
        signer: params.signer,
        prices,
        vault_bump: params.vault_bump,
        base_url: params.base_url.clone(),
        withdraw_counter: 0,
    };
        let lamports = Rent::get()?.minimum_balance(State::MAX_STATE_SIZE);

    invoke_signed(
        &create_account(
            admin.key,
            state_pub,
            lamports,
            State::MAX_STATE_SIZE as u64,
            program_id,
        ),
        &[admin.clone(), state_pda.clone(), system_account.clone()],
        &[
            &seed
        ],
    )?;


    state.save_to(state_pda)?;

    Ok(())
}
