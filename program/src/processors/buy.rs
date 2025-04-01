use std::convert::Into;

use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use spl_token::instruction::transfer;

use crate::error::CustomError;
use crate::nft::mint_token;
use crate::state::{State, VAULT};

pub fn buy<'a>(program_id: &Pubkey,
               buyer: &AccountInfo<'a>,
               buyer_ata: &AccountInfo<'a>,
               payment_ata: &AccountInfo<'a>,
               destination_ata: &AccountInfo<'a>,
               state_pda: &AccountInfo<'a>,
               vault_pda: &AccountInfo<'a>,
               ticket_mint: &AccountInfo<'a>,
               metadata_pda: &AccountInfo<'a>,
               master_pda: &AccountInfo<'a>,
               system_program: &AccountInfo<'a>,
               sysvar_program: &AccountInfo<'a>,
               spl_program: &AccountInfo<'a>,
               mpl_program: &AccountInfo<'a>,
               ata_program: &AccountInfo<'a>,
) -> ProgramResult {
    if !buyer.is_signer {
        msg!("Buyer must be signer.");
        return Err(CustomError::WrongSigner.into());
    }

    if !State::if_initialized(state_pda) {
        msg!("State is not properly initialized.");
        return Err(CustomError::StateNotInitialized.into());
    }

    if !State::is_version_correct(state_pda) {
        msg!("State has wrong version.");
        return Err(CustomError::StateWrongVersion.into());
    }

    let mut state = State::load_from(state_pda)?;

    if state.total_supply == state.max_supply {
        msg!("state.total_supply == state.max_supply");
        return Err(CustomError::MaxSupplyReached.into());
    }

    let vault_pub = Pubkey::create_program_address(
        &[&state.owner.to_bytes(), VAULT, &[state.vault_bump]],
        program_id,
    )?;

    if *vault_pda.key != vault_pub {
        msg!("Vault account doesn't match with pubkey from state.");
        return Err(CustomError::WrongVault.into());
    }

    accept_payment(
        &state,
        buyer,
        buyer_ata,
        payment_ata,
        spl_program,
    )?;

    mint_token(
        &state,
        buyer,
        ticket_mint,
        metadata_pda,
        master_pda,
        destination_ata,
        system_program,
        sysvar_program,
        spl_program,
        mpl_program,
        ata_program,
        vault_pda,
        None,
    )?;

    state.total_supply += 1;
    state.save_to(state_pda)?;

    Ok(())
}

fn accept_payment<'a>(
    state: &State,
    buyer: &AccountInfo<'a>,
    buyer_ata: &AccountInfo<'a>,
    payment_ata: &AccountInfo<'a>,
    spl_program: &AccountInfo<'a>,
) -> ProgramResult {
    // let seed = [&state.owner.to_bytes(), VAULT, &[state.vault_bump]];

    if state.payment_ata != *payment_ata.key {
        msg!("wrong payment_ata value");
        return Err(CustomError::WrongPaymentAta.into());
    }

    if !spl_token::check_id(spl_program.key) {
        msg!("Wrong SPL token program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    msg!("Accept payment.");

    invoke_signed(
        &transfer(
            spl_program.key,
            buyer_ata.key,
            payment_ata.key,
            buyer.key,
            &[],
            state.price,
        )?,
        &[
            buyer_ata.clone(),
            payment_ata.clone(),
            buyer.clone(),
            spl_program.clone(),
        ],
        &[],
    )?;

    Ok(())
}