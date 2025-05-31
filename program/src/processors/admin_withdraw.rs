use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::pubkey::Pubkey;
use spl_token::instruction::transfer;

use crate::error::CustomError;
use crate::state::{State, VAULT};

pub fn admin_withdraw<'a>(program_id: &Pubkey,
                          lootbox_id: u16,
                          admin: &AccountInfo<'a>,
                          state_pda: &AccountInfo<'a>,
                          vault_pda: &AccountInfo<'a>,
                          source_ata: &AccountInfo<'a>,
                          destination_ata: &AccountInfo<'a>,
                          spl_program: &AccountInfo<'a>,
                          amount: u64,
) -> ProgramResult {
    if !admin.is_signer {
        msg!("Admin is not signer.");
        return Err(CustomError::WrongSigner.into());
    }

    let state = State::verify_and_load(program_id, state_pda, lootbox_id, None)?;

    if state.owner != *admin.key {
        msg!("Admin doesn't own the state.");
        return Err(CustomError::WrongAdminAccount.into());
    }

    let vault_seed = [&state.owner.to_bytes(), VAULT, &[state.vault_bump]];

    state.check_vault_with_seed(program_id, vault_pda, &vault_seed)?;

    invoke_signed(
        &transfer(
            spl_program.key,
            source_ata.key,
            destination_ata.key,
            vault_pda.key,
            &[],
            amount,
        )?,
        &[
            source_ata.clone(),
            destination_ata.clone(),
            vault_pda.clone(),
            spl_program.clone(),
        ],
        &[&vault_seed],
    )?;

    Ok(())
}
