#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

// ── Cross-contract interfaces ─────────────────────────────────────────────────
// We define minimal client traits via contractimport for production.
// Tests use the real crate clients directly.

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
    Claimed(Address, u64),
    TokenContract,
    CampaignContract,
    Admin,
}

// ── Events ────────────────────────────────────────────────────────────────────

const REWARD_CLAIMED: Symbol = symbol_short!("RWD_CLM");
const REWARD_REDEEMED: Symbol = symbol_short!("RWD_RDM");

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
        env.storage()
            .persistent()
            .has(&DataKey::Claimed(user.clone(), campaign_id))
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

        // Write claimed state before external mint (reentrancy guard)
        env.storage()
            .persistent()
            .set(&DataKey::Claimed(user.clone(), campaign_id), &true);

        let multiplier_bp = Self::calc_multiplier(
            env.ledger().timestamp(),
            campaign.created_at,
            campaign.expiration,
        );
        let final_amount = (campaign.reward_amount * multiplier_bp as i128) / 10_000;

        campaign_client.record_claim(&campaign_id);
        Self::token_client(&env).mint(&user, &final_amount);

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
        assert_eq!(t.token.balance(&user1), 100);
        assert_eq!(t.token.balance(&user2), 100);
        assert_eq!(t.token.total_supply_view(), 200);
    }
}
