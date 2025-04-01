use solana_program::clock::Clock;
use solana_program::entrypoint::ProgramResult;
use solana_program::hash::Hash;
use solana_program::msg;
use solana_program::secp256k1_recover::secp256k1_recover;
use solana_program::sysvar::Sysvar;
use crate::error::CustomError;
use crate::instruction::Signature;
use crate::state::State;

pub fn verify_signature<'a>(message_hash: &Hash,
                        expire_at: u32,
                        signature: &Signature,
                        state: &State,
) -> ProgramResult {
    let clock = Clock::get()?;
    if clock.unix_timestamp > expire_at as i64 {
        msg!("Signature expired {}", clock.unix_timestamp);
        return Err(CustomError::SignatureExpired.into());
    }

    let recovered = secp256k1_recover(&message_hash.to_bytes(), signature.rec_id, &signature.rs).map_err(|e| {
        msg!("Recovery error: {}", e);
        CustomError::SignatureVerificationFailed
    })?;

    // recovery returns XY coordinates
    // but compressed public key from secp256k1 keeps only X coordinate and Y parity
    let xy = recovered.to_bytes();
    let y_parity = if xy[63] & 1 != 0 { 0x03 } else { 0x02 } as u8;
    if xy[0..31] != state.signer[1..32] || y_parity != state.signer[0] {
        msg!("Hash was: {:?}", message_hash.to_bytes());
        msg!("Signature verification failed: {:?}", xy);
        return Err(CustomError::WrongSignature.into());
    }

    Ok(())
}