import { test, expect, type Page } from "@playwright/test";
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
test("fast real work stays in the six-second presentation and releases accurate results", async ({
  page,
}) => {
  await page.goto("/");
  await select(page);
  const start = Date.now();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByLabel("Analysis progress")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Calculations ready" }),
  ).toBeVisible({ timeout: 4000 });
  expect(Date.now() - start).toBeLessThan(5000);
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).not.toHaveAttribute(
    "aria-valuenow",
    "6",
  );
  await expect(page.getByTestId("image-dna")).toBeVisible();
  expect(Date.now() - start).toBeGreaterThanOrEqual(6000);
  await expect(page.getByTestId("image-dna")).toContainText("255 / 0 / 0");
  await expect(page.getByLabel("Analysis progress")).toHaveCount(0);
});
test("a slow worker response cannot reveal results at six seconds", async ({
  page,
}) => {
  // Delay only test transport of the genuine worker result; production code and
  // pixel calculations are untouched. This simulates a busy worker/device.
  await page.addInitScript(() => {
    const Native = Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.result && !event.data.testDelayed) {
            event.stopImmediatePropagation();
            setTimeout(
              () =>
                this.dispatchEvent(
                  new MessageEvent("message", {
                    data: { ...event.data, testDelayed: true },
                  }),
                ),
              8000,
            );
          }
        });
      }
    };
  });
  await page.goto("/");
  await select(page);
  const start = Date.now();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await page.waitForTimeout(6500);
  await expect(page.getByLabel("Analysis progress")).toBeVisible();
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).not.toHaveAttribute(
    "aria-valuenow",
    "6",
  );
  await expect(page.getByTestId("image-dna")).toBeVisible();
  expect(Date.now() - start).toBeGreaterThanOrEqual(8000);
  await expect(page.getByTestId("image-dna")).toContainText("255 / 0 / 0");
});
test("replacing a buffered completed image starts an independent timer and drops the old result", async ({
  page,
}) => {
  await page.goto("/");
  await select(page);
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Calculations ready" }),
  ).toBeVisible();
  await select(page, "green.png", "#00ff00");
  await expect(page.getByLabel("Analysis progress")).toHaveCount(0);
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  const start = Date.now();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  expect(Date.now() - start).toBeGreaterThanOrEqual(6000);
  await expect(page.getByTestId("image-dna")).toContainText("0 / 255 / 0");
  await expect(page.getByTestId("image-dna")).not.toContainText("#FF0000");
});
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`loading layout, cancellation and lighter motion at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await select(page);
    await page.getByRole("button", { name: "Analyze image" }).click();
    await expect(page.locator(".loading-stages li")).toHaveCount(6);
    await expect(page.locator(".dna-read-line")).toHaveCSS(
      "animation-name",
      "gentle-presence",
    );
    await expect(page.locator(".loading-heading h2")).toHaveText(
      "Reading image.",
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
    await expect(page.getByLabel("Analysis progress")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Analyze image" }),
    ).toBeEnabled();
    await page.waitForTimeout(6100);
    await expect(page.getByTestId("image-dna")).toHaveCount(0);
  });
}
