import { Router, Request, Response } from "express";
import { getAnalytics } from "../services/analytics.service";

export const analyticsRouter = Router();

analyticsRouter.get("/", async (req: Request, res: Response) => {
  const days = Math.min(Math.max(parseInt(req.query.days as string, 10) || 30, 1), 365);
  try {
    const data = await getAnalytics(days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});
