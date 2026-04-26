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

        campaign_client.record_claim(&campaign_id);
        Self::token_client(&env).mint(&user, &campaign.reward_amount);

        env.events().publish(
            (REWARD_CLAIMED, symbol_short!("user"), user.clone()),
            (campaign_id, campaign.reward_amount),
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
        testutils::{Address as _, Ledger},
        Env,
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
        campaign.initialize(&admin);

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

        assert_eq!(t.token.balance(&user), 500);
        assert!(t.rewards.has_claimed_view(&user, &cid));
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
        t.rewards.redeem_reward(&user, &200);

        assert_eq!(t.token.balance(&user), 300);
        assert_eq!(t.token.total_supply_view(), 300);
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

        assert_eq!(t.token.balance(&user1), 100);
        assert_eq!(t.token.balance(&user2), 100);
        assert_eq!(t.token.total_supply_view(), 200);
    }
}
