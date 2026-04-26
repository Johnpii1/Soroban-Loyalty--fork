import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  getCampaigns,
  getCampaignById,
  reorderCampaigns,
  softDeleteCampaign,
  restoreCampaign,
} from "../services/campaign.service";

export const campaignRouter = Router();

/**
 * GET /campaigns
 * Returns a list of all campaigns stored in the database.
 */
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

/**
 * GET /campaigns/:id
 * Returns a single campaign by its ID.
 */
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

const ReorderSchema = z.object({
  order: z.array(z.number().int().positive()),
});

/**
 * PATCH /campaigns/reorder
 * Persists the display order of campaigns for a merchant.
 * Body: { order: number[] }  — array of campaign IDs in desired order
 */
campaignRouter.patch("/reorder", async (req: Request, res: Response) => {
  const parsed = ReorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "order must be an array of campaign IDs" });
  try {
    await reorderCampaigns(parsed.data.order);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reorder campaigns" });
  }
});

/**
 * DELETE /campaigns/:id
 * Soft-deletes a campaign by setting deleted_at.
 */
campaignRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const deleted = await softDeleteCampaign(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

/**
 * POST /campaigns/:id/restore
 * Restores a soft-deleted campaign.
 */
campaignRouter.post("/:id/restore", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const restored = await restoreCampaign(id);
    if (!restored) return res.status(404).json({ error: "Not found or not deleted" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to restore campaign" });
  }
});
