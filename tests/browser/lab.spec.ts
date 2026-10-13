import { test, expect, type Page } from "@playwright/test";
async function fixture(
  page: Page,
  name: string,
  colors: string[],
  width = 100,
  height = 50,
  format = "image/png",
) {
  const encoded = await page.evaluate(
    ({ colors, width, height, format }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(
          (i * width) / colors.length,
          0,
          width / colors.length,
          height,
        );
      });
      return c.toDataURL(format).split(",")[1];
    },
    { colors, width, height, format },
  );
  return { name, mimeType: format, buffer: Buffer.from(encoded, "base64") };
}
test("real pixels → worker → explorable results, replacement, no uploads", async ({
  page,
}) => {
  const requests: { url: string; method: string; body: boolean }[] = [];
  const errors: string[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: !!r.postData() }),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every image has a story." }),
  ).toBeVisible();
  requests.length = 0;
  await page
    .getByLabel("Choose image")
    .setInputFiles(await fixture(page, "red.png", ["#ff0000"]));
  await expect(
    page.getByRole("img", { name: "Selected image: red.png" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(page.locator(".properties")).toContainText("100 × 50");
  await expect(page.locator(".properties")).toContainText("2:1");
  await page.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Color", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await expect(page.locator(".palette-list")).toContainText("#FF0000");
  await expect(page.locator(".palette-list")).toContainText("100.0%");
  await expect(page.locator(".average-color")).toContainText("RGB 255 / 0 / 0");
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await expect(page.locator(".light-stats")).toContainText("0.213");
  await expect(page.locator(".light-stats")).toContainText("0.000");
  await page.screenshot({
    path: "test-results/desktop-results.png",
    fullPage: true,
  });
  await page
    .getByLabel("Choose image")
    .setInputFiles(await fixture(page, "split.png", ["#000000", "#ffffff"]));
  await page.getByRole("button", { name: "Analyze image" }).click();
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await expect(page.locator(".light-stats")).toContainText("0.500");
  await expect(page.locator(".tone-list")).toContainText("50.0%");
  const bars = page.locator(".histogram>div");
  expect(await bars.count()).toBe(32);
  await expect(bars.first()).toHaveAttribute("data-tooltip", /50.0%/);
  await expect(bars.last()).toHaveAttribute("data-tooltip", /50.0%/);
  await page.getByRole("button", { name: "Clear image" }).click();
  await expect(
    page.getByRole("button", { name: /Bring an image/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(requests.filter((r) => r.method !== "GET" || r.body)).toEqual([]);
  const origin = new URL(page.url()).origin;
  expect(
    requests.filter(
      (r) =>
        !r.url.startsWith(origin) &&
        !r.url.startsWith("blob:") &&
        !r.url.startsWith("data:"),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});
test("corrupted, unsupported, oversize and transparent images recover", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByLabel("Choose image");
  await input.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "Unsupported",
  );
  await input.setInputFiles({
    name: "corrupt.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "could not be decoded",
  );
  await input.setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "exceeds 20 MB",
  );
  await input.setInputFiles(
    await fixture(page, "transparent.png", ["rgba(0,0,0,0)"]),
  );
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "fully transparent",
  );
  await input.setInputFiles(
    await fixture(page, "green.webp", ["#077f64"], 80, 40, "image/webp"),
  );
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.locator(".properties")).toContainText("WebP");
});
test("mobile layout and drag-and-drop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/mobile-welcome.png",
    fullPage: true,
  });
  const file = await fixture(page, "drop.png", ["#3590df"], 120, 80);
  const transfer = await page.evaluateHandle(
    ({ base64 }) => {
      const data = new DataTransfer();
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      data.items.add(new File([bytes], "drop.png", { type: "image/png" }));
      return data;
    },
    { base64: file.buffer.toString("base64") },
  );
  await page
    .locator(".drop-zone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.locator(".properties")).toContainText("120 × 80");
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await expect(page.locator(".average-color")).toContainText("#3590DF");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-results.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Choose image")
    .setInputFiles(
      await fixture(page, "photo.jpg", ["#f3a339"], 160, 90, "image/jpeg"),
    );
  await page.getByRole("button", { name: "Analyze image" }).click();
  await expect(page.locator(".properties")).toContainText("JPEG");
  await expect(page.locator(".properties")).toContainText("160 × 90");
});
