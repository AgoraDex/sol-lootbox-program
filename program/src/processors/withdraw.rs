use std::slice::Iter;

use mpl_token_metadata::instructions::{BurnCpi, BurnCpiBuilder, BurnInstructionArgs};
use mpl_token_metadata::types::BurnArgs;
use solana_program::account_info::{next_account_info, AccountInfo};
use solana_program::entrypoint::ProgramResult;
use solana_program::hash::Hasher;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::pubkey::Pubkey;
use spl_token::instruction::transfer;

use crate::error::CustomError;
use crate::instruction::WithdrawParam;
use crate::state::{State, VAULT};
use crate::verify::verify_signature;

pub fn withdraw<'a>(program_id: &Pubkey,
                    receiver: &AccountInfo<'a>,
                    params: &WithdrawParam,
                    state_pda: &AccountInfo<'a>,
                    vault_pda: &AccountInfo<'a>,
                    system_program: &AccountInfo<'a>,
                    sysvar_program: &AccountInfo<'a>,
                    spl_program: &AccountInfo<'a>,
                    mpl_program: &AccountInfo<'a>,
                    accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {
    if !receiver.is_signer {
        msg!("Receiver must be signer.");
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

    let vault_pub = Pubkey::create_program_address(
        &[&state.owner.to_bytes(), VAULT, &[state.vault_bump]],
        program_id,
    )?;

    if *vault_pda.key != vault_pub {
        msg!("Vault account doesn't match with pubkey from state.");
        return Err(CustomError::WrongVault.into());
    }

    let mut hasher = Hasher::default();
    let vault_seed = [&state.owner.to_bytes(), VAULT, &[state.vault_bump]];

    burn_tickets(receiver, params.tickets, accounts_iter, &mut hasher, vault_pda, system_program, sysvar_program, spl_program, mpl_program, &vault_seed)?;
    transfer_tokens(&params.amounts, accounts_iter, &mut hasher, vault_pda, spl_program, &vault_seed)?;

    // TODO: think is it good idea, maybe state is better, because the same vault might be used for multiple lootboxes
    hasher.hash(&vault_pda.key.to_bytes());
    hasher.hash(&receiver.key.to_bytes());
    hasher.hash(&params.expire_at.to_be_bytes());

    let message_hash = hasher.result();

    verify_signature(&message_hash, params.expire_at, &params.signature, &state)?;

    state.withdraw_counter += params.tickets as u32;
    state.save_to(state_pda)?;

    Ok(())
}

fn burn_tickets<'a>(receiver: &AccountInfo<'a>,
                    count: u8,
                    accounts_iter: &mut Iter<AccountInfo<'a>>,
                    hasher: &mut Hasher,
                    _vault_pda: &AccountInfo<'a>, // TODO: will be used later
                    system_program: &AccountInfo<'a>,
                    sysvar_program: &AccountInfo<'a>,
                    spl_program: &AccountInfo<'a>,
                    mpl_program: &AccountInfo<'a>,
                    seed: &[&[u8]],
) -> ProgramResult {
    for i in 0..count {
        let ticket_mint = next_account_info(accounts_iter)?;
        hasher.hash(&ticket_mint.key.to_bytes());

        let ata = next_account_info(accounts_iter)?;
        let metadata = next_account_info(accounts_iter)?;
        let mater_edition = next_account_info(accounts_iter)?;

        // do not use heap too much
        let burn_instruction = BurnCpi {
            edition: Some(mater_edition),
            system_program,
            sysvar_instructions: sysvar_program,
            authority: receiver,
            spl_token_program: spl_program,
            metadata,
            mint: ticket_mint,
            token: ata,
            master_edition: None,
            master_edition_mint: None,
            master_edition_token: None,
            edition_marker: None,
            __args: BurnInstructionArgs {
                burn_args: BurnArgs::V1 {amount: 1}
            },
            __program: mpl_program,
            collection_metadata: None,
            token_record: None,
        };

        burn_instruction.invoke_signed(&[seed])?;
        //
        // BurnCpiBuilder::new(mpl_program)
        //     .spl_token_program(spl_program)
        //     .authority(receiver)
        //     .burn_args(BurnArgs::V1 {amount: 1})
        //     .sysvar_instructions(sysvar_program)
        //     .system_program(system_program)
        //     .mint(ticket_mint)
        //     .token(ata)
        //     .metadata(metadata)
        //     .edition(Some(mater_edition))
        //     .invoke_signed(&[seed])?;

        // invoke_signed(
        //     &close_account(
        //         spl_program.key,
        //         ticket_mint.key,
        //         receiver.key,
        //         vault_pda.key,
        //         &[]
        //     )?,
        //     &[ticket_mint.clone(), receiver.clone(), vault_pda.clone(), spl_program.clone()],
        //     &[seed],
        // )?;
    }

    Ok(())
}

fn transfer_tokens<'a>(amounts: &Vec<u64>,
                       accounts_iter: &mut Iter<AccountInfo<'a>>,
                       hasher: &mut Hasher,
                       vault_pda: &AccountInfo<'a>,
                       spl_program: &AccountInfo<'a>,
                       seed: &[&[u8]],
) -> ProgramResult {
    for amount in amounts {
        let token_mint = next_account_info(accounts_iter)?;
        hasher.hash(&token_mint.key.to_bytes());
        hasher.hash(&amount.to_be_bytes());

        let source_ata = next_account_info(accounts_iter)?;
        let destination_ata = next_account_info(accounts_iter)?;

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