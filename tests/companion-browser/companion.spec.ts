import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { withExif } from "../fixtures/exif";

test("optional companion controls fit mobile widths and remain labeled", async ({
  page,
}) => {
  await upload(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByLabel("Pairing code from the companion"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect companion" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/companion-mobile.png",
    fullPage: true,
  });
});
const address = "http://127.0.0.1:18431";
const valid = {
  version: "1.1.0",
  model: "Qwen3-VL 2B Instruct Q4_K_M",
  elapsedSeconds: 1,
  limitations: "Model-generated observations can be wrong.",
  observations: {
    image_description: "A bounded preview is visible.",
    main_visible_objects: ["preview"],
    scene_and_surroundings: null,
    notable_visual_details: [],
    uncertainties: [],
  },
};
async function upload(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Choose image").setInputFiles({
    name: "private-gps.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(
      withExif(await readFile("tests/fixtures/phase01/quadrants.jpg")),
    ),
  });
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible({ timeout: 15000 });
  await page
    .getByText("Optional AI observations · local companion", { exact: true })
    .click();
}
test("explicit pairing and analysis send bounded lossless PNG pixels without source EXIF/GPS or persistent credentials", async ({
  page,
}) => {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  await page.route(`${address}/**`, async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() ?? "{}");
    calls.push({ path: new URL(request.url()).pathname, body });
    await route.fulfill({
      json: request.url().endsWith("/pair")
        ? { token: "T".repeat(43), expiresIn: 120, observationsEnabled: true }
        : valid,
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3001" },
    });
  });
  await upload(page);
  expect(calls).toEqual([]);
  await page.getByLabel("Pairing code from the companion").fill("ABCDEF12");
  await page.getByRole("button", { name: "Connect companion" }).click();
  await expect(
    page.getByRole("button", { name: "Analyze with companion", exact: true }),
  ).toBeVisible();
  expect(calls.map((c) => c.path)).toEqual(["/v1/pair"]);
  await page
    .getByRole("button", { name: "Analyze with companion", exact: true })
    .click();
  await expect(page.locator(".companion-output")).toContainText(
    valid.observations.image_description,
  );
  const payload = calls.find((c) => c.path === "/v1/analyze")!.body;
  expect(Object.keys(payload).sort()).toEqual(["id", "image"]);
  const png = Buffer.from(payload.image as string, "base64");
  expect(png.length).toBeLessThanOrEqual(10485760);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBe(24); // EXIF orientation 6 applied exactly once.
  expect(png.readUInt32BE(20)).toBe(40);
  expect(png.includes(Buffer.from("Exif\0\0"))).toBe(false);
  expect(png.includes(Buffer.from("GPS"))).toBe(false);
  expect(png.includes(Buffer.from("private-gps"))).toBe(false);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Disconnect companion" }).click();
  await expect(page.locator(".companion-output")).toHaveCount(0);
  expect(calls.some((c) => c.path === "/v1/disconnect")).toBe(true);
});
test("malformed model response remains unavailable", async ({ page }) => {
  await page.route(`${address}/**`, (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/pair")
        ? { token: "T".repeat(43), observationsEnabled: true }
        : { ...valid, observations: { summary: "invented" } },
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3001" },
    }),
  );
  await upload(page);
  await page.getByLabel("Pairing code from the companion").fill("ABCDEF12");
  await page.getByRole("button", { name: "Connect companion" }).click();
  await page
    .getByRole("button", { name: "Analyze with companion", exact: true })
    .click();
  await expect(page.locator(".companion-status")).toContainText("malformed");
  await expect(page.locator(".companion-output")).toHaveCount(0);
});
test("cancel and replacement discard delayed responses and cancel owned inference", async ({
  page,
}) => {
  const calls: string[] = [];
  let release: () => void = () => {};
  await page.route(`${address}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    calls.push(path);
    if (path === "/v1/analyze")
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route
      .fulfill({
        json:
          path === "/v1/pair"
            ? { token: "T".repeat(43), observationsEnabled: true }
            : valid,
        headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3001" },
      })
      .catch(() => {});
  });
  await upload(page);
  await page.getByLabel("Pairing code from the companion").fill("ABCDEF12");
  await page.getByRole("button", { name: "Connect companion" }).click();
  await page
    .getByRole("button", { name: "Analyze with companion", exact: true })
    .click();
  await expect.poll(() => calls.includes("/v1/analyze")).toBe(true);
  await page.getByRole("button", { name: "Cancel AI analysis" }).click();
  release();
  await expect(page.locator(".companion-status")).toContainText("Cancelled");
  await expect(page.locator(".companion-output")).toHaveCount(0);
  await expect.poll(() => calls.includes("/v1/cancel")).toBe(true);
  await page
    .getByRole("button", { name: "Analyze with companion", exact: true })
    .click();
  await expect
    .poll(() => calls.filter((c) => c === "/v1/analyze").length)
    .toBe(2);
  await page
    .getByLabel("Choose image")
    .setInputFiles("tests/fixtures/phase01/quadrants.jpg");
  release();
  await expect(page.getByTestId("image-dna")).toHaveCount(0);
  await expect(page.locator(".companion-output")).toHaveCount(0);
  await expect.poll(() => calls.includes("/v1/disconnect")).toBe(true);
});
test("failed companion quality gate disables image transfer in the normal website", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route(`${address}/**`, async (route) => {
    calls.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      json: { token: "T".repeat(43), observationsEnabled: false },
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3001" },
    });
  });
  await upload(page);
  await page.getByLabel("Pairing code from the companion").fill("ABCDEF12");
  await page.getByRole("button", { name: "Connect companion" }).click();
  await expect(
    page.getByRole("button", { name: "Analyze with companion", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".companion-status")).toContainText(
    "No image will be sent",
  );
  expect(calls).toEqual(["/v1/pair"]);
});
