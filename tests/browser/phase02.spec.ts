import {
  holdAnalysis,
  waitHeld,
  setAnalysisHold,
} from "./helpers/held-analysis";
import { openDetails } from "./helpers/disclosures";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ImageAnalytics } from "../../src/analysis/insight-types";

async function pattern(
  page: Page,
  type: "ramp" | "alpha" | "uniform",
  width = 256,
  height = 32,
) {
  const encoded = await page.evaluate(
    ({ type, width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!,
        data = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const v = Math.floor((x * 256) / width);
          data.data.set(
            type === "alpha"
              ? x < width / 2
                ? [255, 0, 0, 255]
                : [128, 128, 128, 85]
              : type === "uniform"
                ? [128, 128, 128, 255]
                : [v, v, v, 255],
            (y * width + x) * 4,
          );
        }
      ctx.putImageData(data, 0, 0);
      return c.toDataURL().split(",")[1];
    },
    { type, width, height },
  );
  await page.getByLabel("Choose image").setInputFiles({
    name: `${type}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(encoded, "base64"),
  });
}
async function analyze(page: Page) {
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await openDetails(page, "Technical details");
}
async function probe(page: Page) {
  await page.addInitScript(() => {
    const Native = Worker;
    Object.assign(window, {
      analysisProbe: [] as { workerWallMs: number; analytics: unknown }[],
    });
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        const start = performance.now();
        this.addEventListener("message", (event) => {
          if (event.data.result)
            (
              window as unknown as { analysisProbe: unknown[] }
            ).analysisProbe.push({
              workerWallMs: performance.now() - start,
              analytics: event.data.result.analytics,
            });
        });
      }
    };
  });
}
for (const width of [320, 768, 1440]) {
  test(`verified ramp insights, keyboard methodology and spatial caveats at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await pattern(page, "ramp");
    await analyze(page);
    await expect(page.getByRole("tab")).toHaveText([
      "Overview",
      "Color",
      "Light",
      "Metadata",
    ]);
    await page.getByRole("tab", { name: "Light", exact: true }).click();
    await openDetails(page, "Light distribution details");
    await openDetails(page, "Exact light measurements");
    const tone = page.getByTestId("tonal-insight");
    await expect(tone).toContainText("weighted median luminance is 0.212");
    await expect(tone).toContainText("0.004 to 0.896");
    await expect(tone).toContainText("All decoded pixels");
    await expect(tone).toContainText("does not prove incorrect exposure");
    const method = tone.getByText("Method and evidence", { exact: true });
    await method.focus();
    await page.keyboard.press("Enter");
    await expect(tone.locator("details")).toHaveAttribute("open", "");
    await expect(tone).toContainText(
      "No histogram-bin estimate or interpolation",
    );
    await expect(tone).toContainText("relative luminance (0–1)");
    await expect(tone.locator(".insight-evidence")).toContainText("0.212");
    await page.keyboard.press("Enter");
    await expect(tone.locator("details")).not.toHaveAttribute("open", "");
    await page.getByRole("tab", { name: "Color", exact: true }).click();
    await openDetails(page, "Color distribution details");
    const color = page.getByTestId("color-insight");
    await expect(color).toContainText("Mean HSV saturation is 0.000; 100.0%");
    await expect(color).toContainText("not perceptual colorfulness");
    await color.getByText("Method and evidence", { exact: true }).click();
    await expect(color).toContainText(
      "Shares are measured proportions, never confidence percentages.",
    );
    await openDetails(page, "Explore light & detail");
    await page.getByRole("button", { name: "Detail", exact: true }).click();
    await openDetails(page, "Map technical details");
    await expect(page.locator(".map-description")).toContainText(
      "Normalized separately per image",
    );
    await openDetails(page, "Map technical details");
    await expect(page.locator(".map-description")).toContainText(
      "do not establish sharp focus, retouching, authenticity or image quality",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const preview = await page.locator(".spatial-preview").boundingBox();
    const workspace = await page.locator(".image-workspace").boundingBox();
    expect(preview!.x).toBeGreaterThanOrEqual(workspace!.x);
    expect(preview!.x + preview!.width).toBeLessThanOrEqual(
      workspace!.x + workspace!.width,
    );
    const clear = await page
      .getByRole("button", { name: "Clear image" })
      .boundingBox();
    expect(clear!.y).toBeGreaterThanOrEqual(preview!.y);
    expect(clear!.y + clear!.height).toBeLessThanOrEqual(
      preview!.y + preview!.height,
    );
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    const original = await page
      .locator(".spatial-preview .preview")
      .boundingBox();
    const overlay = await page.locator(".comparison-map").boundingBox();
    expect(overlay).toEqual(original);
    await openDetails(page, "Explore light & detail");
    await page.getByRole("button", { name: "Detail", exact: true }).click();
    await page.screenshot({
      path: `test-results/phase02-color-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Light", exact: true }).click();
    await openDetails(page, "Light distribution details");
    await openDetails(page, "Exact light measurements");
    await tone.getByText("Method and evidence", { exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/phase02-tonal-${width}.png`,
      fullPage: true,
    });
  });
}
test("real alpha-weighted measurements, cancellation, replacement and local-only request flow", async ({
  page,
  context,
}) => {
  await probe(page);
  await holdAnalysis(page, false);
  const requests: { url: string; method: string; body: boolean }[] = [],
    errors: string[] = [];
  context.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: !!r.postData() }),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await pattern(page, "alpha", 100, 50);
  await analyze(page);
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await openDetails(page, "Color distribution details");
  const color = page.getByTestId("color-insight");
  await expect(color).toContainText("Mean HSV saturation is 0.750; 25.0%");
  await expect(color).toContainText("75.0% in the strong-saturation band");
  await color.getByText("Method and evidence", { exact: true }).click();
  await expect(color).toContainText("Coverage is 66.7% mean alpha");
  const report = await page.evaluate(
    () =>
      (window as unknown as { analysisProbe: { analytics: ImageAnalytics }[] })
        .analysisProbe[0].analytics,
  );
  expect(report.color.status).toBe("available");
  if (report.color.status === "available")
    expect(report.color.measurements.meanSaturation.value).toBeCloseTo(
      0.75,
      12,
    );
  await pattern(page, "uniform");
  await setAnalysisHold(page, true);
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await waitHeld(page);
  await page.getByRole("button", { name: "Cancel analysis" }).click();
  await setAnalysisHold(page, false);
  await expect(page.getByTestId("color-insight")).toHaveCount(0);
  await analyze(page);
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  await openDetails(page, "Color distribution details");
  await expect(page.getByTestId("color-insight")).toContainText(
    "Mean HSV saturation is 0.000",
  );
  await page.getByRole("button", { name: "Clear image" }).click();
  await expect(page.getByTestId("color-insight")).toHaveCount(0);
  const origin = new URL(page.url()).origin;
  expect(
    requests.filter(
      (r) =>
        r.method !== "GET" ||
        r.body ||
        (!r.url.startsWith(origin) &&
          !r.url.startsWith("blob:") &&
          !r.url.startsWith("data:")),
    ),
  ).toEqual([]);
  expect(
    requests.filter((r) =>
      /\.onnx|\.wasm|inference|huggingface|\/experiments\//i.test(r.url),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  expect(errors).toEqual([]);
});
test("sampled estimates and real worker wall time are separate from presentation; initial resource bytes measured", async ({
  page,
}, info) => {
  await probe(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const initialJs = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(
        (e) =>
          e.name.includes("/_next/") &&
          new URL(e.name).pathname.endsWith(".js"),
      )
      .map((e) => ({
        url: new URL(e.name).pathname,
        encodedBodySize: (e as PerformanceResourceTiming).encodedBodySize,
        transferSize: (e as PerformanceResourceTiming).transferSize,
      })),
  );
  const timings: {
    fixture: string;
    workerWallMs: number;
    visibleMs: number;
  }[] = [];
  for (const name of [
    "dark.png",
    "bright.png",
    "gray.png",
    "low-contrast.png",
    "tiny.png",
    "large.png",
  ]) {
    await page.getByLabel("Choose image").setInputFiles({
      name,
      mimeType: "image/png",
      buffer: await readFile(
        path.join(process.cwd(), "tests/fixtures/phase01", name),
      ),
    });
    const start = performance.now();
    await analyze(page);
    const result = await page.evaluate(() =>
      (
        window as unknown as {
          analysisProbe: { workerWallMs: number; analytics: ImageAnalytics }[];
        }
      ).analysisProbe.at(-1)!,
    );
    timings.push({
      fixture: name,
      workerWallMs: result.workerWallMs,
      visibleMs: performance.now() - start,
    });
    expect(result.analytics.tonal.status).toBe("available");
    await page.getByRole("tab", { name: "Light", exact: true }).click();
    await openDetails(page, "Light distribution details");
    await openDetails(page, "Exact light measurements");
    await expect(page.getByTestId("tonal-insight")).toContainText(
      name === "large.png" ? "Sample-based estimates" : "All decoded pixels",
    );
    expect(result.workerWallMs).toBeLessThan(timings.at(-1)!.visibleMs);
    expect(timings.at(-1)!.visibleMs - result.workerWallMs).toBeLessThan(5500);
    if (name === "large.png") {
      await page
        .getByTestId("tonal-insight")
        .getByText("Method and evidence", { exact: true })
        .click();
      await expect(page.getByTestId("tonal-insight")).toContainText(
        "Rare colors, tails",
      );
      if (result.analytics.tonal.status === "available") {
        expect(result.analytics.tonal.basis.sampledPixels).toBeLessThanOrEqual(
          262144,
        );
        await expect(page.getByTestId("tonal-insight")).toContainText(
          `${await page.evaluate((n) => n.toLocaleString(), result.analytics.tonal.basis.sampledPixels)} native pixels visited`,
        );
      }
    }
  }
  await info.attach("phase02-performance", {
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
          "Headless unthrottled desktop Chrome, localhost production, 2 test workers. Worker wall time includes startup, sampling, all calculations, metadata, maps and messaging; not isolated insights CPU time. Visible time has no configured presentation minimum. Initial JS bytes are same-origin Resource Timing encodedBodySize, before selection; not aggregate build bytes.",
        timings,
        initialJs,
      },
      null,
      2,
    ),
  });
});
test("a legacy worker result without analytics retains measurements and exposes an unavailable state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.result) delete event.data.result.analytics;
        });
      }
    };
  });
  await page.goto("/");
  await pattern(page, "uniform");
  await analyze(page);
  await page.getByRole("tab", { name: "Light", exact: true }).click();
  await openDetails(page, "Light distribution details");
  await openDetails(page, "Exact light measurements");
  await expect(page.locator(".light-stats")).toContainText("0.216");
  await expect(page.getByTestId("tonal-insight")).toContainText(
    "Distribution insights were not produced",
  );
  await expect(
    page.getByTestId("tonal-insight").locator("details"),
  ).toHaveCount(0);
});
