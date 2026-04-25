import { pool } from "../db";

export interface Campaign {
  id: number;
  merchant: string;
  reward_amount: number;
  expiration: number;
  active: boolean;
  total_claimed: number;
  display_order: number;
  tx_hash?: string;
  created_at: Date;
}

export async function upsertCampaign(c: Omit<Campaign, "created_at" | "display_order">): Promise<void> {
  await pool.query(
    `INSERT INTO campaigns (id, merchant, reward_amount, expiration, active, total_claimed, tx_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       active = EXCLUDED.active,
       total_claimed = EXCLUDED.total_claimed,
       updated_at = NOW()`,
    [c.id, c.merchant, c.reward_amount, c.expiration, c.active, c.total_claimed, c.tx_hash ?? null]
  );
}

export async function getCampaigns(limit = 20, offset = 0): Promise<{ campaigns: Campaign[]; total: number }> {
  const { rows } = await pool.query<Campaign>(
    `SELECT * FROM campaigns ORDER BY display_order ASC, created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: countRows } = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM campaigns`);
  return { campaigns: rows, total: parseInt(countRows[0].count, 10) };
}

export async function getCampaignById(id: number): Promise<Campaign | null> {
  const { rows } = await pool.query<Campaign>(
    `SELECT * FROM campaigns WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Persists the display order of campaigns.
 * @param order - Array of campaign IDs in the desired display order.
 */
export async function reorderCampaigns(order: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < order.length; i++) {
      await client.query(
        `UPDATE campaigns SET display_order = $1 WHERE id = $2`,
        [i, order[i]]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
