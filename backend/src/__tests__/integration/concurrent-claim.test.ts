import request from "supertest";
import { createApp } from "../../app";
import { pool } from "../../db";
import { SEEDED_USER_ADDRESS, setupIntegrationDatabase, teardownIntegrationDatabase } from "./testDb";

describe("concurrent reward claim protection", () => {
  const app = createApp();

  beforeAll(async () => {
    await setupIntegrationDatabase();
  });

  afterAll(async () => {
    await teardownIntegrationDatabase();
  });

  it("allows only one successful claim out of 10 simultaneous requests", async () => {
    const payload = { campaign_id: 2, amount: 250 };

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).post(`/user/${SEEDED_USER_ADDRESS}/rewards/claim`).send(payload)
      )
    );

    const statusCounts = responses.reduce<Record<number, number>>((acc, response) => {
      acc[response.status] = (acc[response.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(statusCounts[201] ?? 0).toBe(1);
    expect(statusCounts[409] ?? 0).toBe(9);

    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM rewards
       WHERE user_address = $1 AND campaign_id = $2`,
      [SEEDED_USER_ADDRESS, payload.campaign_id]
    );

    expect(parseInt(rows[0].count, 10)).toBe(1);
  });
});
