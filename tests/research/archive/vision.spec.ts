import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function setup(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Choose image")
    .setInputFiles(path.resolve("tests/fixtures/tiger.jpg"));
  await page.getByRole("button", { name: "Analyze image" }).click();
  await page.getByRole("tab", { name: "AI Vision", exact: true }).click();
}
test("real MobileNetV4 WASM inference, warm reuse, local assets and no uploads", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const requests: { url: string; method: string; body: string | null }[] = [];
  const errors: string[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER:", msg.text());
  });
  await setup(page);
  expect(requests.filter((r) => r.url.includes("/ai/")).length).toBe(0);
  await page.getByLabel("Use CPU compatibility mode").check();
  await page
    .getByRole("button", { name: "Run AI Vision", exact: true })
    .click();
  await expect(page.locator(".ai-predictions")).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.locator(".ai-predictions li")).toHaveCount(5);
  await expect(page.locator(".ai-predictions li").first()).toContainText(
    /tiger/i,
  );
  await expect(page.locator(".ai-vision")).toContainText("WASM · local CPU");
  const result = await page.locator(".ai-vision").innerText();
  console.log("REAL VISION RESULT:", result);
  const modelDownloads = requests.filter((r) =>
    r.url.endsWith("model.onnx"),
  ).length;
  expect(modelDownloads).toBe(1);
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await expect(page.locator(".average-color")).toBeVisible();
  await page.getByRole("tab", { name: "AI Vision", exact: true }).click();
  await expect(page.locator(".ai-predictions")).toBeVisible();
  await page.getByRole("button", { name: "Run again" }).click();
  await expect(page.locator(".ai-vision")).toContainText("Model reused", {
    timeout: 30_000,
  });
  expect(requests.filter((r) => r.url.endsWith("model.onnx")).length).toBe(
    modelDownloads,
  );
  expect(
    requests.every(
      (r) =>
        r.method === "GET" &&
        r.body === null &&
        new URL(r.url).origin === "http://127.0.0.1:3001",
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page
    .getByLabel("Choose image")
    .setInputFiles(path.resolve("tests/fixtures/tiger.jpg"));
  await page.getByRole("button", { name: "Analyze image" }).click();
  await page.getByRole("tab", { name: "AI Vision", exact: true }).click();
  await page
    .getByRole("button", { name: "Run AI Vision", exact: true })
    .click();
  await expect(page.locator(".ai-vision")).toContainText("Model reused", {
    timeout: 30_000,
  });
  expect(requests.filter((r) => r.url.endsWith("model.onnx")).length).toBe(
    modelDownloads,
  );
  await page.screenshot({
    path: "test-results/ai-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/ai-mobile.png", fullPage: true });
});
test("real automatic backend selection classifies the known image", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await setup(page);
  await page
    .getByRole("button", { name: "Run AI Vision", exact: true })
    .click();
  await expect(page.locator(".ai-predictions li").first()).toContainText(
    /tiger/i,
    { timeout: 90_000 },
  );
  console.log(
    "AUTOMATIC BACKEND:",
    await page.locator(".ai-vision").innerText(),
  );
});
test("failed model download is recoverable; measured statistics stay separate", async ({
  page,
}) => {
  await page.route("**/ai/mobilenetv4/**", (route) => route.abort("failed"));
  await setup(page);
  await page
    .getByRole("button", { name: "Run AI Vision", exact: true })
    .click();
  await expect(page.locator(".ai-error")).toContainText(
    "Pixel analysis remains available",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("button", { name: "Retry AI Vision" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.getByTestId("image-dna")).toContainText("average RGB");
  await expect(page.getByTestId("image-dna")).not.toContainText("tiger");
});
test("unsupported AI capabilities leave base analysis functional", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    Object.defineProperty(window, "OffscreenCanvas", { value: undefined });
  });
  await page
    .getByRole("button", { name: "Run AI Vision", exact: true })
    .click();
  await expect(page.locator(".ai-error")).toContainText("current browser");
});
test("replacement during a pending model download cannot reveal stale predictions", async ({
  page,
}) => {
  await page.route("**/ai/mobilenetv4/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.abort();
  });
  await setup(page);
  await page
    .getByRole("button", { name: "Run AI Vision", exact: true })
    .click();
  await expect(page.locator(".ai-processing")).toBeVisible();
  await page
    .getByLabel("Choose image")
    .setInputFiles(path.resolve("tests/fixtures/tiger.jpg"));
  await page.getByRole("button", { name: "Analyze image" }).click();
  await page.getByRole("tab", { name: "AI Vision", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run AI Vision", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ai-predictions")).toHaveCount(0);
  await expect(page.locator(".ai-error")).toHaveCount(0);
});
