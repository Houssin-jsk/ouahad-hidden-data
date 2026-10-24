import {
  holdAnalysis,
  waitHeld,
  setAnalysisHold,
} from "./helpers/held-analysis";
import { openDetails } from "./helpers/disclosures";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const bytes = (name: string) =>
  readFile(path.join(process.cwd(), "tests/fixtures/phase01", name));
async function select(page: Page, name: string) {
  await page.getByLabel("Choose image").setInputFiles({
    name,
    mimeType: name.endsWith("jpg") ? "image/jpeg" : "image/png",
    buffer: await bytes(name),
  });
}
async function analyze(page: Page) {
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await openDetails(page, "Technical details");
}

test("worker startup failure, unavailable canvas and timeout offer a real retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = Worker;
    Object.assign(window, { workerFailure: "startup" });
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (
          (window as unknown as { workerFailure: string }).workerFailure ===
          "startup"
        )
          throw new Error("Worker could not start.");
        super(url, options);
        Object.assign(window, { workerStarted: true });
        this.addEventListener("message", (event) => {
          if (
            (window as unknown as { workerFailure: string }).workerFailure ===
            "timeout"
          )
            event.stopImmediatePropagation();
        });
      }
    };
  });
  await page.goto("/");
  await select(page, "red.png");
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "Worker could not start",
  );
  await page.evaluate(() => {
    Object.assign(window, { workerFailure: "timeout" });
  });
  await page.clock.install();
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  // Wait for the genuine worker to start before advancing its UI watchdog.
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { workerStarted?: boolean }).workerStarted,
      ),
    )
    .toBe(true);
  await page.clock.runFor(21000);
  await expect(page.locator('.error[role="alert"]')).toContainText("timed out");
  await expect(
    page.getByRole("button", { name: "Analyze image", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    Object.assign(window, { workerFailure: "none" });
  });
  await page.clock.resume();
  await analyze(page);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "255 / 0 / 0",
  );
  await page.getByRole("button", { name: "Clear image" }).click();
  await select(page, "red.png");
  await page.evaluate(() => {
    Object.defineProperty(window, "OffscreenCanvas", {
      value: undefined,
      configurable: true,
    });
  });
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "OffscreenCanvas support",
  );
});

for (let orientation = 1; orientation <= 8; orientation++) {
  test(`EXIF ${orientation}: preview and worker maps apply orientation exactly once`, async ({
    page,
  }) => {
    await page.goto("/");
    await select(page, `orientation-${orientation}.jpg`);
    await analyze(page);
    await expect(page.locator(".properties")).toContainText(
      orientation >= 5 ? "24 × 40" : "40 × 24",
    );
    // Independently known corner luminances for original BL=gray, BR=red,
    // TL=black, TR=white. These verify mirrored as well as rotated geometry.
    const corners = [
      [0, 255, 55, 54],
      [255, 0, 54, 55],
      [54, 55, 255, 0],
      [55, 54, 0, 255],
      [0, 55, 255, 54],
      [55, 0, 54, 255],
      [54, 255, 55, 0],
      [255, 54, 0, 55],
    ][orientation - 1];
    await openDetails(page, "Explore light & detail");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    const actual = await page
      .getByRole("img", { name: /Light map/ })
      .evaluate(async (element) => {
        const image = element as HTMLImageElement;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = image.naturalWidth;
        c.height = image.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return [
          [2, 2],
          [c.width - 3, 2],
          [2, c.height - 3],
          [c.width - 3, c.height - 3],
        ].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[0]);
      });
    actual.forEach((v, i) =>
      expect(Math.abs(v - corners[i])).toBeLessThanOrEqual(2),
    );
    await page.getByRole("tab", { name: "Metadata", exact: true }).click();
    await expect(page.getByLabel("Revealed location")).toHaveCount(0);
  });
}

test("oversized headers never create a preview; malformed/decode errors and misleading files recover", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    Object.assign(window, { created: 0 });
    URL.createObjectURL = (value) => {
      (window as unknown as { created: number }).created++;
      return create(value);
    };
  });
  await page.goto("/");
  for (const [name, message] of [
    ["over-limit.png", "40 million"],
    ["empty.png", "empty"],
    ["malformed.png", "could not be decoded"],
    ["spoof.png", "Unsupported"],
    ["unsupported.svg", "Unsupported"],
  ]) {
    await select(page, name);
    await expect(page.locator('.error[role="alert"]')).toContainText(message);
    await expect(
      page.getByRole("button", { name: "Analyze image", exact: true }),
    ).toHaveCount(0);
  }
  expect(
    await page.evaluate(
      () => (window as unknown as { created: number }).created,
    ),
  ).toBe(0);
  // Valid dimensions with damaged payload passes preflight but fails real decoding.
  await page.getByLabel("Choose image").setInputFiles({
    name: "truncated.png",
    mimeType: "image/png",
    buffer: (await bytes("red.png")).subarray(0, 33),
  });
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "could not be decoded",
  );
  await page.getByLabel("Choose image").setInputFiles({
    name: "spoof.jpg",
    mimeType: "image/jpeg",
    buffer: await bytes("red.png"),
  });
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "do not match",
  );
  await select(page, "صورة.photo.png");
  await analyze(page);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "255 / 0 / 0",
  );
  await select(page, "photo.jpg.png");
  await analyze(page);
  await expect(page.locator(".properties")).toContainText("PNG");
});

test("dark, bright, low contrast, tiny and large images retain deterministic measurements", async ({
  page,
}, info) => {
  await page.goto("/");
  const timings: { fixture: string; ms: number }[] = [];
  for (const [name, rgb] of [
    ["dark.png", "0 / 0 / 0"],
    ["bright.png", "255 / 255 / 255"],
    ["gray.png", "128 / 128 / 128"],
    ["low-contrast.png", "128 / 128 / 128"],
    ["tiny.png", "255 / 0 / 0"],
    ["large.png", "255 / 0 / 0"],
  ]) {
    await select(page, name);
    const start = performance.now();
    await analyze(page);
    timings.push({ fixture: name, ms: Math.round(performance.now() - start) });
    await expect(page.getByTestId("technical-summary")).toContainText(rgb);
    await page.getByRole("tab", { name: "Light", exact: true }).click();
    await openDetails(page, "Exact light measurements");
    await expect(page.locator(".light-stats")).not.toContainText(
      /NaN|Infinity/,
    );
    if (name === "low-contrast.png")
      await expect(page.locator(".light-stats dd").nth(1)).toHaveText("0.004");
  }
  await info.attach("runtime-conditions", {
    contentType: "application/json",
    body: JSON.stringify(
      {
        browser: page.context().browser()?.version(),
        platform: os.platform(),
        release: os.release(),
        cpu: os.cpus()[0]?.model,
        logicalCPUs: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        viewport: page.viewportSize(),
        conditions:
          "Headless desktop Chrome; production localhost server; unthrottled; no configured presentation minimum; not a mobile or isolated CPU benchmark",
        timings,
      },
      null,
      2,
    ),
  });
});

test("repeated cancellation/replacement clears URLs and workers; keyboard selection and clipboard work", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await holdAnalysis(page);
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL),
      Native = Worker;
    const live = new Set<string>(),
      workers = new Set<Worker>();
    Object.assign(window, {
      resources: () => ({ urls: live.size, workers: workers.size }),
    });
    URL.createObjectURL = (value) => {
      const url = create(value);
      live.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      live.delete(url);
      revoke(url);
    };
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        workers.add(this);
      }
      terminate() {
        workers.delete(this);
        super.terminate();
      }
    };
  });
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Select image", exact: true }).focus();
  await page.keyboard.press("Enter");
  await (
    await chooser
  ).setFiles({
    name: "red.png",
    mimeType: "image/png",
    buffer: await bytes("red.png"),
  });
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", { name: "Analyze image", exact: true })
      .click();
    await waitHeld(page);
    await page.getByRole("button", { name: "Cancel analysis" }).click();
    await expect(page.getByTestId("image-dna")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Analyze image", exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(() =>
        (window as unknown as { resources: () => unknown }).resources(),
      ),
    ).toEqual({ urls: 1, workers: 0 });
  }
  await setAnalysisHold(page, false);
  await analyze(page);
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await page.getByRole("button", { name: "Copy #FF0000" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "#FF0000",
  );
  await page.getByRole("button", { name: "Clear image" }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { resources: () => unknown }).resources(),
    ),
  ).toEqual({ urls: 0, workers: 0 });
  await select(page, "bright.png");
  await analyze(page);
  await expect(page.getByTestId("technical-summary")).toContainText(
    "255 / 255 / 255",
  );
  await page.getByRole("button", { name: "Clear image" }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { resources: () => unknown }).resources(),
    ),
  ).toEqual({ urls: 0, workers: 0 });
});
