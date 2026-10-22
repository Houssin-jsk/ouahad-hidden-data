import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import benchmark from "../fixtures/phase03/benchmark.json";
import type { ExperimentResult } from "../../src/experiments/vision/types";

test("phase03 actual licensed-corpus WASM inference and lifecycle", async ({
  page,
}) => {
  test.setTimeout(900_000);
  const directory = "docs/phase-03/evidence";
  await mkdir(directory, { recursive: true });
  const requests: { url: string; method: string; body: boolean }[] = [];
  const downloads: { url: string; bytes: number | null }[] = [];
  page.on("request", (r) =>
    requests.push({
      url: r.url(),
      method: r.method(),
      body: r.postData() !== null,
    }),
  );
  page.on("response", (r) => {
    if (/\/ai\//.test(r.url()))
      downloads.push({
        url: r.url(),
        bytes: Number(r.headers()["content-length"]) || null,
      });
  });
  await page.goto("/experiments/vision");
  expect(requests.some((r) => /\/ai\//.test(r.url))).toBe(false);
  const environment = {
    at: new Date().toISOString(),
    os: os.release(),
    cpu: os.cpus()[0]?.model,
    logicalCPUs: os.cpus().length,
    totalRAM: os.totalmem(),
    browser: await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      isolated: crossOriginIsolated,
      webGPUExposed: "gpu" in navigator,
    })),
    conditions:
      "Localhost, no network throttling; desktop Chrome headless; one WASM thread. Narrow viewport is not physical mobile.",
  };
  const records: {
    image: string;
    split: string;
    mode: string;
    wallMs: number;
    result: ExperimentResult;
    heartbeat: { samples: number; maxGapMs: number; p95GapMs: number };
    pageJSHeap: unknown;
  }[] = [];
  const save = () =>
    writeFile(
      `${directory}/browser-inference.json`,
      JSON.stringify(
        {
          environment,
          benchmarkVersion: benchmark.version,
          requests,
          downloads,
          records,
        },
        null,
        2,
      ) + "\n",
    );
  for (const mode of ["readiness", "baseline", "detector"] as const) {
    await page.getByLabel("Capability").selectOption(mode);
    const fixtures =
      mode === "readiness"
        ? benchmark.cases
        : mode === "baseline"
          ? benchmark.cases.filter((c) => !("parentId" in c))
          : benchmark.cases.filter((c) =>
              ["natural-07", "natural-13"].includes(c.id),
            );
    for (const fixture of fixtures) {
      await page
        .getByLabel("Experiment image")
        .setInputFiles(path.resolve(fixture.file));
      await expect(
        page.getByRole("img", { name: "Experimental input" }),
      ).toBeVisible();
      await page.evaluate(() => {
        const state = {
          last: performance.now(),
          gaps: [] as number[],
          timer: 0,
        };
        state.timer = window.setInterval(() => {
          const now = performance.now();
          state.gaps.push(now - state.last);
          state.last = now;
        }, 20);
        (
          window as unknown as { phase03Heartbeat: typeof state }
        ).phase03Heartbeat = state;
      });
      const start = Date.now();
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
        (await page.getByTestId("experiment-result").textContent())!,
      ) as ExperimentResult;
      const wallMs = Date.now() - start;
      const heartbeat = await page.evaluate(() => {
        const s = (
          window as unknown as {
            phase03Heartbeat: { gaps: number[]; timer: number };
          }
        ).phase03Heartbeat;
        clearInterval(s.timer);
        const a = s.gaps.sort((a, b) => a - b);
        return {
          samples: a.length,
          maxGapMs: Math.max(...a),
          p95GapMs: a[Math.floor(a.length * 0.95)],
        };
      });
      const cdp = await page.context().newCDPSession(page);
      const pageJSHeap = await cdp.send("Runtime.getHeapUsage");
      await cdp.detach();
      records.push({
        image: fixture.id,
        split: fixture.split,
        mode,
        wallMs,
        result,
        heartbeat,
        pageJSHeap,
      });
      await save();
      expect(result.backend).toBe("wasm");
      expect(result.inferenceMs).toBeGreaterThan(0);
      if (mode === "readiness")
        expect(result.discovery!.views[0].ranking).toHaveLength(36);
      expect(page.workers()).toHaveLength(1);
      console.log(
        "PHASE03",
        mode,
        fixture.id,
        Math.round(result.inferenceMs),
        result.discovery?.leading[0].id ?? result.predictions[0]?.label,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${directory}/research-narrow.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Release model / discard" }).click();
  await expect.poll(() => page.workers().length).toBe(0);
  await expect(page.getByTestId("experiment-result")).toHaveCount(0);
  // Explicit retry after failure, cancellation during loading, and replacement.
  await page.getByLabel("Capability").selectOption("baseline");
  await page.route("**/ai/**", (route) => route.abort());
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("failed", {
    timeout: 30_000,
  });
  await expect.poll(() => page.workers().length).toBe(0);
  await page.unroute("**/ai/**");
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByTestId("experiment-result")).toHaveCount(1, {
    timeout: 120_000,
  });
  await page.getByRole("button", { name: "Release model / discard" }).click();
  await page.route("**/ai/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue().catch(() => {});
  });
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await page.getByRole("button", { name: "Release model / discard" }).click();
  await page
    .getByLabel("Experiment image")
    .setInputFiles(path.resolve(benchmark.cases[0].file));
  await expect(page.getByTestId("experiment-result")).toHaveCount(0);
  await expect.poll(() => page.workers().length).toBe(0);
  expect(
    requests.every(
      (r) =>
        r.method === "GET" &&
        !r.body &&
        new URL(r.url).origin === "http://127.0.0.1:3001",
    ),
  ).toBe(true);
  const storage = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
  }));
  expect(storage).toEqual({ local: 0, session: 0 });
  await save();
  await writeFile(
    `${directory}/lifecycle.json`,
    JSON.stringify(
      {
        lazyLoading: true,
        oneWorker: true,
        release: true,
        failedLoad: true,
        manualRetry: true,
        cancelLoading: true,
        replacement: true,
        sameOriginGetOnly: true,
        storage,
      },
      null,
      2,
    ) + "\n",
  );
});
