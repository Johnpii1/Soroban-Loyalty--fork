import { pool } from "../db";

export interface AnalyticsData {
  totalClaims: number;
  totalLYT: number;
  redemptionRate: number;
  claimsPerCampaign: { name: string; claims: number }[];
  claimsOverTime: { date: string; claims: number }[];
}

export async function getAnalytics(days: number): Promise<AnalyticsData> {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

  const [totals, perCampaign, overTime] = await Promise.all([
    pool.query<{ total_claims: string; total_lyt: string; redeemed: string }>(
      `SELECT
         COUNT(*) AS total_claims,
         COALESCE(SUM(r.amount), 0) AS total_lyt,
         COUNT(*) FILTER (WHERE r.redeemed) AS redeemed
       FROM rewards r
       WHERE r.claimed_at >= $1`,
      [since]
    ),
    pool.query<{ campaign_id: number; claims: string }>(
      `SELECT campaign_id, COUNT(*) AS claims
       FROM rewards
       WHERE claimed_at >= $1
       GROUP BY campaign_id
       ORDER BY claims DESC
       LIMIT 10`,
      [since]
    ),
    pool.query<{ date: string; claims: string }>(
      `SELECT DATE(claimed_at) AS date, COUNT(*) AS claims
       FROM rewards
       WHERE claimed_at >= $1
       GROUP BY DATE(claimed_at)
       ORDER BY date ASC`,
      [since]
    ),
  ]);

  const { total_claims, total_lyt, redeemed } = totals.rows[0];
  const totalClaimsNum = parseInt(total_claims, 10);
  const redeemedNum = parseInt(redeemed, 10);

  return {
    totalClaims: totalClaimsNum,
    totalLYT: parseFloat(total_lyt),
    redemptionRate: totalClaimsNum > 0 ? Math.round((redeemedNum / totalClaimsNum) * 100) : 0,
    claimsPerCampaign: perCampaign.rows.map((r) => ({
      name: `#${r.campaign_id}`,
      claims: parseInt(r.claims, 10),
    })),
    claimsOverTime: overTime.rows.map((r) => ({
      date: r.date,
      claims: parseInt(r.claims, 10),
    })),
  };
}
