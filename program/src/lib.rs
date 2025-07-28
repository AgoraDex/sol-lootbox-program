use solana_program::{account_info::{AccountInfo, next_account_info}, entrypoint, entrypoint::ProgramResult, msg, pubkey::Pubkey};
use crate::error::CustomError;
use crate::instruction::Instruction;
use crate::processors::admin_withdraw::admin_withdraw;
use crate::processors::buy::buy;
use crate::processors::initialize::initialize;
use crate::processors::migrate::migrate_to_v3;
use crate::processors::obtain::obtain_ticket;
use crate::processors::update_state::update_state;
use crate::processors::withdraw::withdraw;

mod instruction;
mod error;
mod processors;
mod state;
mod verify;
mod ticket;

entrypoint!(process_instruction);

fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    instruction_data: &'a [u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    msg!("Unpacking instructions");
    let instruction = Instruction::unpack(instruction_data)?;
    msg!("Instruction: {:?}", instruction.name());
    match instruction {
        Instruction::OldBuy | Instruction::OldWithdraw => {
            return Err(CustomError::InstructionNotSupported.into());
        }
        Instruction::Buy(params) => {
            let payer = next_account_info(accounts_iter)?;
            let payer_ata = next_account_info(accounts_iter)?;
            let payment_ata = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let system_program = next_account_info(accounts_iter)?;
            let spl_program = next_account_info(accounts_iter)?;

            buy(program_id, payer, payer_ata, payment_ata, state_pda, vault_pda,
                system_program, spl_program, &params, accounts_iter)?;
        }
        Instruction::Withdraw(params) => {
            let payer = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let system_program = next_account_info(accounts_iter)?;
            let spl_program = next_account_info(accounts_iter)?;

            withdraw(program_id, payer, &params, state_pda, vault_pda, system_program, spl_program, accounts_iter)?;
        }
        Instruction::Initialize(params) => {
            let admin = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let system_account = next_account_info(accounts_iter)?;

            initialize(program_id, admin, vault_pda, state_pda, system_account, &params, accounts_iter)?;
        }
        Instruction::ObtainTicket(params) => {
            let payer = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let ticket_pda = next_account_info(accounts_iter)?;
            let system_account = next_account_info(accounts_iter)?;

            obtain_ticket(
                program_id,
                payer,
                params,
                state_pda,
                vault_pda,
                ticket_pda,
                system_account,
            )?;
        }
        Instruction::MigrateToV3(params) => {
            let admin = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;

            migrate_to_v3(program_id, admin, state_pda, params)?;
        }
        Instruction::UpdateState(params) => {
            let admin = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;

            update_state(program_id, admin, state_pda, params)?;

        }
        Instruction::AdminWithdraw { lootbox_id, amount } => {
            let admin = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let source_ata = next_account_info(accounts_iter)?;
            let destination_ata = next_account_info(accounts_iter)?;
            let spl_program = next_account_info(accounts_iter)?;

            admin_withdraw(program_id, lootbox_id, admin, state_pda, vault_pda, source_ata, destination_ata, spl_program, amount)?;
        }
    }

    Ok(())
}