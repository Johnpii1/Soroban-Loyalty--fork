import { pool } from "../db";

export interface Campaign {
  id: number;
  merchant: string;
  reward_amount: number;
  expiration: number;
  active: boolean;
  total_claimed: number;
  tx_hash?: string;
  created_at: Date;
}

export async function upsertCampaign(c: Omit<Campaign, "created_at">): Promise<void> {
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

export async function getCampaigns(): Promise<Campaign[]> {
  const { rows } = await pool.query<Campaign>(
    `SELECT * FROM campaigns ORDER BY created_at DESC`
  );
  return rows;
}

export async function getCampaignById(id: number): Promise<Campaign | null> {
  const { rows } = await pool.query<Campaign>(
    `SELECT * FROM campaigns WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
