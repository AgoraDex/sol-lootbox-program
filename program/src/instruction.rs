use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

#[repr(u8)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
#[borsh(use_discriminant = true)]
pub enum Instruction {
    Withdraw(WithdrawParam) = 2,
    ObtainTicket(ObtainTicketParams) = 3,
    Buy(BuyParam) = 4,
    UpdateState(UpdateStateParams) = 252,
    MigrateToV3(MigrateToV3Params) = 253,
    AdminWithdraw {
        lootbox_id: u16,
        amount: u64
    } = 254,
    Initialize(InitializeParams) = 255,
}
#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct BuyParam {
    pub lootbox_id: u16,
    pub ticket_bumps: Vec<u8>,
    pub ticket_seed: u32,
}
#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct InitializeParams {
    pub lootbox_id: u16,
    pub vault_bump: u8,
    pub state_bump: u8,
    pub max_supply: u32,
    pub begin_ts: u32,
    pub end_ts: u32,
    pub signer: [u8; 33],
    pub name: String,
    pub prices: Vec<u64>,
    pub base_url: String,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct MigrateToV3Params {
    pub state_bump: u8,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct UpdateStateParams {
    pub state_bump: u8,
    pub lootbox_id: u16,
    pub enabled_fields: u32,
    pub max_supply: u32,
    pub begin_ts: u32,
    pub end_ts: u32,
}

impl UpdateStateParams {
    const MAX_SUPPLY: u32 = 1;
    const BEGIN_TS: u32 = 2;
    const END_TS: u32 = 4;

    fn is_field(&self, flag: u32) -> bool {
        (self.enabled_fields & flag) == flag
    }

    pub fn is_max_supply(&self) -> bool {
        self.is_field(Self::MAX_SUPPLY)
    }

    pub fn is_begin_ts(&self) -> bool {
        self.is_field(Self::BEGIN_TS)
    }

    pub fn is_end_ts(&self) -> bool {
        self.is_field(Self::END_TS)
    }
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct ObtainTicketParams {
    pub lootbox_id: u16,
    pub bump: u8,
    pub id: u32,
    pub expire_at: u32,
    pub signature: Signature,
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct TransferParams {
    pub amount: u64
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct Signature {
    pub rec_id: u8,
    pub rs: [u8; 64],
}

#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Debug)]
pub struct WithdrawParam {
    pub lootbox_id: u16,
    pub expire_at: u32,
    pub signature: Signature,
    pub tickets: u8,
    pub amounts: Vec<u64>, // 1 for NFT
}

impl Instruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let instruction = Instruction::try_from_slice(input)?;

        Ok(instruction)
    }

    pub fn name(&self) -> &'static str {
        match self {
            Instruction::Buy(_) => "Buy",
            Instruction::Withdraw(_) => "Withdraw",
            Instruction::ObtainTicket(_) => "ObtainTicket",
            Instruction::MigrateToV3(_) => "MigrationToV3",
            Instruction::AdminWithdraw { .. } => "AdminWithdraw",
            Instruction::Initialize(_) => "Initialize",
            Instruction::UpdateState(_) => "UpdateState",
        }
    }
}