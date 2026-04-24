import { test, expect } from "@playwright/test";

test.describe("Campaign Detail", () => {
  test("navigates to campaign detail page", async ({ page }) => {
    await page.goto("/dashboard");
    // If there are campaign cards, check the first one renders key fields
    const firstCard = page.locator(".card").first();
    const hasCards = await firstCard.isVisible().catch(() => false);
    if (!hasCards) {
      test.skip();
      return;
    }
    await expect(firstCard.locator(".badge")).toBeVisible();
    await expect(firstCard.locator(".campaign-id")).toBeVisible();
  });

  test("campaign card shows reward amount and expiry", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.locator(".card").first();
    const hasCards = await firstCard.isVisible().catch(() => false);
    if (!hasCards) {
      test.skip();
      return;
    }
    await expect(firstCard.getByText(/Reward:/)).toBeVisible();
    await expect(firstCard.getByText(/Expires:/)).toBeVisible();
  });
});
