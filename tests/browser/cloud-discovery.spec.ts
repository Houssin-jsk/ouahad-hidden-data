import { test, expect } from "@playwright/test";
import { availabilityFixture } from "../fixtures/cloud-availability";
import { handleAvailability } from "../../src/cloud-vision/server/availability";
for (const width of [390, 1280])
  test(`anonymous discovery and consent at ${width}px without inference`, async ({
    page,
  }) => {
    const f = availabilityFixture();
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST") posts++;
    });
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/cloud-vision/status", async (route) => {
      const r = await handleAvailability(f.request(), f.env, {
        ledger: f.ledger,
        adapters: [f.adapter],
      });
      await route.fulfill({
        status: r.status,
        body: await r.text(),
        headers: Object.fromEntries(r.headers),
      });
    });
    try {
      await page.goto("/");
      await page
        .getByLabel("Choose image")
        .setInputFiles("tests/fixtures/phase01/red.png");
      await page
        .getByRole("button", { name: "Analyze image", exact: true })
        .click();
      await expect(page.getByTestId("image-dna")).toBeVisible();
      await expect(page.locator(".cloud-availability")).toContainText(
        "AI available",
      );
      await expect(page.getByLabel("Pilot access code")).toHaveCount(0);
      const start = page.getByRole("button", {
        name: "Start Cloud AI analysis",
      });
      await expect(start).toBeDisabled();
      await page.getByLabel(/I am 18 or older/).check();
      await expect(start).toBeDisabled();
      await page.getByLabel(/I agree to send/).check();
      await expect(start).toBeEnabled();
      expect(posts).toBe(0);
      expect(f.providerCalls()).toBe(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/public-ai-${width}.png`,
        fullPage: true,
      });
      f.db.exec("UPDATE providers SET enabled=0");
      await page.reload();
      await page
        .getByLabel("Choose image")
        .setInputFiles("tests/fixtures/phase01/red.png");
      await page
        .getByRole("button", { name: "Analyze image", exact: true })
        .click();
      await expect(page.locator(".cloud-availability")).toContainText(
        "currently unavailable",
      );
      expect(posts).toBe(0);
    } finally {
      f.db.close();
    }
  });
