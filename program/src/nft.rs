use mpl_token_metadata::instructions::{CreateV1CpiBuilder, MintCpiBuilder};
use mpl_token_metadata::programs::MPL_TOKEN_METADATA_ID;
use mpl_token_metadata::types::{Creator, MintArgs, PrintSupply, TokenStandard};
use solana_program::{msg, system_program};
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;

use crate::state::{State, VAULT};

pub fn mint_token<'a>(state: &State,
                      payer: &AccountInfo<'a>,
                      mint: &AccountInfo<'a>,
                      metadata_pda: &AccountInfo<'a>,
                      master_pda: &AccountInfo<'a>,
                      destination_ata: &AccountInfo<'a>,
                      system_program: &AccountInfo<'a>,
                      sysvar_instructions: &AccountInfo<'a>,
                      spl_program: &AccountInfo<'a>,
                      mpl_program: &AccountInfo<'a>,
                      ata_program: &AccountInfo<'a>,
                      vault: &AccountInfo<'a>,
                      extra_seed: Option<&[&[u8]]>,
) -> ProgramResult {
    let vault_seed = [&state.owner.to_bytes(), VAULT, &[state.vault_bump]];

    // let seed = if extra_seed.is_some() { [&vault_seed[..]][..] } else { [&vault_seed[..], &extra_seed.unwrap()][..]};
    let mut seed = vec!(&vault_seed[..]);
    if extra_seed.is_some() {
        seed.push(extra_seed.unwrap());
    }

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

    // invoke_signed(
    //     &mint_to(
    //         spl_program.key,
    //         mint.key,
    //         destination_ata.key,
    //         vault.key,
    //         &[],
    //         1, // amount of minting tokens
    //     )?,
    //     &[
    //         spl_program.clone(),
    //         mint.clone(),
    //         destination_ata.clone(),
    //         vault.clone(),
    //     ],
    //     &[
    //         &seed
    //     ],
    // )?;

    let uri = String::new() + &state.base_url + &mint.key.to_string();
    let name = String::new() + &state.name + " #" + &state.total_supply.to_string();

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
        // .is_mutable(false)
        .mint(mint, true)
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
        .invoke_signed(&seed)?;

    msg!("Mint token.");

    MintCpiBuilder::new(mpl_program)
        .payer(payer)
        .mint(mint)
        .metadata(metadata_pda)
        .master_edition(Some(master_pda))
        .system_program(system_program)
        .authority(vault)
        .token(destination_ata)
        .token_owner(Some(payer))
        .spl_token_program(spl_program)
        .sysvar_instructions(sysvar_instructions)
        .mint_args(MintArgs::V1 {amount: 1, authorization_data: None})
        .spl_ata_program(ata_program)
        .invoke_signed(&seed)?;

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