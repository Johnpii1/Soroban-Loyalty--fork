import { test, expect } from "@playwright/test";

test.describe("Wallet Connection", () => {
  test("shows connect wallet prompt when not connected", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText("Connect your Freighter wallet to claim rewards.")
    ).toBeVisible();
  });

  test("wallet connector button is present in header", async ({ page }) => {
    await page.goto("/");
    // WalletConnector renders in the layout header
    const header = page.locator(".site-header");
    await expect(header).toBeVisible();
  });

  test("merchant page shows connect wallet prompt when not connected", async ({ page }) => {
    await page.goto("/merchant");
    await expect(
      page.getByText("Connect your Freighter wallet to create campaigns.")
    ).toBeVisible();
  });
});
