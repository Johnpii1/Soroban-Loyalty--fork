#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

// ── Cross-contract interfaces ─────────────────────────────────────────────────

mod token {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "TokenClient")]
    pub trait Token {
        fn mint(env: Env, to: Address, amount: i128);
        fn burn(env: Env, from: Address, amount: i128);
        fn balance(env: Env, addr: Address) -> i128;
    }
}

mod campaign {
    use soroban_sdk::{contractclient, contracttype, Address, Env};

    #[contracttype]
    #[derive(Clone)]
    pub struct Campaign {
        pub id: u64,
        pub merchant: Address,
        pub reward_amount: i128,
        pub expiration: u64,
        pub created_at: u64,
        pub active: bool,
        pub total_claimed: u64,
    }

    #[contractclient(name = "CampaignClient")]
    pub trait CampaignTrait {
        fn is_active(env: Env, campaign_id: u64) -> bool;
        fn get_campaign(env: Env, campaign_id: u64) -> Campaign;
        fn record_claim(env: Env, campaign_id: u64);
    }
}

use campaign::Campaign;

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// v2: Claimed(user, campaign_id) → ClaimRecord
    Claimed(Address, u64),
    /// v1 (legacy): ClaimedV1(user, campaign_id) → bool
    /// Kept during migration; removed after migrate() completes.
    ClaimedV1(Address, u64),
    TokenContract,
    CampaignContract,
    Admin,
    /// Schema version — bumped by each migration
    SchemaVersion,
    /// Idempotency guard: set to true once migrate_v1_to_v2 completes
    MigrationV1Done,
}

// ── Storage types ─────────────────────────────────────────────────────────────

/// v2 claim record — richer than the v1 bool
#[contracttype]
#[derive(Clone)]
pub struct ClaimRecord {
    pub amount: i128,
    pub claimed_at: u64,
}

// ── Events ────────────────────────────────────────────────────────────────────

const REWARD_CLAIMED: Symbol = symbol_short!("RWD_CLM");
const REWARD_REDEEMED: Symbol = symbol_short!("RWD_RDM");
const MIGRATED: Symbol = symbol_short!("MIGRATED");

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        token_contract: Address,
        campaign_contract: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage()
            .instance()
            .set(&DataKey::CampaignContract, &campaign_contract);
    }

    fn token_client(env: &Env) -> token::TokenClient {
        let addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        token::TokenClient::new(env, &addr)
    }

    fn campaign_client(env: &Env) -> campaign::CampaignClient {
        let addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::CampaignContract)
            .unwrap();
        campaign::CampaignClient::new(env, &addr)
    }

    fn has_claimed(env: &Env, user: &Address, campaign_id: u64) -> bool {
        // Check v2 first, then fall back to v1 (pre-migration)
        env.storage()
            .persistent()
            .has(&DataKey::Claimed(user.clone(), campaign_id))
            || env.storage()
                .persistent()
                .has(&DataKey::ClaimedV1(user.clone(), campaign_id))
    }

    /// Returns multiplier in basis points (10000 = 1x, 20000 = 2x).
    /// Formula: 1 + (expires_at - now) / (expires_at - created_at), capped [1x, 2x].
    fn calc_multiplier(now: u64, created_at: u64, expires_at: u64) -> u64 {
        if now >= expires_at || expires_at <= created_at {
            return 10_000;
        }
        let duration = expires_at - created_at;
        let remaining = expires_at - now;
        // multiplier_bp = 10000 + 10000 * remaining / duration, capped at 20000
        let extra = 10_000u64 * remaining / duration;
        10_000 + extra.min(10_000)
    }

    pub fn claim_reward(env: Env, user: Address, campaign_id: u64) {
        user.require_auth();

        // Double-claim guard — checked BEFORE any external calls
        assert!(
            !Self::has_claimed(&env, &user, campaign_id),
            "already claimed"
        );

        let campaign_client = Self::campaign_client(&env);
        assert!(
            campaign_client.is_active(&campaign_id),
            "campaign not active"
        );

        let campaign: Campaign = campaign_client.get_campaign(&campaign_id);

        // Write claimed state before external mint (reentrancy guard) — v2 record
        let record = ClaimRecord {
            amount: 0, // will be updated below; set 0 now to mark as claimed
            claimed_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Claimed(user.clone(), campaign_id), &record);

        let multiplier_bp = Self::calc_multiplier(
            env.ledger().timestamp(),
            campaign.created_at,
            campaign.expiration,
        );
        let final_amount = (campaign.reward_amount * multiplier_bp as i128) / 10_000;

        campaign_client.record_claim(&campaign_id);
        Self::token_client(&env).mint(&user, &final_amount);

        // Update record with actual amount
        let record = ClaimRecord {
            amount: final_amount,
            claimed_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Claimed(user.clone(), campaign_id), &record);

        env.events().publish(
            (REWARD_CLAIMED, symbol_short!("user"), user.clone()),
            (campaign_id, final_amount, multiplier_bp),
        );
    }

    pub fn redeem_reward(env: Env, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");

        Self::token_client(&env).burn(&user, &amount);

        env.events()
            .publish((REWARD_REDEEMED, symbol_short!("user"), user), amount);
    }

    pub fn has_claimed_view(env: Env, user: Address, campaign_id: u64) -> bool {
        Self::has_claimed(&env, &user, campaign_id)
    }

    pub fn schema_version(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::SchemaVersion).unwrap_or(1)
    }

    // ── Storage Migration ─────────────────────────────────────────────────────

    /// Migrate v1 claim records (bool) to v2 (ClaimRecord) for a batch of entries.
    ///
    /// # Idempotency
    /// Guarded by `MigrationV1Done` flag — panics if called a second time.
    ///
    /// # Admin-only
    /// Requires admin auth.
    ///
    /// # Usage
    /// Call once after deploying the v2 contract upgrade, passing all
    /// (user, campaign_id) pairs that were claimed under v1.
    /// Old `ClaimedV1` keys are removed after writing the new `Claimed` records.
    ///
    /// # Rollback
    /// If migration fails mid-batch, the `MigrationV1Done` flag is NOT set
    /// (it is only set on success), so the function can be retried.
    /// To roll back to v1 entirely, redeploy the v1 wasm and the v1 keys
    /// remain intact (they are only removed on successful migration).
    pub fn migrate_v1_to_v2(
        env: Env,
        admin: Address,
        entries: Vec<(Address, u64)>,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "not admin");

        // Idempotency guard
        assert!(
            !env.storage().instance().has(&DataKey::MigrationV1Done),
            "migration already completed"
        );

        let now = env.ledger().timestamp();

        for (user, campaign_id) in entries.iter() {
            let v1_key = DataKey::ClaimedV1(user.clone(), campaign_id);
            let v2_key = DataKey::Claimed(user.clone(), campaign_id);

            // Only migrate if v1 record exists and v2 doesn't yet
            if env.storage().persistent().has(&v1_key)
                && !env.storage().persistent().has(&v2_key)
            {
                let record = ClaimRecord {
                    amount: 0, // amount unknown from v1 bool; set 0 as sentinel
                    claimed_at: now,
                };
                env.storage().persistent().set(&v2_key, &record);
                env.storage().persistent().remove(&v1_key);
            }
        }

        // Mark migration complete and bump schema version
        env.storage().instance().set(&DataKey::MigrationV1Done, &true);
        env.storage().instance().set(&DataKey::SchemaVersion, &2_u32);

        env.events().publish(MIGRATED, 2_u32);
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_loyalty_campaign::CampaignContract;
    use soroban_loyalty_token::TokenContract;
    use soroban_sdk::{
        testutils::{Address as _, Events, Ledger},
        vec, IntoVal, Env,
    };

    struct TestSetup<'a> {
        env: Env,
        token: soroban_loyalty_token::TokenContractClient<'a>,
        campaign: soroban_loyalty_campaign::CampaignContractClient<'a>,
        rewards: RewardsContractClient<'a>,
    }

    fn setup() -> TestSetup<'static> {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let token_id = env.register_contract(None, TokenContract);
        let token = soroban_loyalty_token::TokenContractClient::new(&env, &token_id);
        token.initialize(
            &admin,
            &soroban_sdk::String::from_str(&env, "LoyaltyToken"),
            &soroban_sdk::String::from_str(&env, "LYT"),
            &7,
        );

        let campaign_id_addr = env.register_contract(None, CampaignContract);
        let campaign =
            soroban_loyalty_campaign::CampaignContractClient::new(&env, &campaign_id_addr);
        let mut campaign_admins = soroban_sdk::Vec::new(&env);
        campaign_admins.push_back(admin.clone());
        campaign.initialize(&campaign_admins, &1);

        let rewards_id = env.register_contract(None, RewardsContract);
        let rewards = RewardsContractClient::new(&env, &rewards_id);
        rewards.initialize(&admin, &token_id, &campaign_id_addr);

        // Give rewards contract mint authority
        token.set_admin(&rewards_id);

        TestSetup { env, token, campaign, rewards }
    }

    fn make_campaign(t: &TestSetup, merchant: &Address, reward: i128) -> u64 {
        let expiry = t.env.ledger().timestamp() + 86400;
        let name = soroban_sdk::Bytes::from_slice(&t.env, b"Test Campaign");
        let desc = soroban_sdk::Bytes::from_slice(&t.env, b"Test description");
        t.campaign.create_campaign(merchant, &reward, &expiry, &name, &desc)
    }

    #[test]
    fn test_claim_mints_tokens() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);

        let cid = make_campaign(&t, &merchant, 500);
        t.rewards.claim_reward(&user, &cid);

        // At t=0 (start), multiplier is 2x → 500 * 2 = 1000
        assert_eq!(t.token.balance(&user), 1000);
        assert!(t.rewards.has_claimed_view(&user, &cid));

        // Assert RWD_CLM event emitted by rewards contract
        let events = t.env.events().all();
        let rwd_clm_event = events.iter().find(|(contract, _, _)| {
            *contract == t.rewards.address
        });
        assert!(rwd_clm_event.is_some(), "RWD_CLM event not emitted");
        let (_, topics, _) = rwd_clm_event.unwrap();
        assert_eq!(topics.get(0).unwrap(), REWARD_CLAIMED.into_val(&t.env));
    }

    #[test]
    #[should_panic(expected = "already claimed")]
    fn test_double_claim_prevented() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);

        let cid = make_campaign(&t, &merchant, 500);
        t.rewards.claim_reward(&user, &cid);
        t.rewards.claim_reward(&user, &cid);
    }

    #[test]
    #[should_panic(expected = "campaign not active")]
    fn test_claim_inactive_campaign_rejected() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);

        let cid = make_campaign(&t, &merchant, 500);
        t.campaign.set_active(&cid, &false);
        t.rewards.claim_reward(&user, &cid);
    }

    #[test]
    #[should_panic(expected = "campaign not active")]
    fn test_claim_expired_campaign_rejected() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);
        let expiry = t.env.ledger().timestamp() + 10;
        let name = soroban_sdk::Bytes::from_slice(&t.env, b"Test Campaign");
        let desc = soroban_sdk::Bytes::from_slice(&t.env, b"Test description");
        let cid = t.campaign.create_campaign(&merchant, &500, &expiry, &name, &desc);
        t.env.ledger().with_mut(|l| l.timestamp = expiry + 1);
        t.rewards.claim_reward(&user, &cid);
    }

    #[test]
    fn test_redeem_burns_tokens() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);

        let cid = make_campaign(&t, &merchant, 500);
        t.rewards.claim_reward(&user, &cid);
        // Claimed at start → 2x → 1000 minted; redeem 200 → 800 remaining
        t.rewards.redeem_reward(&user, &200);

        assert_eq!(t.token.balance(&user), 300);
        assert_eq!(t.token.total_supply_view(), 300);

        // Assert RWD_RDM event emitted
        let events = t.env.events().all();
        let rwd_rdm_event = events.iter().rev().find(|(contract, _, _)| {
            *contract == t.rewards.address
        });
        assert!(rwd_rdm_event.is_some(), "RWD_RDM event not emitted");
        let (_, topics, _) = rwd_rdm_event.unwrap();
        assert_eq!(topics.get(0).unwrap(), REWARD_REDEEMED.into_val(&t.env));
    }

    #[test]
    fn test_multiple_users_same_campaign() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user1 = Address::generate(&t.env);
        let user2 = Address::generate(&t.env);

        let cid = make_campaign(&t, &merchant, 100);
        t.rewards.claim_reward(&user1, &cid);
        t.rewards.claim_reward(&user2, &cid);

    // ── Integration Tests (Issue #127) ───────────────────────────────────────

    /// Flow 1: The Claim Loop - End-to-end reward claiming integration test
    #[test]
    fn test_integration_claim_loop() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);
        let reward_amount = 1000_i128;
        let expiry = t.env.ledger().timestamp() + 86400; // 24 hours

        // 1. Create active campaign
        let campaign_id = t.campaign.create_campaign(&merchant, &reward_amount, &expiry);
        assert!(t.campaign.is_active(&campaign_id));

        // 2. User claims reward
        t.rewards.claim_reward(&user, &campaign_id);

        // 3. Verify token was minted correctly via cross-contract call
        assert_eq!(t.token.balance(&user), reward_amount);
        assert_eq!(t.token.total_supply_view(), reward_amount);

        // 4. Verify claim was recorded in rewards contract
        assert!(t.rewards.has_claimed_view(&user, &campaign_id));
    }

    /// Flow 2: The Redemption Loop - End-to-end token redemption integration test
    #[test]
    fn test_integration_redemption_loop() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);
        let reward_amount = 1000_i128;
        let redeem_amount = 300_i128;
        let expiry = t.env.ledger().timestamp() + 86400;

        // Setup: User has claimed rewards
        let campaign_id = t.campaign.create_campaign(&merchant, &reward_amount, &expiry);
        t.rewards.claim_reward(&user, &campaign_id);
        
        // Verify initial balance from claim
        assert_eq!(t.token.balance(&user), reward_amount);

        // 1. User redeems tokens
        t.rewards.redeem_reward(&user, &redeem_amount);

        // 2. Verify tokens were burned correctly via cross-contract call
        let expected_balance = reward_amount - redeem_amount;
        assert_eq!(t.token.balance(&user), expected_balance);
        assert_eq!(t.token.total_supply_view(), expected_balance);
    }

    /// Integration test: Multiple users, multiple campaigns with cross-contract interactions
    #[test]
    fn test_integration_multi_user_multi_campaign() {
        let t = setup();
        let merchant1 = Address::generate(&t.env);
        let merchant2 = Address::generate(&t.env);
        let user1 = Address::generate(&t.env);
        let user2 = Address::generate(&t.env);
        let expiry = t.env.ledger().timestamp() + 86400;

        // Create two campaigns with different reward amounts
        let campaign1_id = t.campaign.create_campaign(&merchant1, &100, &expiry);
        let campaign2_id = t.campaign.create_campaign(&merchant2, &200, &expiry);

        // User1 claims from both campaigns
        t.rewards.claim_reward(&user1, &campaign1_id);
        t.rewards.claim_reward(&user1, &campaign2_id);

        // User2 claims from campaign1 only
        t.rewards.claim_reward(&user2, &campaign1_id);

        // Verify cross-contract token balances
        assert_eq!(t.token.balance(&user1), 300); // 100 + 200
        assert_eq!(t.token.balance(&user2), 100); // 100 only
        assert_eq!(t.token.total_supply_view(), 400); // Total minted

        // User1 redeems some tokens - tests cross-contract burn
        t.rewards.redeem_reward(&user1, &150);
        assert_eq!(t.token.balance(&user1), 150);
        assert_eq!(t.token.total_supply_view(), 250); // Total after burn

        // Verify claim states are maintained correctly
        assert!(t.rewards.has_claimed_view(&user1, &campaign1_id));
        assert!(t.rewards.has_claimed_view(&user1, &campaign2_id));
        assert!(t.rewards.has_claimed_view(&user2, &campaign1_id));
        assert!(!t.rewards.has_claimed_view(&user2, &campaign2_id));
    }

    /// Integration boundary test: Campaign expiration affects cross-contract interactions
    #[test]
    fn test_integration_campaign_expiration_boundary() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user1 = Address::generate(&t.env);
        let user2 = Address::generate(&t.env);
        let short_expiry = t.env.ledger().timestamp() + 10; // Short expiry

        let campaign_id = t.campaign.create_campaign(&merchant, &500, &short_expiry);
        
        // User1 claims before expiry - should succeed
        t.rewards.claim_reward(&user1, &campaign_id);
        assert_eq!(t.token.balance(&user1), 500);
        
        // Advance time past expiry
        t.env.ledger().with_mut(|l| l.timestamp = short_expiry + 1);
        
        // User2 tries to claim after expiry - should fail
        let result = std::panic::catch_unwind(|| {
            t.rewards.claim_reward(&user2, &campaign_id);
        });
        assert!(result.is_err());
        
        // Verify user2 has no tokens (claim failed)
        assert_eq!(t.token.balance(&user2), 0);
        assert_eq!(t.token.total_supply_view(), 500); // Only user1's tokens
    }

    /// Integration boundary test: Inactive campaign prevents cross-contract token minting
    #[test]
    fn test_integration_inactive_campaign_boundary() {
        let t = setup();
        let merchant = Address::generate(&t.env);
        let user = Address::generate(&t.env);
        let expiry = t.env.ledger().timestamp() + 86400;

        let campaign_id = t.campaign.create_campaign(&merchant, &500, &expiry);
        
        // Deactivate campaign via campaign contract
        t.campaign.set_active(&campaign_id, &false);
        
        // Attempt to claim should fail - no cross-contract token minting should occur
        let result = std::panic::catch_unwind(|| {
            t.rewards.claim_reward(&user, &campaign_id);
        });
        assert!(result.is_err());
        
        // Verify no tokens were minted
        assert_eq!(t.token.balance(&user), 0);
        assert_eq!(t.token.total_supply_view(), 0);
        assert!(!t.rewards.has_claimed_view(&user, &campaign_id));
    }

    // ── Migration Tests (Issue #119) ──────────────────────────────────────────

    #[test]
    fn test_migration_v1_to_v2_idempotent_guard() {
        let t = setup();
        let admin = Address::generate(&t.env);
        // Re-initialize with known admin for migration test
        let rewards_id = t.env.register_contract(None, RewardsContract);
        let rewards = RewardsContractClient::new(&t.env, &rewards_id);
        rewards.initialize(&admin, &t.token.address, &t.campaign.address);

        let entries: soroban_sdk::Vec<(Address, u64)> = soroban_sdk::Vec::new(&t.env);

        // First call succeeds
        rewards.migrate_v1_to_v2(&admin, &entries);
        assert_eq!(rewards.schema_version(), 2);

        // Second call panics
        let result = std::panic::catch_unwind(|| {
            rewards.migrate_v1_to_v2(&admin, &entries);
        });
        assert!(result.is_err());
    }

    #[test]
    fn test_migration_converts_v1_records() {
        let t = setup();
        let admin = Address::generate(&t.env);
        let user1 = Address::generate(&t.env);
        let user2 = Address::generate(&t.env);

        let rewards_id = t.env.register_contract(None, RewardsContract);
        let rewards = RewardsContractClient::new(&t.env, &rewards_id);
        rewards.initialize(&admin, &t.token.address, &t.campaign.address);

        // Simulate v1 state: write ClaimedV1 bool records directly
        t.env.as_contract(&rewards_id, || {
            t.env.storage().persistent().set(&DataKey::ClaimedV1(user1.clone(), 1), &true);
            t.env.storage().persistent().set(&DataKey::ClaimedV1(user2.clone(), 1), &true);
        });

        // Both users appear claimed via v1 fallback
        assert!(rewards.has_claimed_view(&user1, &1));
        assert!(rewards.has_claimed_view(&user2, &1));

        // Run migration
        let mut entries: soroban_sdk::Vec<(Address, u64)> = soroban_sdk::Vec::new(&t.env);
        entries.push_back((user1.clone(), 1));
        entries.push_back((user2.clone(), 1));
        rewards.migrate_v1_to_v2(&admin, &entries);

        // v1 keys removed, v2 keys present — still appears claimed
        assert!(rewards.has_claimed_view(&user1, &1));
        assert!(rewards.has_claimed_view(&user2, &1));

        // Schema version bumped
        assert_eq!(rewards.schema_version(), 2);

        // v1 keys are gone
        t.env.as_contract(&rewards_id, || {
            assert!(!t.env.storage().persistent().has(&DataKey::ClaimedV1(user1.clone(), 1)));
            assert!(!t.env.storage().persistent().has(&DataKey::ClaimedV1(user2.clone(), 1)));
        });
    }

    #[test]
    #[should_panic(expected = "not admin")]
    fn test_migration_non_admin_rejected() {
        let t = setup();
        let admin = Address::generate(&t.env);
        let outsider = Address::generate(&t.env);

        let rewards_id = t.env.register_contract(None, RewardsContract);
        let rewards = RewardsContractClient::new(&t.env, &rewards_id);
        rewards.initialize(&admin, &t.token.address, &t.campaign.address);

        let entries: soroban_sdk::Vec<(Address, u64)> = soroban_sdk::Vec::new(&t.env);
        rewards.migrate_v1_to_v2(&outsider, &entries);
    }
}
