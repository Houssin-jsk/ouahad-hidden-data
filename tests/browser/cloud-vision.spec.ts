import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { validateCloudImage } from "../../src/cloud-vision/server/image";
const result = {
  schema: "cloud-vision/1",
  status: "available",
  provider: "gemini",
  model: "mock-browser-only",
  interpretation: {
    description: "Mocked visual description for lifecycle testing.",
    observations: ["A colored shape is visible."],
    limitations: ["AI interpretation may contain mistakes."],
  },
};
async function ready(
  page: Page,
  file = "tests/fixtures/phase01/orientation-6.jpg",
) {
  await page.goto("/");
  await page.getByLabel("Choose image").setInputFiles(file);
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await page
    .getByText("AI Visual Observations · optional cloud analysis", {
      exact: true,
    })
    .click();
  await page.getByLabel("Pilot access code").fill("A".repeat(43));
}
async function consent(page: Page) {
  await page.getByLabel(/I am 18 or older/).check();
  await page.getByLabel(/I agree to send/).check();
}
test("explicit opt-in sends only oriented bounded re-encoded pixels; observations remain separate", async ({
  page,
}) => {
  const uploads: Buffer[] = [];
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:3001") &&
      !request.url().startsWith("blob:")
    )
      external.push(request.url());
  });
  await page.route("**/api/cloud-vision", async (route) => {
    expect(route.request().headers()["x-cloud-consent"]).toBe("external-v1");
    expect(route.request().headers()["content-type"]).toBe("image/jpeg");
    uploads.push(route.request().postDataBuffer()!);
    await route.fulfill({ json: result });
  });
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Start Cloud AI analysis" }),
  ).toBeDisabled();
  expect(uploads).toHaveLength(0);
  await consent(page);
  expect(uploads).toHaveLength(0);
  await page.getByRole("button", { name: "Start Cloud AI analysis" }).click();
  await expect(page.getByTestId("cloud-result")).toContainText("EXPERIMENTAL");
  await expect(page.getByTestId("cloud-result")).not.toContainText(
    "mock-browser-only",
  );
  expect(uploads).toHaveLength(1);
  expect(external).toEqual([]);
  const clean = validateCloudImage(uploads[0], "image/jpeg");
  // EXIF 6 changes encoded 40×24 to visible 24×40 before upload.
  expect(clean.width).toBe(24);
  expect(clean.height).toBe(40);
  expect(uploads[0].includes(Buffer.from("Exif"))).toBe(false);
  expect(uploads[0].includes(Buffer.from("OUAHAD TEST"))).toBe(false);
  expect(uploads[0].length).toBeLessThanOrEqual(768 * 1024);
  await expect(page.getByTestId("image-dna")).not.toContainText("Mocked");
  await expect(page.getByRole("tab")).toHaveCount(4);
  await expect(page.getByText(/Connect companion/)).toHaveCount(0);
  await page.screenshot({
    path: "test-results/cloud-vision-desktop.png",
    fullPage: true,
  });
});
test("cancel and replacement discard a late cloud response and reset consent", async ({
  page,
}) => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/cloud-vision", async (route) => {
    await pending;
    await route.fulfill({ json: result }).catch(() => {});
  });
  await ready(page);
  await consent(page);
  await page.getByRole("button", { name: "Start Cloud AI analysis" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel AI analysis" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel AI analysis" }).click();
  await expect(page.locator(".cloud-status")).toContainText("cancelled");
  await page
    .getByLabel("Choose image")
    .setInputFiles("tests/fixtures/phase01/red.png");
  finish();
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await expect(page.getByTestId("cloud-result")).toHaveCount(0);
  await page
    .getByText("AI Visual Observations · optional cloud analysis", {
      exact: true,
    })
    .click();
  await expect(page.getByLabel(/I agree to send/)).not.toBeChecked();
  await expect(page.getByLabel("Pilot access code")).toHaveValue("");
});
test("cloud unavailability and malformed outputs preserve numerical results on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  let malformed = false;
  await page.route("**/api/cloud-vision", async (route) =>
    route.fulfill({
      status: malformed ? 200 : 503,
      json: malformed
        ? { status: "available", description: "untrusted" }
        : {
            schema: "cloud-vision/1",
            status: "unavailable",
            error: "cost_unverified",
            message: "Free account access is not yet verified.",
          },
    }),
  );
  await ready(page);
  await consent(page);
  await page.getByRole("button", { name: "Start Cloud AI analysis" }).click();
  await expect(page.locator(".cloud-status")).toContainText("not yet verified");
  malformed = true;
  await page.getByRole("button", { name: "Retry Cloud AI" }).click();
  await expect(page.locator(".cloud-status")).toContainText(
    "Cloud AI is unavailable",
  );
  await expect(page.getByTestId("cloud-result")).toHaveCount(0);
  await expect(page.getByTestId("image-dna")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/cloud-vision-mobile.png",
    fullPage: true,
  });
});
test("cloud endpoint is inaccessible without authorization and origin/consent", async ({
  request,
}) => {
  expect((await request.get("/api/cloud-vision")).status()).toBe(405);
  expect(
    (await request.post("/api/cloud-vision", { data: "bad" })).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/cloud-vision", {
        headers: {
          origin: "https://evil.invalid",
          "x-cloud-consent": "external-v1",
        },
        data: "bad",
      })
    ).status(),
  ).toBe(403);
  // The original metadata-bearing fixture is kept solely as test input.
  expect(
    (await readFile("tests/fixtures/phase01/orientation-6.jpg")).includes(
      Buffer.from("Exif"),
    ),
  ).toBe(true);
});
test("replacement during an active cloud upload rejects stale results", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/cloud-vision", async (route) => {
    await pending;
    await route.fulfill({ json: result }).catch(() => {});
  });
  await ready(page);
  await consent(page);
  const upload = page.waitForRequest("**/api/cloud-vision");
  await page.getByRole("button", { name: "Start Cloud AI analysis" }).click();
  await upload;
  await page
    .getByLabel("Choose image")
    .setInputFiles("tests/fixtures/phase01/red.png");
  release();
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await expect(page.getByTestId("cloud-result")).toHaveCount(0);
  await expect(
    page.getByText("Mocked visual description for lifecycle testing."),
  ).toHaveCount(0);
});
test("large images are resized to the bounded cloud preview and a hung request times out", async ({
  page,
}) => {
  let bytes: Buffer | undefined;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/cloud-vision", async (route) => {
    bytes = route.request().postDataBuffer()!;
    await pending;
    await route.fulfill({ json: result }).catch(() => {});
  });
  await ready(page, "tests/fixtures/phase01/large.png");
  await consent(page);
  await page.clock.install();
  const upload = page.waitForRequest("**/api/cloud-vision");
  await page.getByRole("button", { name: "Start Cloud AI analysis" }).click();
  await upload;
  await expect.poll(() => bytes?.length ?? 0).toBeGreaterThan(0);
  const image = validateCloudImage(bytes!, "image/jpeg");
  expect(image.width).toBe(1024);
  expect(image.height).toBe(768);
  await page.clock.fastForward(50001);
  await expect(page.locator(".cloud-status")).not.toContainText("timed out");
  await expect(
    page.getByRole("button", { name: "Cancel AI analysis", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(15000);
  await expect(page.locator(".cloud-status")).toContainText("timed out");
  release();
  await expect(page.getByTestId("cloud-result")).toHaveCount(0);
});
