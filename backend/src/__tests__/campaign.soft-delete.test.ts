import {
  getCampaigns,
  getCampaignById,
  softDeleteCampaign,
  restoreCampaign,
} from "../services/campaign.service";

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockQuery: jest.Mock = require("../db").pool.query;

const baseCampaign = {
  id: 1,
  merchant: "GABC",
  reward_amount: 100,
  expiration: 9999999999,
  active: true,
  total_claimed: 0,
  display_order: 0,
  created_at: new Date(),
  deleted_at: null,
};

describe("campaign soft delete", () => {
  afterEach(() => jest.clearAllMocks());

  it("getCampaigns filters deleted_at IS NULL", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [baseCampaign] })
      .mockResolvedValueOnce({ rows: [{ count: "1" }] });

    const result = await getCampaigns();

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [listSql] = mockQuery.mock.calls[0];
    expect(listSql).toContain("deleted_at IS NULL");
    const [countSql] = mockQuery.mock.calls[1];
    expect(countSql).toContain("deleted_at IS NULL");
    expect(result.total).toBe(1);
  });

  it("getCampaignById filters deleted_at IS NULL", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [baseCampaign] });

    await getCampaignById(1);

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("deleted_at IS NULL");
  });

  it("getCampaignById returns null for soft-deleted campaign", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getCampaignById(1);

    expect(result).toBeNull();
  });

  it("softDeleteCampaign sets deleted_at and returns true", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await softDeleteCampaign(1);

    expect(result).toBe(true);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("SET deleted_at = NOW()");
    expect(sql).toContain("deleted_at IS NULL");
  });

  it("softDeleteCampaign returns false when campaign not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const result = await softDeleteCampaign(99);

    expect(result).toBe(false);
  });

  it("restoreCampaign clears deleted_at and returns true", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await restoreCampaign(1);

    expect(result).toBe(true);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("SET deleted_at = NULL");
    expect(sql).toContain("deleted_at IS NOT NULL");
  });

  it("restoreCampaign returns false when campaign not soft-deleted", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const result = await restoreCampaign(1);

    expect(result).toBe(false);
  });
});
