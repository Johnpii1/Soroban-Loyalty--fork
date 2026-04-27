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
 * @openapi
 * /campaigns:
 *   get:
 *     summary: List all campaigns
 *     description: Returns a paginated list of all campaigns stored in the database.
 *     tags: [Campaigns]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of campaigns to return.
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of campaigns to skip.
 *     responses:
 *       200:
 *         description: A list of campaigns.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Campaign'
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
campaignRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 100);
  const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;
  const result = await getCampaigns(limit, offset);
  res.json(result);
}));

/**
 * @openapi
 * /campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     description: Returns a single campaign by its unique identifier.
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The campaign ID.
 *     responses:
 *       200:
 *         description: Campaign details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaign:
 *                   $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: Invalid ID.
 *       404:
 *         description: Campaign not found.
 *       500:
 *         description: Server error.
 */
campaignRouter.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError("Invalid id", { id: req.params.id });
  }
  const campaign = await getCampaignById(id);
  if (!campaign) {
    throw new NotFoundError("Campaign");
  }
  res.json({ campaign });
}));

const ReorderSchema = z.object({
  order: z.array(z.number().int().positive()),
});

/**
 * @openapi
 * /campaigns/reorder:
 *   patch:
 *     summary: Reorder campaigns
 *     description: Persists the display order of campaigns for a merchant.
 *     tags: [Campaigns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order
 *             properties:
 *               order:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of campaign IDs in the desired display order.
 *     responses:
 *       200:
 *         description: Reorder successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       400:
 *         description: Invalid request body.
 *       500:
 *         description: Server error.
 */
campaignRouter.patch("/reorder", asyncHandler(async (req: Request, res: Response) => {
  const parsed = ReorderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError("Invalid request body", { errors: parsed.error.errors });
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
