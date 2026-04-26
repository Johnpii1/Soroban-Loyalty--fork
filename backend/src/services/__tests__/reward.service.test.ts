import { createRewardClaim, DuplicateClaimError, getRewardsByUser, explainRewardsByUserQuery } from "../reward.service";
import { pool } from "../../db";

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe("reward.service optimized query", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches rewards and campaign data with a single JOIN query", async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: "reward-id",
          user_address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          campaign_id: 1,
          amount: 100,
          redeemed: false,
          redeemed_amount: 0,
          claimed_at: new Date("2026-01-01T00:00:00.000Z"),
          campaign_reward: 100,
        },
      ],
    });

    const address = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const rewards = await getRewardsByUser(address);

    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toHaveProperty("campaign_id", 1);
    expect(rewards[0]).toHaveProperty("campaign_reward", 100);
    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
    expect(sql).toContain("JOIN campaigns");
    expect(sql).toContain("WHERE r.user_address = $1");
    expect(params).toEqual([address]);
  });

  it("builds EXPLAIN ANALYZE plan for the optimized query", async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        { "QUERY PLAN": "Nested Loop  (cost=0.15..8.17 rows=1 width=96)" },
        { "QUERY PLAN": "  ->  Index Scan using idx_rewards_user on rewards r" },
      ],
    });

    const plan = await explainRewardsByUserQuery(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    );

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql] = (pool.query as jest.Mock).mock.calls[0];
    expect(sql).toContain("EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)");
    expect(sql).toContain("JOIN campaigns");
    expect(plan[0]).toContain("Nested Loop");
  });

  it("maps unique constraint violations to DuplicateClaimError", async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce({ code: "23505" });

    await expect(
      createRewardClaim({
        user_address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        campaign_id: 1,
        amount: 100,
        redeemed: false,
        redeemed_amount: 0,
      })
    ).rejects.toBeInstanceOf(DuplicateClaimError);
  });
});
