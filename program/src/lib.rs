use solana_program::{account_info::{AccountInfo, next_account_info}, entrypoint, entrypoint::ProgramResult, msg, pubkey::Pubkey};
use crate::instruction::Instruction;
use crate::processors::buy::buy;
use crate::processors::initialize::initialize;
use crate::processors::migrate::migrate_to_v3;
use crate::processors::obtain::obtain_ticket;
use crate::processors::withdraw::withdraw;

mod instruction;
mod error;
mod processors;
mod state;
mod nft;
mod verify;

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
        Instruction::Buy => {
            let payer = next_account_info(accounts_iter)?;
            let payer_ata = next_account_info(accounts_iter)?;
            let payment_ata = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let destination_ata = next_account_info(accounts_iter)?;
            let nft_mint = next_account_info(accounts_iter)?;
            let metadata_pda = next_account_info(accounts_iter)?;
            let master_pda = next_account_info(accounts_iter)?;
            let system_program = next_account_info(accounts_iter)?;
            let sysvar_account = next_account_info(accounts_iter)?;
            let spl_program = next_account_info(accounts_iter)?;
            let mpl_program = next_account_info(accounts_iter)?;
            let ata_program = next_account_info(accounts_iter)?;

            buy(program_id, payer, payer_ata, payment_ata, destination_ata, state_pda, vault_pda,
                nft_mint, metadata_pda,
                master_pda, system_program, sysvar_account, spl_program,
                mpl_program, ata_program)?;
        }
        Instruction::Withdraw(params) => {
            let payer = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let system_program = next_account_info(accounts_iter)?;
            let sysvar_account = next_account_info(accounts_iter)?;
            let spl_program = next_account_info(accounts_iter)?;
            let mpl_program = next_account_info(accounts_iter)?;

            withdraw(program_id, payer, &params, state_pda, vault_pda, system_program,
                     sysvar_account, spl_program, mpl_program, accounts_iter)?;
        }
        Instruction::Initialize { vault_bump, state_bump, max_supply, signer, name, price, base_url } => {
            let admin = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let system_account = next_account_info(accounts_iter)?;
            let payment_ata = next_account_info(accounts_iter)?;

            initialize(program_id, admin, price, payment_ata, vault_pda, vault_bump,
                       state_pda, state_bump,
                       max_supply, name.as_str(), signer, system_account, base_url)?;
        }
        Instruction::ObtainTicket(params) => {
            let payer = next_account_info(accounts_iter)?;
            let destination_ata = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;
            let vault_pda = next_account_info(accounts_iter)?;
            let token_account = next_account_info(accounts_iter)?;
            let metadata_pda = next_account_info(accounts_iter)?;
            let master_pda = next_account_info(accounts_iter)?;
            let system_account = next_account_info(accounts_iter)?;
            let sysvar_account = next_account_info(accounts_iter)?;
            let spl_program = next_account_info(accounts_iter)?;
            let mpl_program = next_account_info(accounts_iter)?;
            let ata_program = next_account_info(accounts_iter)?;

            obtain_ticket(
                program_id,
                payer,
                params,
                destination_ata,
                state_pda,
                vault_pda,
                token_account,
                metadata_pda,
                master_pda,
                system_account,
                sysvar_account,
                spl_program,
                mpl_program,
                ata_program,
            )?;
        }
        Instruction::MigrateToV3(params) => {
            let admin = next_account_info(accounts_iter)?;
            let state_pda = next_account_info(accounts_iter)?;

            migrate_to_v3(program_id, admin, state_pda, params)?;
        }
        Instruction::AdminWithdraw { .. } => {}
    }

    Ok(())
}

// fn process_buy<'a>(
//     program_id: &'a Pubkey,
//     accounts: &'a [AccountInfo<'a>],
//     instruction_data: &'a [u8],
// ) -> ProgramResult {
//     let accounts_iter = &mut accounts.iter();
//
//     let payer = next_account_info(accounts_iter)?;
//     let invoice_pda = next_account_info(accounts_iter)?;
//     let invoice_bump = instruction_data[0];
//     let vault_pda = next_account_info(accounts_iter)?;
//     let mint = next_account_info(accounts_iter)?;
//     let authority_pda = next_account_info(accounts_iter)?;
//     let authority_bump = instruction_data[1];
//     let ata = next_account_info(accounts_iter)?;
//     let token_metadata_pda = next_account_info(accounts_iter)?;
//     let master_edition_pda = next_account_info(accounts_iter)?;
//     // let token_metadata_bump = instruction_data[1];
//     let token_program = next_account_info(accounts_iter)?;
//     let sys_program = next_account_info(accounts_iter)?;
//     let mpl_token_program = next_account_info(accounts_iter)?;
//     let sysvar_instructions = next_account_info(accounts_iter)?;
//
//     // let invoice_seed = [
//     //     *payer.key,
//     //     &[invoice_bump]
//     // ];
//
//     // let price = 1_000_000; // 0.01 SOL
//     // let count: i32 = invoice_pda.try_borrow_lamports() / price;
//
//     // if count == 0 {
//     //     msg!("Not enough payment.");
//     //     return Err(ProgramError::AccountBorrowFailed);
//     // }
//
//     let authority_seed : [&[u8]; 2] = [
//         b"mint_authority_seed",
//         &[authority_bump]
//     ];
//
//     // Проверка суммы платежа (0.01 SOL)
//     // let required_lamports = 1_000_000; // 0.01 SOL в лампортах
//     // if payer.lamports() < required_lamports {
//     //     msg!("Insufficient funds");
//     //     return Err(ProgramError::InsufficientFunds);
//     // }
//
//
//
//     // CreateV1CpiBuilder
//
//     // Перевод 0.01 SOL от payer к receiver
//     // invoke(
//     //     &system_instruction::transfer(
//     //         payer.key,
//     //         receiver.key,
//     //         required_lamports,
//     //     ),
//     //     &[
//     //         payer.clone(),
//     //         receiver.clone(),
//     //         sys_program.clone(),
//     //     ],
//     // )?;
//
//     msg!("Try to mint 4");
//
//     // Минтинг NFT токена
//     invoke_signed(
//         &mint_to(
//             &spl_token::id(),
//             mint.key,
//             ata.key,
//             authority_pda.key,
//             &[],
//             1, // Количество токенов для минтинга (1 NFT)
//         )?,
//         &[
//             token_program.clone(),
//             mint.clone(),
//             ata.clone(),
//             authority_pda.clone(),
//         ],
//         &[
//             &authority_seed
//         ]
//     )?;
//
//     // let mut zero_lamports: u64 = 0; // Укажите количество лампортов, если необходимо
//     // let mut data: Vec<u8> = Vec::new(); // Замените на данные аккаунта, если необходимо
//     // let rent = Rent::get().unwrap(); // Получить параметры аренды
//     let uri = format!("https://lootbox.agorahub.io/solana/dls1/{}", mint.key.to_string());
//     // let seller_fee_basis_points = 600; // 6%
//     // let program_lamport = 0;
//     msg!("Create mpl metadata.");
//
//     CreateV1CpiBuilder::new(mpl_token_program)
//         .metadata(token_metadata_pda)
//         .payer(payer)
//         .system_program(sys_program)
//         .authority(authority_pda)
//         .update_authority(authority_pda, true)
//         .print_supply(PrintSupply::Zero)
//         .seller_fee_basis_points(600)
//         .uri(uri)
//         .name("DLS 1".to_string())
//         .symbol("DLS1".to_string())
//         .is_mutable(false)
//         .mint(mint, false)
//         .creators(vec![Creator {
//             address: *authority_pda.key,
//             verified: true,
//             share: 100,
//         }])
//         .master_edition(Some(master_edition_pda))
//         .decimals(0)
//         .token_standard(TokenStandard::NonFungible)
//         .spl_token_program(Some(token_program))
//         .sysvar_instructions(sysvar_instructions)
//         .invoke_signed(&[&authority_seed])?;
//
//
//
//     Ok(())
// }
//
