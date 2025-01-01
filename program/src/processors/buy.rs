use std::convert::Into;

use mpl_token_metadata::instructions::CreateV1CpiBuilder;
use mpl_token_metadata::programs::MPL_TOKEN_METADATA_ID;
use mpl_token_metadata::types::{Creator, PrintSupply, TokenStandard};
use solana_program::{msg, system_program};
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use spl_token::instruction::mint_to;

use crate::error::CustomError;
use crate::state::{State, VAULT};

pub fn buy<'a>(program_id: &Pubkey,
               buyer: &AccountInfo<'a>,
               state_pda: &AccountInfo<'a>,
               invoice_pda: &AccountInfo<'a>,
               vault_pda: &AccountInfo<'a>,
               destination_ata: &AccountInfo<'a>,
               token_account: &AccountInfo<'a>,
               metadata_pda: &AccountInfo<'a>,
               master_pda: &AccountInfo<'a>,
               system_program: &AccountInfo<'a>,
               sysvar_program: &AccountInfo<'a>,
               spl_program: &AccountInfo<'a>,
               mpl_program: &AccountInfo<'a>,
               count: u8,
) -> ProgramResult {
    if !buyer.is_signer {
        msg!("Buyer must be signer.");
        return Err(CustomError::WrongSigner.into());
    }

    if !State::if_initialized(state_pda) {
        msg!("State is not properly initialized.");
        return Err(CustomError::StateNotInitialized.into());
    }

    let mut state = State::load_from(state_pda)?;

    if state.total_supply == state.max_supply {
        msg!("state.total_supply == state.max_supply");
        return Err(CustomError::MaxSupplyReached.into());
    }

    let vault_pub = Pubkey::create_program_address(
        &[&state.owner.to_bytes(), VAULT, &[state.vault_bump]],
        program_id
    )?;

    if *vault_pda.key != vault_pub {
        msg!("Vault account doesn't match with pubkey from state.");
        return Err(CustomError::WrongVault.into());
    }

    let available = invoice_pda.lamports();
    let required = state.price * count as u64;

    if required > available {
        msg!("Invoice account doesn't have enough funds, required {required}.",);
        return Err(ProgramError::InsufficientFunds);
    }

    mint_token(&state, buyer, token_account,
               metadata_pda, master_pda, destination_ata, system_program, sysvar_program,
               spl_program, mpl_program, vault_pda)?;

    **invoice_pda.lamports.borrow_mut() -= required;
    **vault_pda.lamports.borrow_mut() += required;

    state.total_supply += count as u32;
    state.save_to(state_pda)?;

    Ok(())
}

fn mint_token<'a>(state: &State,
              payer: &AccountInfo<'a>,
              mint: &AccountInfo<'a>,
              metadata_pda: &AccountInfo<'a>,
              master_pda: &AccountInfo<'a>,
              destination_ata: &AccountInfo<'a>,
              system_program: &AccountInfo<'a>,
              sysvar_instructions: &AccountInfo<'a>,
              spl_program: &AccountInfo<'a>,
              mpl_program: &AccountInfo<'a>,
              vault: &AccountInfo<'a>,
) -> ProgramResult {
    let seed = [&state.owner.to_bytes(), VAULT, &[state.vault_bump]];

    if !spl_token::check_id(spl_program.key) {
        msg!("Wrong SPL token program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !system_program::check_id(system_program.key) {
        msg!("Wrong SystemProgram id");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !MPL_TOKEN_METADATA_ID.eq(mpl_program.key) {
        msg!("Wrong MPL token program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    msg!("Mint spl token.");

    invoke_signed(
        &mint_to(
            spl_program.key,
            mint.key,
            destination_ata.key,
            vault.key,
            &[],
            1, // amount of minting tokens
        )?,
        &[
            spl_program.clone(),
            mint.clone(),
            destination_ata.clone(),
            vault.clone(),
        ],
        &[
            &seed
        ],
    )?;

    // let metadata_pda = Metadata::find_pda(mint.key).0;
    // let master_edition_pda = MasterEdition::find_pda(mint.key).0;

    let uri = String::new() + &state.base_url + &mint.key.to_string();
    let name = String::new() + &state.name + &state.total_supply.to_string();

    msg!("Create mpl metadata.");

    CreateV1CpiBuilder::new(mpl_program)
        .metadata(metadata_pda)
        .master_edition(Some(master_pda))
        .payer(payer)
        .system_program(system_program)
        .authority(vault)
        .update_authority(vault, true)
        .print_supply(PrintSupply::Zero)
        .seller_fee_basis_points(600)
        .uri(uri)
        .name(name)
        .symbol(state.name.clone())
        .is_mutable(false)
        .mint(mint, false)
        .creators(vec![Creator {
            address: *vault.key,
            verified: true,
            share: 100,
        }])
        // .master_edition(Some(master_edition_pda))
        .decimals(0)
        .token_standard(TokenStandard::NonFungible)
        .spl_token_program(Some(spl_program))
        .sysvar_instructions(sysvar_instructions)
        .invoke_signed(&[&seed])?;

    // msg!("Lock the NFT 2.");
    //
    // // transfer ownership to None - lock the NFT
    // invoke_signed(
    //     &transfer_authority(
    //         mint.key,
    //         authority_pda.key,
    //         None
    //     ),
    //     &[
    //         token_program.clone(),
    //         mint.clone(),
    //         ata.clone(),
    //         authority_pda.clone(),
    //     ],
    //     &[
    //         &authority_seed
    //     ]
    // )?;

    Ok(())
}