import { test, expect } from "@playwright/test";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import type {
  ExperimentMode,
  ExperimentResult,
} from "../../src/experiments/vision/types";

test("real experimental inference on three scenes; spatial overlays, reuse and privacy", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("EXPERIMENT ERROR", message.text());
  });
  await page.goto("/experiments/vision");
  expect(
    requests.filter((r) => r.url.includes("/experiments/ai/")).length,
  ).toBe(0);
  const evidence: {
    mode: ExperimentMode;
    image: string;
    result: ExperimentResult;
    maxHeartbeatGapMs: number;
  }[] = [];
  for (const mode of ["baseline", "detector", "scene"] as ExperimentMode[]) {
    await page.getByLabel("Capability").selectOption(mode);
    for (const file of [
      "tests/fixtures/tiger.jpg",
      "tests/fixtures/evaluation/cats.jpg",
      "tests/fixtures/evaluation/outdoor-cooking.jpg",
    ]) {
      await page
        .getByLabel("Experiment image")
        .setInputFiles(path.resolve(file));
      await expect(
        page.getByRole("img", { name: "Experimental input" }),
      ).toBeVisible();
      await page.evaluate(() => {
        const metrics = { last: performance.now(), max: 0, timer: 0 };
        metrics.timer = window.setInterval(() => {
          const now = performance.now();
          metrics.max = Math.max(metrics.max, now - metrics.last);
          metrics.last = now;
        }, 16);
        (
          window as unknown as { evaluationHeartbeat: typeof metrics }
        ).evaluationHeartbeat = metrics;
      });
      await page
        .getByRole("button", { name: "Run experiment", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await page.getByTestId("experiment-result").count()) > 0 ||
            (await page.getByRole("status").innerText()).includes("failed"),
          { timeout: 180_000 },
        )
        .toBe(true);
      expect(await page.getByRole("status").innerText()).not.toContain(
        "failed",
      );
      const result = JSON.parse(
        (await page.getByTestId("experiment-result").textContent()) ?? "null",
      ) as ExperimentResult;
      const maxHeartbeatGapMs = await page.evaluate(() => {
        const metrics = (
          window as unknown as {
            evaluationHeartbeat: { max: number; timer: number };
          }
        ).evaluationHeartbeat;
        clearInterval(metrics.timer);
        return metrics.max;
      });
      evidence.push({
        mode,
        image: path.basename(file),
        result,
        maxHeartbeatGapMs,
      });
      console.log("ACTUAL EVALUATION", JSON.stringify(evidence.at(-1)));
      expect(result.backend).toBe("wasm");
      expect(result.inferenceMs).toBeGreaterThan(0);
      if (file.includes("cats") && mode === "detector") {
        expect(
          result.detections.filter((d) => d.label === "cat").length,
        ).toBeGreaterThanOrEqual(2);
        const box = page.getByRole("button", { name: /cat box/ }).first();
        await box.focus();
        await page.keyboard.press("Enter");
        await expect(box).toHaveAttribute("aria-pressed", "true");
        await page.screenshot({
          path: "test-results/evaluation-detector-desktop.png",
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: "test-results/evaluation-detector-mobile.png",
          fullPage: true,
        });
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      if (mode === "scene") {
        expect(result.predictions.length).toBe(10);
        expect(
          result.predictions.reduce((sum, p) => sum + p.score, 0),
        ).toBeCloseTo(1, 4);
      }
    }
  }
  expect(
    requests.every(
      (r) =>
        r.method === "GET" &&
        r.body === null &&
        new URL(r.url).origin === "http://127.0.0.1:3001",
    ),
  ).toBe(true);
  expect(
    requests.filter((r) => r.url.endsWith("yolos/onnx/model_quantized.onnx"))
      .length,
  ).toBe(1);
  expect(
    requests.filter((r) => r.url.endsWith("clip/onnx/model_quantized.onnx"))
      .length,
  ).toBe(1);
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/phase-4-1-inference.json",
    JSON.stringify(
      {
        environment:
          "Chrome headless, Windows desktop, production Next build, WASM one thread; mobile viewport is not physical-device performance",
        records: evidence,
      },
      null,
      2,
    ) + "\n",
  );
});

test("experimental download failure and replacement do not affect the main product", async ({
  page,
}) => {
  await page.route("**/experiments/ai/**", (route) => route.abort());
  await page.goto("/experiments/vision");
  await page.getByLabel("Capability").selectOption("detector");
  await page
    .getByLabel("Experiment image")
    .setInputFiles(path.resolve("tests/fixtures/tiger.jpg"));
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Experimental inference failed",
    { timeout: 30_000 },
  );
  await page
    .getByLabel("Experiment image")
    .setInputFiles(path.resolve("tests/fixtures/evaluation/cats.jpg"));
  await expect(page.getByTestId("experiment-result")).toHaveCount(0);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every image has a story." }),
  ).toBeVisible();
});
