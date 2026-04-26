#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Symbol,
};

// ── Types ─────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Campaign {
    pub id: u64,
    pub merchant: Address,
    pub reward_amount: i128,
    pub expiration: u64, // Unix timestamp (seconds)
    pub active: bool,
    pub total_claimed: u64,
    /// Campaign name — max 64 bytes UTF-8
    pub name: Bytes,
    /// Campaign description — max 256 bytes UTF-8
    pub description: Bytes,
}

#[contracttype]
pub enum DataKey {
    Campaign(u64),
    NextId,
    Admin,
}

// ── Events ────────────────────────────────────────────────────────────────────

const CAMPAIGN_CREATED: Symbol = symbol_short!("CAM_CRT");
const CAMPAIGN_UPDATED: Symbol = symbol_short!("CAM_UPD");

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct CampaignContract;

#[contractimpl]
impl CampaignContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &1_u64);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn next_id(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1)
    }

    fn bump_id(env: &Env) -> u64 {
        let id = Self::next_id(env);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(id + 1));
        id
    }

    // ── Public interface ──────────────────────────────────────────────────────

    /// Create a new campaign. Only the merchant (caller) can create it.
    /// `name` max 64 bytes, `description` max 256 bytes.
    pub fn create_campaign(
        env: Env,
        merchant: Address,
        reward_amount: i128,
        expiration: u64,
        name: Bytes,
        description: Bytes,
    ) -> u64 {
        merchant.require_auth();
        assert!(reward_amount > 0, "reward_amount must be positive");
        assert!(
            expiration > env.ledger().timestamp(),
            "expiration must be in the future"
        );
        assert!(name.len() <= 64, "name exceeds 64 bytes");
        assert!(description.len() <= 256, "description exceeds 256 bytes");

        let id = Self::bump_id(&env);
        let campaign = Campaign {
            id,
            merchant: merchant.clone(),
            reward_amount,
            expiration,
            active: true,
            total_claimed: 0,
            name: name.clone(),
            description: description.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(id), &campaign);

        env.events().publish(
            (CAMPAIGN_CREATED, symbol_short!("id"), id),
            (merchant, name, description),
        );

        id
    }

    /// Deactivate / reactivate a campaign. Only the merchant can do this.
    pub fn set_active(env: Env, campaign_id: u64, active: bool) {
        let mut campaign = Self::get_campaign_internal(&env, campaign_id);
        campaign.merchant.require_auth();
        campaign.active = active;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        env.events()
            .publish((CAMPAIGN_UPDATED, symbol_short!("id"), campaign_id), active);
    }

    /// Called by the rewards contract to increment the claim counter.
    pub fn record_claim(env: Env, campaign_id: u64) {
        let mut campaign = Self::get_campaign_internal(&env, campaign_id);
        campaign.total_claimed = campaign
            .total_claimed
            .checked_add(1)
            .expect("overflow");
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
    }

    pub fn get_campaign(env: Env, campaign_id: u64) -> Campaign {
        Self::get_campaign_internal(&env, campaign_id)
    }

    /// View function returning only the on-chain metadata fields.
    pub fn get_campaign_metadata(env: Env, campaign_id: u64) -> (Bytes, Bytes) {
        let c = Self::get_campaign_internal(&env, campaign_id);
        (c.name, c.description)
    }

    fn get_campaign_internal(env: &Env, campaign_id: u64) -> Campaign {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found")
    }

    pub fn is_active(env: Env, campaign_id: u64) -> bool {
        let c = Self::get_campaign_internal(&env, campaign_id);
        c.active && env.ledger().timestamp() < c.expiration
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Bytes, Env,
    };

    fn setup() -> (Env, Address, CampaignContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, CampaignContract);
        let client = CampaignContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        (env, admin, client)
    }

    fn name(env: &Env) -> Bytes {
        Bytes::from_slice(env, b"Summer Sale")
    }

    fn desc(env: &Env) -> Bytes {
        Bytes::from_slice(env, b"Earn LYT on every purchase this summer")
    }

    #[test]
    fn test_create_campaign() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        let expiry = env.ledger().timestamp() + 86400;
        let id = client.create_campaign(&merchant, &100, &expiry, &name(&env), &desc(&env));
        assert_eq!(id, 1);
        let c = client.get_campaign(&id);
        assert_eq!(c.merchant, merchant);
        assert_eq!(c.reward_amount, 100);
        assert!(c.active);
        assert_eq!(c.name, name(&env));
        assert_eq!(c.description, desc(&env));
    }

    #[test]
    fn test_get_campaign_metadata() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        let expiry = env.ledger().timestamp() + 86400;
        let id = client.create_campaign(&merchant, &100, &expiry, &name(&env), &desc(&env));
        let (n, d) = client.get_campaign_metadata(&id);
        assert_eq!(n, name(&env));
        assert_eq!(d, desc(&env));
    }

    #[test]
    #[should_panic(expected = "name exceeds 64 bytes")]
    fn test_name_too_long() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        let expiry = env.ledger().timestamp() + 86400;
        let long_name = Bytes::from_slice(env, &[b'x'; 65]);
        client.create_campaign(&merchant, &100, &expiry, &long_name, &desc(&env));
    }

    #[test]
    #[should_panic(expected = "description exceeds 256 bytes")]
    fn test_description_too_long() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        let expiry = env.ledger().timestamp() + 86400;
        let long_desc = Bytes::from_slice(env, &[b'd'; 257]);
        client.create_campaign(&merchant, &100, &expiry, &name(&env), &long_desc);
    }

    #[test]
    #[should_panic(expected = "expiration must be in the future")]
    fn test_expired_campaign_rejected() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        client.create_campaign(&merchant, &100, &0, &name(&env), &desc(&env));
    }

    #[test]
    fn test_set_active() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        let expiry = env.ledger().timestamp() + 86400;
        let id = client.create_campaign(&merchant, &100, &expiry, &name(&env), &desc(&env));
        client.set_active(&id, &false);
        assert!(!client.get_campaign(&id).active);
    }

    #[test]
    fn test_is_active_after_expiry() {
        let (env, _admin, client) = setup();
        let merchant = Address::generate(&env);
        let expiry = env.ledger().timestamp() + 10;
        let id = client.create_campaign(&merchant, &100, &expiry, &name(&env), &desc(&env));
        assert!(client.is_active(&id));

        env.ledger().with_mut(|l| l.timestamp = expiry + 1);
        assert!(!client.is_active(&id));
    }
}
