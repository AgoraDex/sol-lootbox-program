use solana_program::account_info::AccountInfo;
use solana_program::clock::Clock;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::pubkey::Pubkey;
use solana_program::secp256k1_recover::secp256k1_recover;
// use solana_program::keccak::Hasher;
use solana_program::hash::Hasher;
use solana_program::sysvar::Sysvar;
use crate::error::CustomError;
use crate::instruction::{ObtainTicketParams, Signature};
use crate::nft::mint_token;
use crate::state::{State, TICKET, VAULT};

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

    verify_signature(buyer, params.id, params.expire_at, &params.signature, &state, vault_pda)?;

    let ticket_seed = [&state.owner.to_bytes(), TICKET, &params.id.to_be_bytes(), &[params.bump]];

    mint_token(&state, buyer, ticket_mint_pda,
               metadata_pda, master_pda, destination_ata, system_program, sysvar_program,
               spl_program, mpl_program, ata_program, vault_pda, Some(&ticket_seed))?;

    state.max_supply += 1;
    state.save_to(state_pda)?;

    Ok(())
}

fn verify_signature(buyer: &AccountInfo,
                    ticket_id: u32,
                    expire_at: u32,
                    signature: &Signature,
                    state: &State,
                    vault_pda: &AccountInfo,
) -> ProgramResult {

    let clock = Clock::get()?;
    if clock.unix_timestamp > expire_at as i64 {
        msg!("Signature expired {}", clock.unix_timestamp);
        return Err(CustomError::SignatureExpired.into());
    }

    let message_hash = {
        let mut hasher = Hasher::default();
        // TODO: think is it good idea, maybe state is better, because the same vault might be used for multiple lootboxes
        hasher.hash(&vault_pda.key.to_bytes());
        hasher.hash(&buyer.key.to_bytes());
        hasher.hash(&ticket_id.to_be_bytes());
        hasher.hash(&expire_at.to_be_bytes());
        hasher.result()
    };


    let recovered = secp256k1_recover(&message_hash.to_bytes(), signature.rec_id, &signature.rs).map_err(|e| {
        msg!("Recovery error: {}", e);
        CustomError::SignatureVerificationFailed
    })?;

    // recovery returns XY coordinates
    // but compressed public key from secp256k1 keeps only X coordinate and Y parity
    let xy = recovered.to_bytes();
    let y_parity = if xy[63] & 1 != 0 { 0x03 } else { 0x02 } as u8;
    if xy[0..31] != state.signer[1..32] || y_parity != state.signer[0] {
        msg!("Hash was: {:?}", message_hash.to_bytes());
        msg!("Signature verification failed: {:?}", xy);
        return Err(CustomError::WrongVault.into());
    }

    Ok(())
}