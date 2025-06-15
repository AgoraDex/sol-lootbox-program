use crate::error::CustomError;
use crate::instruction::ObtainTicketParams;
use crate::state::{State};
use crate::verify::verify_signature;
use solana_program::account_info::AccountInfo;
use solana_program::clock::Clock;
use solana_program::sysvar::Sysvar;
use solana_program::entrypoint::ProgramResult;
use solana_program::hash::Hasher;
use solana_program::msg;
use solana_program::pubkey::Pubkey;
use crate::ticket::Ticket;

pub fn obtain_ticket<'a>(program_id: &Pubkey,
                         buyer: &AccountInfo<'a>,
                         params: ObtainTicketParams,
                         state_pda: &AccountInfo<'a>,
                         vault_pda: &AccountInfo<'a>,
                         ticket_pda: &AccountInfo<'a>,
                         system_program: &AccountInfo<'a>,
) -> ProgramResult {
    if !buyer.is_signer {
        msg!("Buyer must be signer.");
        return Err(CustomError::WrongSigner.into());
    }

    let mut state = State::verify_and_load(program_id, state_pda, params.lootbox_id, None)?;

    state.check_and_get_correct_count(1)?;
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

    Ticket::verify_and_create(
        program_id,
        system_program,
        buyer,
        params.lootbox_id,
        params.id,
        0,
        state.total_supply,
        ticket_pda,
        Some(params.bump),
        Some(params.id),
    )?;

    state.total_supply += 1;
    state.save_to(state_pda)?;

    Ok(())
}