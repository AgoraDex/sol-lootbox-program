use crate::error::CustomError;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::system_instruction::create_account;
use solana_program::sysvar::rent::Rent;
use solana_program::sysvar::Sysvar;
use std::mem::size_of;
use std::ops::{Deref, DerefMut};

pub const TICKET_PREFIX: &[u8; 4] = b"AGLB";
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Ticket {
    pub prefix: [u8; 4],
    pub version: u8,
    pub owner: Pubkey,
    pub lootbox_id: u16,
    pub issue_index: u32,
    pub external_id: u32,
}

pub enum TicketVersion {
    Version0 = 0,
}

impl Ticket {
    pub fn verify_and_create<'a>(program_id: &Pubkey,
                                 system_program: &AccountInfo<'a>,
                                 buyer: &AccountInfo<'a>,
                                 lootbox_id: u16,
                                 ticket_seed: u32,
                                 buy_index: u8,
                                 issue_index: u32,
                                 ticket_pda: &AccountInfo<'a>,
                                 bump: Option<u8>,
                                 external_id: Option<u32>,
    ) -> Result<Ticket, ProgramError> {
        if !buyer.is_signer {
            msg!("Buyer must sign the transaction.");
            return Err(CustomError::WrongSigner.into());
        }

        if Self::if_initialized(ticket_pda) {
            msg!("The specified ticket is already used.");
            return Err(CustomError::TicketAccountAlreadyUsed.into());
        }

        let ticket_pair = if bump.is_some() {
            let seed = [buyer.owner.as_ref(), &lootbox_id.to_be_bytes(), &ticket_seed.to_be_bytes(), &buy_index.to_be_bytes(), &[bump.unwrap()]];
            (Pubkey::create_program_address(&seed, program_id)?, bump.unwrap())
        } else {
            let seed = [buyer.owner.as_ref(), &lootbox_id.to_be_bytes(), &ticket_seed.to_be_bytes(), &buy_index.to_be_bytes()];
            Pubkey::find_program_address(&seed, program_id)
        };

        if ticket_pair.0 != *ticket_pda.key {
            msg!("Ticket account & generated PDA mismatch.");
            return Err(CustomError::TicketAccountMismatch.into());
        }

        let ticket = Ticket {
            prefix: *TICKET_PREFIX,
            version: Ticket::get_last_version(),
            owner: *buyer.key,
            lootbox_id,
            issue_index,
            external_id: external_id.unwrap_or(0),
        };

        let space = Ticket::serialized_len(&ticket)?;
        let lamports = Rent::get()?.minimum_balance(space);

        invoke_signed(
            &create_account(
                buyer.key,
                ticket_pda.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[buyer.clone(), ticket_pda.clone(), system_program.clone()],
            &[&[buyer.owner.as_ref(), &lootbox_id.to_be_bytes(), &ticket_seed.to_be_bytes(), &buy_index.to_be_bytes(), &[ticket_pair.1]]],
        )?;

        ticket.save_to(ticket_pda)?;

        Ok(ticket)
    }

    pub fn verify_and_close<'a>(
        owner: &AccountInfo<'a>,
        ticket_pda: &AccountInfo<'a>,
    ) -> ProgramResult {
        if !owner.is_signer {
            msg!("Owner must sign the transaction.");
            return Err(CustomError::WrongSigner.into());
        }

        if !Self::if_initialized(ticket_pda) {
            msg!("The specified ticket must be initialized.");
            return Err(CustomError::TicketAccountNotExists.into());
        }

        let ticket = Ticket::load_from(ticket_pda)?;
        if ticket.owner != *owner.key {
            msg!("Wrong ticket owner.");
            return Err(CustomError::WrongTicketOwner.into());
        }

        // Безопасно переносим lamports обратно
        **owner.lamports.borrow_mut() += **ticket_pda.lamports.borrow();
        **ticket_pda.lamports.borrow_mut() = 0;

        // Обнуляем данные PDA
        {
            let mut data = ticket_pda.try_borrow_mut_data()?;
            data.fill(0);
        }

        Ok(())
    }


    pub fn if_initialized(ticket_pda: &AccountInfo) -> bool {
        if ticket_pda.data_is_empty() {
            return false;
        }
        let buf = ticket_pda.data.borrow();

        buf[0] == TICKET_PREFIX[0] && buf[1] == TICKET_PREFIX[1] && buf[2] == TICKET_PREFIX[2] && buf[3] == TICKET_PREFIX[3]
    }

    pub fn get_version(ticket_pda: &AccountInfo) -> u8 {
        let version = ticket_pda.data.borrow()[5];
        version
    }

    pub fn get_last_version() -> u8 {
        TicketVersion::Version0 as u8
    }

    pub fn serialized_len(&self) -> Result<usize, ProgramError> {
        // let mut cursor = Cursor::new([0u8; size_of<Ticket>()]);
        //
        // self.serialize(&mut cursor)?;
        //
        // Ok(cursor.position() as usize)
        Ok(size_of::<Self>())
    }

    pub fn save_to(&self, ticket_pda: &AccountInfo) -> ProgramResult {
        self.serialize(ticket_pda.data.borrow_mut().deref_mut())?;

        Ok(())
    }

    pub fn load_from(ticket_pda: &AccountInfo) -> Result<Self, ProgramError> {
        let data = ticket_pda.data.borrow();
        let mut buf: &[u8] = data.deref();
        let ticket = Ticket::deserialize(&mut buf)?;

        Ok(ticket)
    }
}