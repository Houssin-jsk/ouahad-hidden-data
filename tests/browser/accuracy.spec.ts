import { openDetails } from "./helpers/disclosures";
import { test, expect, type Page } from "@playwright/test";
type Pattern = "checker" | "gradient" | "partial" | "solid";
async function selectPattern(
  page: Page,
  pattern: Pattern,
  width: number,
  height: number,
) {
  const fixture = await page.evaluate(
    ({ pattern, width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const data = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (pattern === "partial")
            data.data.set(
              x < width / 2 ? [255, 0, 0, 255] : [0, 0, 255, 85],
              i,
            );
          else {
            const v =
              pattern === "checker"
                ? ((x + y) % 2) * 255
                : pattern === "gradient"
                  ? Math.floor((x * 256) / width)
                  : 128;
            data.data.set([v, v, v, 255], i);
          }
        }
      ctx.putImageData(data, 0, 0);
      // Reproduce the old resized measurement as a regression control.
      const old = document.createElement("canvas");
      old.width = 512;
      old.height = Math.round((height * 512) / width);
      const oldContext = old.getContext("2d")!;
      oldContext.drawImage(canvas, 0, 0, old.width, old.height);
      const oldPixels = oldContext.getImageData(
        0,
        0,
        old.width,
        old.height,
      ).data;
      let oldAverage = 0;
      for (let i = 0; i < oldPixels.length; i += 4) oldAverage += oldPixels[i];
      return {
        encoded: canvas.toDataURL().split(",")[1],
        oldAverage: oldAverage / (oldPixels.length / 4),
      };
    },
    { pattern, width, height },
  );
  await page.getByLabel("Choose image").setInputFiles({
    name: `${pattern}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(fixture.encoded, "base64"),
  });
  const start = Date.now();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await openDetails(page, "Technical details");
  console.log(
    `${pattern} ${width}×${height}: analyze-to-result ${Date.now() - start} ms`,
  );
  return fixture;
}
test("decoded fine checkerboard retains original colors and luminance, not resized gray", async ({
  page,
}) => {
  await page.goto("/");
  const fixture = await selectPattern(page, "checker", 2048, 2048);
  expect(Math.abs(fixture.oldAverage - 128)).toBeLessThan(1);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "native-pixel sample",
  );
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await expect(page.locator(".palette-list")).toContainText("#000000");
  await expect(page.locator(".palette-list")).toContainText("#FFFFFF");
  const average = await page.locator(".average-color small").innerText();
  for (const channel of average.match(/\d+/g)!.map(Number))
    expect(Math.abs(channel - 127.5)).toBeLessThan(1);
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats")).toContainText("≈ 0.50");
  const bars = page.locator(".histogram > div");
  expect(await bars.count()).toBe(32);
  for (let i = 1; i < 31; i++)
    await expect(bars.nth(i)).toHaveCSS("height", "0px");
  const mean = await page.locator(".light-stats dd").first().innerText();
  const spread = await page.locator(".light-stats dd").nth(1).innerText();
  expect(mean).toBe("≈ 0.50");
  expect(spread).toBe("≈ 0.50");
  await page.getByLabel("Choose image").setInputFiles({
    name: "repeat.png",
    mimeType: "image/png",
    buffer: Buffer.from(fixture.encoded, "base64"),
  });
  await page.getByRole("button", { name: "Analyze image" }).click();
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats dd").first()).toHaveText(mean);
  await expect(page.locator(".light-stats dd").nth(1)).toHaveText(spread);
});
test("decoded grayscale ramp has correct native means and every expected histogram bin", async ({
  page,
}) => {
  await page.goto("/");
  await selectPattern(page, "gradient", 256, 128);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "All decoded pixels",
  );
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats dd").first()).toHaveText("0.311");
  await expect(page.locator(".light-stats dd").nth(1)).toHaveText("0.294");
  const counts = [
    50, 21, 16, 13, 11, 9, 9, 8, 8, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 5, 4, 4,
    4, 4, 4, 4, 4, 3, 4, 4,
  ];
  for (let i = 0; i < 32; i++)
    await expect(page.locator(".histogram>div").nth(i)).toHaveAttribute(
      "data-tooltip",
      new RegExp(
        `${((counts[i] / 256) * 100).toFixed(1).replace(".", "\\.")}%$`,
      ),
    );
  await selectPattern(page, "gradient", 4096, 1024);
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats dd").first()).toHaveText("≈ 0.31");
  await expect(page.locator(".light-stats dd").nth(1)).toHaveText("≈ 0.29");
});
test("decoded partially transparent PNG has alpha-weighted color shares and coverage", async ({
  page,
}) => {
  await page.goto("/");
  await selectPattern(page, "partial", 200, 100);
  await expect(page.locator(".sample-note")).toContainText(
    "66.7% opacity-weighted coverage",
  );
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await expect(page.locator(".average-color")).toContainText(
    "RGB 191 / 0 / 64",
  );
  await expect(page.locator(".palette-list")).toContainText("75.0%");
  await expect(page.locator(".palette-list")).toContainText("25.0%");
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats dd").first()).toHaveText("0.178");
  await expect(page.locator(".light-stats dd").nth(1)).toHaveText("0.061");
});
test("uniform image has one family, exactly zero spread, and an honest DNA summary", async ({
  page,
}) => {
  await page.goto("/");
  await selectPattern(page, "solid", 1024, 1024);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "average RGB 128 / 128 / 128",
  );
  await expect(page.getByTestId("technical-summary")).toContainText(
    "#808080, about 100%",
  );
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats dd").nth(1)).toHaveText("≈ 0.00");
});
test("replacement during worker computation discards old results", async ({
  page,
}) => {
  await page.goto("/");
  const fixture = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 4000;
    c.height = 3000;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Choose image").setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.from(fixture, "base64"),
  });
  await page.getByRole("button", { name: "Analyze image" }).click();
  await selectPattern(page, "solid", 100, 50);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "100 × 50 PNG",
  );
  await expect(page.getByTestId("technical-summary")).toContainText("#808080");
  await expect(page.getByTestId("technical-summary")).not.toContainText(
    "#FF0000",
  );
});
