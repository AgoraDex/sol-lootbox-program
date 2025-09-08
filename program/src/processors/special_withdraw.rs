use std::slice::Iter;

use solana_program::account_info::{next_account_info, AccountInfo};
use solana_program::entrypoint::ProgramResult;
use solana_program::hash::Hasher;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::pubkey::Pubkey;
use spl_associated_token_account::instruction::create_associated_token_account;
use spl_token::instruction::transfer;

use crate::error::CustomError;
use crate::instruction::SpecialWithdrawParam;
use crate::state::{State, VAULT};
use crate::verify::verify_signature;

pub fn special_withdraw<'a>(program_id: &Pubkey,
                    owner: &AccountInfo<'a>,
                    params: &SpecialWithdrawParam,
                    state_pda: &AccountInfo<'a>,
                    vault_pda: &AccountInfo<'a>,
                    system_program: &AccountInfo<'a>,
                    spl_program: &AccountInfo<'a>,
                    accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {
    if !owner.is_signer {
        msg!("Receiver must be signer.");
        return Err(CustomError::WrongSigner.into());
    }

    let mut state = State::verify_and_load(program_id, state_pda, params.lootbox_id, None)?;

    let vault_seed = [&state.owner.to_bytes(), VAULT, &[state.vault_bump]];

    state.check_vault_with_seed(program_id, vault_pda, &vault_seed)?;

    let mut hasher = Hasher::default();

    msg!("Check {} tickets.", params.tickets.len());
    check_tickets(&mut state, &params.tickets, &mut hasher)?;
    msg!("Transfer {} rewards.", params.amounts.len());
    transfer_tokens(owner, &params.amounts, accounts_iter, &mut hasher, vault_pda, system_program, spl_program, &vault_seed)?;

    // NOTE: the same vault MUST NOT be used for the same lootbox!
    hasher.hash(&vault_pda.key.to_bytes());
    hasher.hash(&owner.key.to_bytes());
    hasher.hash(&params.expire_at.to_be_bytes());

    let message_hash = hasher.result();

    verify_signature(&message_hash, params.expire_at, &params.signature, &state)?;

    state.withdraw_counter += params.tickets.len() as u32;
    state.save_to(state_pda)?;

    Ok(())
}

fn check_tickets<'a>(state: &mut State, tickets: &Vec<u16>, hasher: &mut Hasher) -> ProgramResult {
    for ticket in tickets.iter() {
        hasher.hash(&ticket.to_be_bytes());

        if state.special_withdraw_lookup_or_insert(*ticket)? {
            msg!("Ticket {} already withdrawn.", *ticket);
            return Err(CustomError::TicketAlreadyWithdrawn.into());
        }
    }

    Ok(())
}

fn transfer_tokens<'a>(owner: &AccountInfo<'a>,
                       amounts: &Vec<u64>,
                       accounts_iter: &mut Iter<AccountInfo<'a>>,
                       hasher: &mut Hasher,
                       vault_pda: &AccountInfo<'a>,
                       system_program: &AccountInfo<'a>,
                       spl_program: &AccountInfo<'a>,
                       seed: &[&[u8]],
) -> ProgramResult {
    for amount in amounts {
        let token_mint = next_account_info(accounts_iter)?;
        hasher.hash(&token_mint.key.to_bytes());
        hasher.hash(&amount.to_be_bytes());

        let source_ata = next_account_info(accounts_iter)?;
        let destination_ata = next_account_info(accounts_iter)?;

        if destination_ata.data_is_empty() {
            invoke_signed(
                &create_associated_token_account(
                    destination_ata.key,
                    owner.key,
                    token_mint.key,
                    spl_program.key,
                ),
                &[
                    owner.clone(),
                    destination_ata.clone(),
                    owner.clone(),
                    token_mint.clone(),
                    system_program.clone(),
                    spl_program.clone(),
                ],
                &[],
            )?;
        }

        invoke_signed(
            &transfer(
                spl_program.key,
                source_ata.key,
                destination_ata.key,
                vault_pda.key,
                &[],
                *amount,
            )?,
            &[
                source_ata.clone(),
                destination_ata.clone(),
                vault_pda.clone(),
                spl_program.clone(),
            ],
            &[seed],
        )?;
    }
    Ok(())
}