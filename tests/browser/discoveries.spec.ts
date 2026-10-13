import { test, expect, type Page } from "@playwright/test";
import { withExif, withPngSoftware } from "../fixtures/exif";
async function fixture(
  page: Page,
  name = "step.png",
  width = 100,
  height = 60,
  format = "image/png",
  texture = false,
) {
  const encoded = await page.evaluate(
    ({ width, height, format, texture }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      if (texture) {
        const d = ctx.createImageData(width, height);
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++)
            d.data.set(
              [x % 256, y % 256, ((x * 73) ^ (y * 151)) % 256, 255],
              (y * width + x) * 4,
            );
        ctx.putImageData(d, 0, 0);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width / 2, height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(width / 2, 0, width, height);
      }
      return canvas.toDataURL(format).split(",")[1];
    },
    { width, height, format, texture },
  );
  return { name, mimeType: format, buffer: Buffer.from(encoded, "base64") };
}
async function analyze(page: Page, file: Awaited<ReturnType<typeof fixture>>) {
  await page.getByLabel("Choose image").setInputFiles(file);
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
}
test("EXIF fields, recorded orientation, explicit GPS privacy and replacement", async ({
  page,
}) => {
  const outbound: string[] = [];
  const issues: string[] = [];
  page.on("request", (r) => {
    if (
      !["GET"].includes(r.method()) ||
      (!r.url().startsWith("http://127.0.0.1:3001") &&
        !r.url().startsWith("blob:") &&
        !r.url().startsWith("data:"))
    )
      outbound.push(r.method());
  });
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) issues.push(m.type());
  });
  await page.goto("/");
  const base = await fixture(page, "camera.jpg", 100, 60, "image/jpeg");
  await analyze(page, { ...base, buffer: Buffer.from(withExif(base.buffer)) });
  await expect(page.locator(".properties")).toContainText("60 × 100");
  await page.getByRole("tab", { name: "Metadata", exact: true }).click();
  await expect(page.locator(".metadata-fields").first()).toContainText(
    "OUAHAD TEST",
  );
  await expect(page.locator(".metadata-fields").first()).toContainText(
    "Rotated 90° clockwise",
  );
  await expect(page.getByLabel("Revealed location")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("12.50000");
  await expect(page.locator(".location-disclosure")).toContainText(
    "Coordinates can reveal",
  );
  await page
    .getByRole("button", { name: "Reveal location on this screen" })
    .click();
  await expect(page.getByLabel("Revealed location")).toContainText("12.50000");
  await page.getByRole("button", { name: "Hide location" }).click();
  await expect(page.getByLabel("Revealed location")).toHaveCount(0);
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.getByRole("img", { name: /Light map/ })).toHaveJSProperty(
    "naturalWidth",
    60,
  );
  await expect(page.getByRole("img", { name: /Light map/ })).toHaveJSProperty(
    "naturalHeight",
    100,
  );
  await analyze(page, await fixture(page));
  await page.getByRole("tab", { name: "Metadata", exact: true }).click();
  await expect(page.locator(".results-content")).toContainText(
    "No supported camera or location metadata",
  );
  await expect(page.locator(".location-disclosure")).toHaveCount(0);
  const software = await fixture(page);
  await analyze(page, {
    ...software,
    buffer: Buffer.from(withPngSoftware(software.buffer)),
  });
  await page.getByRole("tab", { name: "Metadata", exact: true }).click();
  await expect(page.locator(".metadata-fields")).toContainText(
    "OUAHAD Test Editor",
  );
  expect(outbound).toEqual([]);
  expect(issues).toEqual([]);
});
test("real light/detail maps, interactive comparison and blob URL cleanup", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL.bind(URL);
    Object.assign(window, { revoked: [] as string[] });
    URL.revokeObjectURL = (url) => {
      (window as unknown as { revoked: string[] }).revoked.push(url);
      revoke(url);
    };
  });
  await page.goto("/");
  await analyze(page, await fixture(page));
  await page.getByRole("button", { name: "Light", exact: true }).click();
  const light = page.getByRole("img", { name: /Light map/ });
  const read = await light.evaluate((element) => {
    const im = element as HTMLImageElement,
      c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    return [d[0], d[(c.width - 1) * 4]];
  });
  expect(read).toEqual([0, 255]);
  await page.getByRole("button", { name: "Detail", exact: true }).click();
  const detail = page.getByRole("img", { name: /Detail map/ });
  const edges = await detail.evaluate((element) => {
    const im = element as HTMLImageElement,
      c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    return [d[0], d[49 * 4], d[50 * 4], d[99 * 4]];
  });
  expect(edges).toEqual([0, 255, 255, 0]);
  const mapUrl = await detail.getAttribute("src");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page
    .getByRole("slider", { name: "Detail / original split" })
    .fill("25");
  await expect(page.locator(".comparison-map")).toHaveCSS(
    "clip-path",
    "inset(0px 75% 0px 0px)",
  );
  await page.getByRole("button", { name: "Clear image" }).click();
  expect(
    await page.evaluate(
      (url) =>
        (window as unknown as { revoked: string[] }).revoked.includes(url!),
      mapUrl,
    ),
  ).toBe(true);
});
test("real processing stages, cancellation and fast completion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = Worker;
    Object.assign(window, { observedStages: [] as string[] });
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.stage)
            (
              window as unknown as { observedStages: string[] }
            ).observedStages.push(event.data.stage);
        });
      }
    };
  });
  await page.goto("/");
  const slow = await fixture(
    page,
    "texture.png",
    3000,
    2000,
    "image/png",
    true,
  );
  await page.getByLabel("Choose image").setInputFiles(slow);
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByLabel("Analysis progress")).toBeVisible();
  await page.getByRole("button", { name: "Cancel analysis" }).click();
  await expect(
    page.getByRole("button", { name: "Analyze image" }),
  ).toBeEnabled();
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Analysis cancelled" }),
  ).toBeVisible();
  await analyze(page, await fixture(page));
  await expect(page.getByLabel("Analysis progress")).toHaveCount(0);
  const stages = await page.evaluate(
    () => (window as unknown as { observedStages: string[] }).observedStages,
  );
  expect(stages.slice(-4)).toEqual([
    "calculating",
    "metadata",
    "maps",
    "preparing",
  ]);
});
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  test(`adaptive preview and tabs at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await analyze(page, await fixture(page, "frame.png", 600, 400));
    await expect(page.locator(".lab")).toHaveCSS("overflow-y", "visible");
    const position = await page
      .locator(".image-workspace")
      .evaluate((e) => getComputedStyle(e).position);
    expect(position).toBe(viewport.width > 820 ? "sticky" : "static");
    if (viewport.width > 820) {
      await page.evaluate(() => scrollTo(0, 260));
      await expect
        .poll(async () =>
          Math.round((await page.locator(".image-workspace").boundingBox())!.y),
        )
        .toBe(20);
    }
    await page
      .getByRole("tab", { name: "Color", exact: true })
      .scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await page.getByRole("tab", { name: "Color", exact: true }).click();
    expect(
      Math.abs((await page.evaluate(() => scrollY)) - before),
    ).toBeLessThan(3);
    await page.getByRole("tab", { name: "Color", exact: true }).focus();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("tab", { name: "Metadata", exact: true }),
    ).toBeFocused();
    expect(
      await page.locator("#result-panel").evaluate((e) => e.style.minHeight),
    ).toBe("");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/workspace-${viewport.width}.png`,
      fullPage: true,
    });
  });
}
