use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program_error::ProgramError;
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

    if state.owner != *admin.key {
        msg!("Admin doesn't own the state.");
        return Err(CustomError::WrongAdminAccount.into());
    }

    if params.is_max_supply() {
        msg!("Update max_supply form {} to {}.", state.max_supply, params.max_supply);
        state.max_supply = params.max_supply;
    }
    if params.is_begin_ts() {
        msg!("Update begin_ts from {} to {}.", state.begin_ts, params.begin_ts);
        state.begin_ts = params.begin_ts;
    }
    if params.is_end_ts() {
        msg!("Update end_ts from {} to {}.", state.end_ts, params.end_ts);
        state.end_ts = params.end_ts;
    }
    if params.is_price() {
        let mut price_amount = state.prices
            .iter()
            .find(|x| {x.ata == params.price_ata})
            .ok_or::<ProgramError>(CustomError::WrongPaymentAta.into())?
            .amount;

        msg!("Update price for token ATA {} from {} to {}.", params.price_ata, price_amount, params.price_amount);
        price_amount = params.price_amount;

    }

    msg!("Save state.");
    state.save_to(state_pda)?;

    Ok(())
}