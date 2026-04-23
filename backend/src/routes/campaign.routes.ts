import { Router, Request, Response } from "express";
import { z } from "zod";
import { getCampaigns, getCampaignById } from "../services/campaign.service";

export const campaignRouter = Router();

campaignRouter.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 100);
    const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;
    const result = await getCampaigns(limit, offset);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

campaignRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) return res.status(404).json({ error: "Not found" });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});
