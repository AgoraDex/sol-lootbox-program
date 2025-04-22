use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::pubkey::Pubkey;

use crate::error::CustomError;
use crate::instruction::UpdateStateParams;
use crate::state::State;

pub fn update_state<'a>(
    program_id: &Pubkey,
    admin: &AccountInfo<'a>,
    state_pda: &AccountInfo<'a>,
    params: UpdateStateParams,
) -> ProgramResult {
    if !admin.is_signer {
        return Err(CustomError::WrongSigner.into());
    }

    msg!("Read state.");
    let mut state = State::verify_and_load(program_id, state_pda, params.lootbox_id, Some(params.state_bump))?;

    state.max_supply = params.max_supply;

    msg!("Save state.");
    state.save_to(state_pda)?;

    Ok(())
}