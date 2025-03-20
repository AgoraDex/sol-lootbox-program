// use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, /*FromPrimitive,*/ PartialEq)]
pub enum CustomError {
    #[error("Certain signer account was expected.")]
    WrongSigner,
    #[error("Certain admin account was expected.")]
    WrongAdminAccount,
    #[error("The state for the specified admin account has been already initialized.")]
    StateAlreadyInitialized,
    #[error("The specified state wasn't initialized.")]
    StateNotInitialized,
    #[error("The specified state version is wrong.")]
    StateWrongVersion,
    #[error("PDA account cannot be signer.")]
    PdaCannotBeSigner,
    #[error("Max supply reached.")]
    MaxSupplyReached,
    #[error("Wrong vault address.")]
    WrongVault,
    #[error("Wrong state address.")]
    WrongState,
    #[error("Wrong payment ata.")]
    WrongPaymentAta,
    #[error("The account's data has not enough space.")]
    NotEnoughSpace,
}

impl From<CustomError> for ProgramError {
    fn from(e: CustomError) -> Self {
        ProgramError::Custom(e as u32)
    }
}