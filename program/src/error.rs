// use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, /*FromPrimitive,*/ PartialEq)]
pub enum CustomError {
    #[error("Certain signer account was expected.")]
    WrongSigner,
    #[error("Certain admin account was expected.")]
    WrongAdminAccount,
    #[error("A state for the specified admin account has been already initialized.")]
    StateAlreadyInitialized,
    #[error("PDA account cannot be signer.")]
    PdaCannotBeSigner,
}

impl From<CustomError> for ProgramError {
    fn from(e: CustomError) -> Self {
        ProgramError::Custom(e as u32)
    }
}