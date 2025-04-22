use crate::error::CustomError;
use crate::instruction::ObtainTicketParams;
use crate::nft::mint_token;
use crate::state::{State, TICKET};
use crate::verify::verify_signature;
use solana_program::account_info::AccountInfo;
use solana_program::clock::Clock;
use solana_program::sysvar::Sysvar;
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

    let mut state = State::verify_and_load(program_id, state_pda, params.lootbox_id, None)?;

    state.check_supply()?;
    state.check_vault(program_id, vault_pda)?;
    state.check_time(&Clock::get()?)?;

    let message_hash = {
        let mut hasher = Hasher::default();
        // TODO: it will be replaced with server side signature
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