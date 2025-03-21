use borsh::BorshDeserialize;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::pubkey::Pubkey;

use crate::error::CustomError;
use crate::instruction::MigrateToV2Params;
use crate::state::{State, STATE_SEED, StateV1};
use crate::state::StateVersion::{Version1, Version2};

pub fn migrate_to_v2<'a>(
    program_id: &Pubkey,
    admin: &AccountInfo<'a>,
    state_pda: &AccountInfo<'a>,
    payment_ata: &AccountInfo<'a>,
    params: MigrateToV2Params,
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
        return Err(CustomError::StateNotInitialized.into());
    }

    let data = state_pda.data.borrow();
    let mut buf: &[u8] = *data; // there was .deref();
    let state_v1 = StateV1::deserialize(&mut buf)?;

    if state_v1.version != Version1 {
        return Err(CustomError::StateWrongVersion.into());
    }

    if state_v1.owner != *admin.key {
        return Err(CustomError::WrongAdminAccount.into())
    }

    let state = State {
        version: Version2,
        signer: params.signer,
        max_supply: state_v1.max_supply,
        name: state_v1.name,
        total_supply: state_v1.total_supply,
        owner: state_v1.owner,
        vault_bump: state_v1.vault_bump,
        price: state_v1.price,
        base_url: state_v1.base_url,
        payment_ata: *payment_ata.key,
        first_index: params.first_index
    };

    let required_len = state.serialized_len()?;
    let exists_len = state_pda.data_len();
    if required_len > exists_len {
        return Err(CustomError::NotEnoughSpace.into())
    }

    state.save_to(state_pda)?;

    Ok(())
}