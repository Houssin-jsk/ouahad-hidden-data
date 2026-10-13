import { test, expect, type Page } from "@playwright/test";
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
test("illustration advances through all six views using real colors, histogram and maps", async ({
  page,
}) => {
  await start(page);
  await expect(page.locator(".dna-phase-0 .dna-source-image")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(page.locator(".dna-phase-1 .dna-sampling-grid i")).toHaveCount(
    48,
  );
  await expect(page.locator(".dna-phase-1 figcaption")).toContainText(
    "schematic",
  );
  await expect(page.locator(".dna-phase-2 .dna-palette-codes")).toContainText(
    "#3590DF",
  );
  await expect(page.locator(".dna-phase-2 .dna-palette-codes")).toContainText(
    "#F3A339",
  );
  await expect(page.locator(".dna-phase-3 .dna-histogram rect")).toHaveCount(
    32,
  );
  const shares = await page
    .locator(".dna-phase-3 .dna-histogram rect")
    .evaluateAll((elements) =>
      elements.map((e) => Number(e.getAttribute("data-share"))),
    );
  expect(Math.abs(shares.reduce((sum, v) => sum + v, 0) - 1)).toBeLessThan(
    0.000001,
  );
  await expect(page.locator(".dna-phase-4 .dna-source-image")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(page.locator(".dna-phase-4 figcaption")).toContainText("Sobel");
  await expect(page.locator(".dna-phase-5 .dna-report-lines")).toContainText(
    /Average color[\s\S]*Generated locally/,
  );
  await expect(page.getByTestId("image-dna")).toBeVisible();
});
test("cancelling a buffered visual result revokes its temporary map URLs", async ({
  page,
}) => {
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
  await expect(
    page.getByRole("status").filter({ hasText: "Calculations ready" }),
  ).toBeVisible();
  const created = await page.evaluate(
    () => (window as unknown as { created: string[] }).created,
  );
  expect(created.length).toBe(3);
  await page.getByRole("button", { name: "Cancel analysis" }).click();
  const revoked = await page.evaluate(
    () => (window as unknown as { revoked: string[] }).revoked,
  );
  expect(revoked).toEqual(expect.arrayContaining(created.slice(1)));
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
});
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`image-led loading presentation at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await start(page);
    await expect(page.locator(".dna-phase-2 .dna-palette-codes")).toContainText(
      "#3590DF",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/loading-palette-${viewport.width}.png`,
      fullPage: true,
    });
    await expect(page.locator(".dna-phase-4")).toBeVisible();
    await page.screenshot({
      path: `test-results/loading-detail-${viewport.width}.png`,
      fullPage: true,
    });
    await expect(page.getByTestId("image-dna")).toBeVisible();
  });
}
