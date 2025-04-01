use crate::error::CustomError;
use crate::instruction::ObtainTicketParams;
use crate::nft::mint_token;
use crate::state::{State, TICKET, VAULT};
use crate::verify::verify_signature;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::hash::Hasher;
use solana_program::msg;
use solana_program::pubkey::Pubkey;

pub fn obtain_ticket<'a>(program_id: &Pubkey,
                         buyer: &AccountInfo<'a>,
                         params: ObtainTicketParams,
                         destination_ata: &AccountInfo<'a>,
                         state_pda: &AccountInfo<'a>,
                         vault_pda: &AccountInfo<'a>,
                         ticket_mint_pda: &AccountInfo<'a>,
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

    let message_hash = {
        let mut hasher = Hasher::default();
        // TODO: think is it good idea, maybe state is better, because the same vault might be used for multiple lootboxes
        hasher.hash(&vault_pda.key.to_bytes());
        hasher.hash(&buyer.key.to_bytes());
        hasher.hash(&params.id.to_be_bytes());
        hasher.hash(&params.expire_at.to_be_bytes());
        hasher.result()
    };

    verify_signature(&message_hash, params.expire_at, &params.signature, &state)?;

    let ticket_seed = [&state.owner.to_bytes(), TICKET, &params.id.to_be_bytes(), &[params.bump]];

    mint_token(&state, buyer, ticket_mint_pda,
               metadata_pda, master_pda, destination_ata, system_program, sysvar_program,
               spl_program, mpl_program, ata_program, vault_pda, Some(&ticket_seed))?;

    state.total_supply += 1;
    state.save_to(state_pda)?;

    Ok(())
}