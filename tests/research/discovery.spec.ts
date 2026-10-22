import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import benchmark from "../fixtures/discovery/benchmark.json";
import {
  SCENE_LIBRARY,
  SCENE_LIBRARY_VERSION,
} from "../../src/scene/candidates";
import type { ExperimentResult } from "../../src/experiments/vision/types";

async function workerMemory(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { targetInfos } = await cdp.send("Target.getTargets");
    const target = targetInfos.find((t) => t.type === "worker");
    if (!target) return { unavailable: "No worker debugger target" };
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: false,
    });
    const response = new Promise<Record<string, unknown>>((resolve) => {
      const timeout = setTimeout(
        () => resolve({ unavailable: "Worker heap snapshot timed out" }),
        3000,
      );
      cdp.on("Target.receivedMessageFromTarget", (event) => {
        if (event.sessionId !== sessionId) return;
        const message = JSON.parse(event.message);
        if (message.id === 1) {
          clearTimeout(timeout);
          resolve(
            message.result ?? { unavailable: JSON.stringify(message.error) },
          );
        }
      });
    });
    await cdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({ id: 1, method: "Runtime.getHeapUsage" }),
    });
    const memory = await response;
    await cdp.send("Target.detachFromTarget", { sessionId });
    return memory;
  } catch (error) {
    return {
      unavailable: error instanceof Error ? error.message : "CDP unavailable",
    };
  } finally {
    await cdp.detach();
  }
}
test("frozen six-image discovery benchmark: real WASM, coverage comparison, baseline, privacy and memory", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const requests: { url: string; method: string; body: string | null }[] = [];
  const downloads: { url: string; declaredBytes: number | null }[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
  );
  page.on("response", async (r) => {
    if (
      r.url().includes("/experiments/ai/clip/") ||
      r.url().includes("/ai/runtime/")
    ) {
      const header = await r.headerValue("content-length");
      downloads.push({
        url: r.url(),
        declaredBytes: header === null ? null : Number(header),
      });
    }
  });
  await page.goto("/experiments/vision");
  expect(requests.some((r) => r.url.includes("/experiments/ai/"))).toBe(false);
  const records = [];
  for (const mode of ["baseline", "discovery"]) {
    await page.getByLabel("Capability").selectOption(mode);
    for (const fixture of benchmark.cases) {
      await page
        .getByLabel("Experiment image")
        .setInputFiles(path.resolve(fixture.file));
      await expect(
        page.getByRole("img", { name: "Experimental input" }),
      ).toBeVisible();
      for (const coverage of mode === "baseline"
        ? ["whole"]
        : ["whole", "multi-crop"]) {
        if (mode === "discovery")
          await page.getByLabel("Image coverage").selectOption(coverage);
        const started = Date.now();
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
        const memory = await workerMemory(page);
        records.push({
          mode,
          coverage,
          image: path.basename(fixture.file),
          wallMs: Date.now() - started,
          result,
          workerV8Snapshot: memory,
        });
        if (mode === "discovery") {
          const scene = result.discovery!;
          expect(scene.libraryVersion).toBe(SCENE_LIBRARY_VERSION);
          expect(scene.views.length).toBe(coverage === "whole" ? 1 : 4);
          expect(scene.leading.length).toBe(5);
          expect(scene.views[0].ranking.length).toBe(36);
          expect(
            scene.leading.every(
              (m) => Number.isFinite(m.cosine) && Math.abs(m.cosine) <= 1,
            ),
          ).toBe(true);
          if (coverage === "multi-crop")
            expect(scene.views[0].ranking[0].cosine).toBeCloseTo(
              records.at(-2)!.result.discovery!.leading[0].cosine,
              5,
            );
          await expect(
            page.getByRole("region", { name: "Scene discovery" }),
          ).not.toContainText(/%|probability of correctness/i);
          console.log(
            "SCENE BENCHMARK",
            path.basename(fixture.file),
            coverage,
            scene.leading.slice(0, 3).map((m) => [m.id, m.cosine.toFixed(3)]),
            scene.viewAgreement,
            Math.round(result.inferenceMs),
            memory,
          );
          if (fixture.file.includes("outdoor") && coverage === "multi-crop") {
            await page.screenshot({
              path: "test-results/discovery-desktop.png",
              fullPage: true,
            });
            await page.setViewportSize({ width: 390, height: 844 });
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true);
            await page.screenshot({
              path: "test-results/discovery-mobile.png",
              fullPage: true,
            });
            await page.setViewportSize({ width: 1280, height: 900 });
          }
        }
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
    requests.filter((r) => r.url.endsWith("clip/onnx/model_quantized.onnx"))
      .length,
  ).toBe(1);
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/phase-4-2-benchmark.json",
    JSON.stringify(
      {
        environment:
          "Chrome Windows desktop; WASM one thread; V8 snapshots exclude total process/peak/GPU memory. Local download timings are not internet estimates.",
        benchmark,
        libraryVersion: SCENE_LIBRARY_VERSION,
        candidates: SCENE_LIBRARY,
        downloads,
        records,
      },
      null,
      2,
    ) + "\n",
  );
});
test("discovery replacement during download discards results and leaves pixel analysis available", async ({
  page,
}) => {
  await page.route("**/experiments/ai/clip/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.abort();
  });
  await page.goto("/experiments/vision");
  await page
    .getByLabel("Experiment image")
    .setInputFiles(path.resolve(benchmark.cases[0].file));
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run experiment", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Experiment image")
    .setInputFiles(path.resolve(benchmark.cases[1].file));
  await expect(
    page.getByRole("button", { name: "Run experiment", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("experiment-result")).toHaveCount(0);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every image has a story." }),
  ).toBeVisible();
});
