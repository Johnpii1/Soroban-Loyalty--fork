import { Router, Request, Response } from "express";
import { getTransactionsByUser } from "../services/transaction.service";

export const transactionRouter = Router();

/**
 * GET /user/:address/transactions
 * Returns paginated transaction history for a specific user.
 */
transactionRouter.get("/user/:address/transactions", async (req: Request, res: Response) => {
  const { address } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  if (!address || address.length !== 56) {
    return res.status(400).json({ error: "Invalid Stellar address" });
  }

  try {
    const data = await getTransactionsByUser(address, limit, offset);
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});
