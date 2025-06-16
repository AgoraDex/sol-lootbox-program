use solana_program::account_info::{next_account_info, AccountInfo};
use solana_program::clock::Clock;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::sysvar::Sysvar;
use spl_token::instruction::transfer;
use std::convert::Into;
use std::slice::Iter;

use crate::error::CustomError;
use crate::instruction::BuyParam;
use crate::state::State;
use crate::ticket::Ticket;

pub fn buy<'a>(program_id: &Pubkey,
               buyer: &AccountInfo<'a>,
               buyer_ata: &AccountInfo<'a>,
               payment_ata: &AccountInfo<'a>,
               state_pda: &AccountInfo<'a>,
               vault_pda: &AccountInfo<'a>,
               system_program: &AccountInfo<'a>,
               spl_program: &AccountInfo<'a>,
               params: &BuyParam,
               accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {
    if !buyer.is_signer {
        msg!("Buyer must be signer.");
        return Err(CustomError::WrongSigner.into());
    }

    let mut state = State::verify_and_load(program_id,  state_pda, params.lootbox_id, None)?;

    let count = state.check_and_get_correct_count(params.ticket_bumps.len() as u8)?;
    state.check_vault(program_id, vault_pda)?;
    state.check_time(&Clock::get()?)?;

    accept_payment(
        &state,
        buyer,
        buyer_ata,
        payment_ata,
        spl_program,
        count,
    )?;

    { // walk through tickets
        let mut issue_index = state.total_supply;
        let mut index = 0;
        for ticket_bump in &params.ticket_bumps {
            let ticket_pda = next_account_info(accounts_iter)?;

            Ticket::verify_and_create(
                program_id,
                system_program,
                buyer,
                params.lootbox_id,
                params.ticket_seed,
                index,
                issue_index,
                ticket_pda,
                Some(*ticket_bump),
                None,
            )?;

            issue_index += 1;
            index += 1;
        }
    }

    state.total_supply += count as u32;
    state.save_to(state_pda)?;

    Ok(())
}

fn accept_payment<'a>(
    state: &State,
    buyer: &AccountInfo<'a>,
    buyer_ata: &AccountInfo<'a>,
    payment_ata: &AccountInfo<'a>,
    spl_program: &AccountInfo<'a>,
    count: u8,
) -> ProgramResult {
    let amount = state.find_price(payment_ata)?;
    let total: u64 = amount * count as u64;

    if !spl_token::check_id(spl_program.key) {
        msg!("Wrong SPL token program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    if total < amount {
        msg!("Wrong amount or prize {}", total);
        return Err(CustomError::WrongPriceOrCount.into());
    }

    msg!("Withdrawing payment for {} tickets: {}", count, total);

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