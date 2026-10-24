import { test, expect, type Page } from "@playwright/test";
import {
  holdAnalysis,
  waitHeld,
  releaseAnalysis,
} from "./helpers/held-analysis";
async function start(page: Page) {
  await page.goto("/");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 80;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3590df";
    ctx.fillRect(0, 0, 60, 80);
    ctx.fillStyle = "#f3a339";
    ctx.fillRect(60, 0, 60, 80);
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Choose image").setInputFiles({
    name: "blue-orange.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.getByRole("button", { name: "Analyze image" }).click();
}
test("loading uses the selected image; released colors, histogram and maps are real", async ({
  page,
}) => {
  await holdAnalysis(page);
  await start(page);
  await waitHeld(page);
  await expect(page.locator(".loading-preview img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(page.locator(".palette-list")).toHaveCount(0);
  await releaseAnalysis(page);
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await expect(page.locator(".palette-list")).toContainText("#3590DF");
  await expect(page.locator(".palette-list")).toContainText("#F3A339");
  await expect(page.locator(".palette-list")).toContainText("50.0%");
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await expect(page.locator(".histogram > div")).toHaveCount(32);
  const shares = await page
    .locator(".histogram > div")
    .evaluateAll((elements) =>
      elements.map((e) =>
        Number(e.getAttribute("data-tooltip")!.split(": ")[1].replace("%", "")),
      ),
    );
  expect(shares.reduce((sum, v) => sum + v, 0)).toBe(100);
  expect(shares.filter((v) => v === 50)).toHaveLength(2);
  await page.locator(".map-explorer > summary").click();
  await page.getByRole("button", { name: "Detail", exact: true }).click();
  await expect(page.getByRole("img", { name: /Detail map/ })).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page.getByText("Map technical details", { exact: true }).click();
  await expect(page.locator(".map-description")).toContainText("Sobel");
});

test("completed source and map URLs are revoked on clear", async ({ page }) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    Object.assign(window, { created: [] as string[], revoked: [] as string[] });
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      (window as unknown as { created: string[] }).created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      (window as unknown as { revoked: string[] }).revoked.push(url);
      revoke(url);
    };
  });
  await start(page);
  await expect(page.getByTestId("image-dna")).toBeVisible();
  const created = await page.evaluate(
    () => (window as unknown as { created: string[] }).created,
  );
  expect(created).toHaveLength(3);
  await page.getByRole("button", { name: "Clear image" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { revoked: string[] }).revoked,
    ),
  ).toEqual(expect.arrayContaining(created));
});
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`selected-image loading presentation at ${viewport.width}px`, async ({
    page,
  }) => {
    await holdAnalysis(page);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await start(page);
    await waitHeld(page);
    await expect(page.locator(".loading-preview img")).toBeVisible();
    const motion = await page
      .locator(".processing-dots i")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName);
    expect(motion).toBe("none");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/loading-preview-${viewport.width}.png`,
      fullPage: true,
    });
    await releaseAnalysis(page);
    await expect(page.getByTestId("image-dna")).toBeVisible();
  });
}
