use std::convert::Into;

use solana_program::account_info::AccountInfo;
use solana_program::clock::Clock;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use spl_token::instruction::transfer;
use solana_program::sysvar::Sysvar;

use crate::error::CustomError;
use crate::nft::mint_token;
use crate::state::State;

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
               lootbox_id: u16,
) -> ProgramResult {
    if !buyer.is_signer {
        msg!("Buyer must be signer.");
        return Err(CustomError::WrongSigner.into());
    }

    let mut state = State::verify_and_load(program_id,  state_pda, lootbox_id, None)?;

    state.check_supply()?;
    state.check_vault(program_id, vault_pda)?;
    state.check_time(&Clock::get()?)?;

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

    let amount = state.find_price(payment_ata)?;

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
            amount,
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