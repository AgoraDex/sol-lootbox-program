use borsh::BorshDeserialize;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::pubkey::Pubkey;

use crate::error::CustomError;
use crate::instruction::MigrateToV3Params;
use crate::state::{State, StateVersion, STATE_SEED};

pub fn migrate_to_v3<'a>(
    program_id: &Pubkey,
    admin: &AccountInfo<'a>,
    state_pda: &AccountInfo<'a>,
    params: MigrateToV3Params,
) -> ProgramResult {
    if !admin.is_signer {
        return Err(CustomError::WrongSigner.into());
    }

    let seed = [&admin.key.to_bytes(), STATE_SEED, &[params.state_bump]];
    let state_pub = &Pubkey::create_program_address(&seed, program_id)?;

    if state_pub != state_pda.key {
        return Err(CustomError::WrongVault.into())
    }

    if !State::if_initialized(state_pda) {
        msg!("Wrong admin address.");
        return Err(CustomError::StateNotInitialized.into());
    }

    msg!("Get old state.");
    let old_state = {
        let data = state_pda.data.borrow();
        let mut buf: &[u8] = *data; // there was .deref();
        State::deserialize(&mut buf)
    }?;

    // TODO: use != Version2 (old)
    if old_state.version != StateVersion::Version3 {
        msg!("Wrong state version, expected != {:?} but got {:?}", StateVersion::Version3, old_state.version);
        return Err(CustomError::StateWrongVersion.into());
    }

    if old_state.owner != *admin.key {
        msg!("Wrong admin address.");
        return Err(CustomError::WrongAdminAccount.into())
    }

    let state = State {
        version: StateVersion::Version4,
        id: old_state.id,
        signer: old_state.signer,
        max_supply: old_state.max_supply,
        begin_ts: old_state.begin_ts,
        end_ts: old_state.end_ts,
        name: old_state.name,
        total_supply: old_state.total_supply,
        owner: old_state.owner,
        vault_bump: old_state.vault_bump,
        prices: old_state.prices,
        base_url: old_state.base_url,
        // first_index: old_state.first_index,
        withdraw_counter: old_state.withdraw_counter,
    };

    msg!("Save migrated state.");

    state.save_to(state_pda)?;

    Ok(())
}