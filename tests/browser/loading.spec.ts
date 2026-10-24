import { test, expect, type Page } from "@playwright/test";
import {
  holdAnalysis,
  waitHeld,
  releaseAnalysis,
  setAnalysisHold,
} from "./helpers/held-analysis";
async function select(page: Page, name = "red.png", color = "#ff0000") {
  const png = await page.evaluate((color) => {
    const c = document.createElement("canvas");
    c.width = 80;
    c.height = 40;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 80, 40);
    return c.toDataURL().split(",")[1];
  }, color);
  await page.getByLabel("Choose image").setInputFiles({
    name,
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
}
test("fast real work releases accurate results without a presentation minimum", async ({
  page,
}) => {
  await page.goto("/");
  await select(page);
  const start = Date.now();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  expect(Date.now() - start).toBeLessThan(5500);
  await expect(page.getByTestId("image-dna")).toContainText("#FF0000");
  await page.getByText("Technical details", { exact: true }).click();
  await expect(page.getByTestId("technical-summary")).toContainText(
    "255 / 0 / 0",
  );
  await expect(page.getByLabel("Analysis progress")).toHaveCount(0);
});

test("an unfinished worker cannot reveal results; genuine completion releases immediately", async ({
  page,
}) => {
  await holdAnalysis(page);
  await page.goto("/");
  await select(page);
  await page.getByRole("button", { name: "Analyze image" }).click();
  await waitHeld(page);
  await expect(page.getByLabel("Analysis progress")).toBeVisible();
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).not.toHaveAttribute(
    "aria-valuenow",
    "6",
  );
  const release = Date.now();
  await releaseAnalysis(page);
  await expect(page.getByTestId("image-dna")).toBeVisible();
  expect(Date.now() - release).toBeLessThan(2500);
  await expect(page.getByTestId("image-dna")).toContainText("#FF0000");
});

test("replacement rejects a late result and analyzes only the new selection", async ({
  page,
}) => {
  await holdAnalysis(page);
  await page.goto("/");
  await select(page);
  await page.getByRole("button", { name: "Analyze image" }).click();
  await waitHeld(page);
  await select(page, "green.png", "#00ff00");
  await releaseAnalysis(page);
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  await setAnalysisHold(page, false);
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByTestId("image-dna")).toContainText("#00FF00");
  await expect(page.getByTestId("image-dna")).not.toContainText("#FF0000");
});
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`real progress, cancellation and reduced motion at ${viewport.width}px`, async ({
    page,
  }) => {
    await holdAnalysis(page);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await select(page);
    await page.getByRole("button", { name: "Analyze image" }).click();
    await waitHeld(page);
    await expect(page.locator(".loading-stages li")).toHaveCount(6);
    await expect(page.locator(".loading-preview img")).toHaveAttribute(
      "src",
      /^blob:/,
    );
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      /milestones, not a percentage/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/loading-${viewport.width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel analysis" }).click();
    await releaseAnalysis(page);
    await expect(page.getByLabel("Analysis progress")).toHaveCount(0);
    await expect(page.getByTestId("image-dna")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Analyze image" }),
    ).toBeFocused();
  });
}
