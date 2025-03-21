use solana_program::decode_error::DecodeError;
use solana_program::msg;
use solana_program::program_error::{PrintProgramError, ProgramError};
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, /*FromPrimitive,*/ PartialEq)]
#[repr(u32)]
pub enum CustomError {
    #[error("Certain signer account was expected.")]
    WrongSigner = 1000,
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
    #[error("Signature verification was failed.")]
    SignatureVerificationFailed,
    #[error("Signature was expired.")]
    SignatureExpired,
    #[error("Signature doesn't match with the specified parameters.")]
    WrongSignature,
}

impl From<CustomError> for ProgramError {
    fn from(e: CustomError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl PrintProgramError for CustomError {
    fn print<E>(&self) {
        msg!("{}", self);
    }
}

impl<E> DecodeError<E> for CustomError {
    fn type_of() -> &'static str {
        "CustomError"
    }
}