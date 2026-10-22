import { test, expect, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExperimentResult } from "../../src/experiments/vision/types";

async function workerHeap(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { targetInfos } = await cdp.send("Target.getTargets");
    const target = targetInfos.find((t) => t.type === "worker");
    if (!target) return { unavailable: "No worker target" };
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: false,
    });
    const response = new Promise<Record<string, unknown>>((resolve) => {
      const timeout = setTimeout(
        () => resolve({ unavailable: "Worker heap request timed out" }),
        3000,
      );
      cdp.on("Target.receivedMessageFromTarget", (event) => {
        if (event.sessionId !== sessionId) return;
        const message = JSON.parse(event.message);
        if (message.id === 1) {
          clearTimeout(timeout);
          resolve(message.result ?? { unavailable: "CDP worker error" });
        }
      });
    });
    await cdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({ id: 1, method: "Runtime.getHeapUsage" }),
    });
    const result = await response;
    await cdp.send("Target.detachFromTarget", { sessionId });
    return result;
  } finally {
    await cdp.detach();
  }
}

test("phase03 exact-export prediction reproduction and worker memory proxy", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const saved = JSON.parse(
    await readFile("docs/phase-03/evidence/browser-inference.json", "utf8"),
  ) as { records: { image: string; mode: string; result: ExperimentResult }[] };
  await page.goto("/experiments/vision");
  const gpuProbe = await page.evaluate(async () => {
    const gpu = (
      navigator as unknown as {
        gpu?: { requestAdapter: () => Promise<unknown> };
      }
    ).gpu;
    try {
      return {
        exposed: !!gpu,
        adapterAvailable: gpu ? !!(await gpu.requestAdapter()) : false,
        inferenceTested: false,
      };
    } catch {
      return {
        exposed: !!gpu,
        adapterAvailable: false,
        inferenceTested: false,
        probeFailed: true,
      };
    }
  });
  const records = [];
  for (const mode of ["readiness", "baseline"] as const) {
    await page.getByLabel("Capability").selectOption(mode);
    await page
      .getByLabel("Experiment image")
      .setInputFiles(path.resolve("tests/fixtures/phase03/natural-01.jpg"));
    await expect(
      page.getByRole("img", { name: "Experimental input" }),
    ).toBeVisible();
    const start = Date.now();
    await page
      .getByRole("button", { name: "Run experiment", exact: true })
      .click();
    await expect(page.getByTestId("experiment-result")).toHaveCount(1, {
      timeout: 120_000,
    });
    const result = JSON.parse(
      (await page.getByTestId("experiment-result").textContent())!,
    ) as ExperimentResult;
    const reference = saved.records.find(
      (r) => r.mode === mode && r.image === "natural-01",
    )!.result;
    if (mode === "readiness") {
      expect(result.discovery!.leading[0].id).toBe(
        reference.discovery!.leading[0].id,
      );
      expect(result.discovery!.leading[0].cosine).toBeCloseTo(
        reference.discovery!.leading[0].cosine,
        5,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: "docs/phase-03/evidence/research-final-narrow.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 900 });
    } else {
      expect(result.predictions[0].label).toBe(reference.predictions[0].label);
      expect(result.predictions[0].score).toBeCloseTo(
        reference.predictions[0].score,
        5,
      );
    }
    records.push({
      mode,
      image: "natural-01",
      wallMs: Date.now() - start,
      result,
      workerV8HeapAfterInference: await workerHeap(page),
    });
    await page.getByRole("button", { name: "Release model / discard" }).click();
    await expect.poll(() => page.workers().length).toBe(0);
  }
  await page.getByRole("button", { name: "Release model / discard" }).click();
  await expect.poll(() => page.workers().length).toBe(0);
  await writeFile(
    "docs/phase-03/evidence/reproduction.json",
    JSON.stringify(
      {
        browser: await page.evaluate(() => navigator.userAgent),
        gpuProbe,
        memoryLimitations:
          "Worker V8 heap/backing storage snapshot after inference, not native/WASM/GPU peak or physical-device certification.",
        records,
      },
      null,
      2,
    ) + "\n",
  );
});
