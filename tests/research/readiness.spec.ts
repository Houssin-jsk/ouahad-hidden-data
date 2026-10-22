import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import benchmark from "../fixtures/readiness/benchmark.json";
import {
  SCENE_LIBRARY,
  SCENE_LIBRARY_VERSION,
} from "../../src/scene/candidates";
import {
  AUDITED_SCENE_LIBRARY,
  AUDITED_LIBRARY_VERSION,
} from "../../src/scene/audited-candidates";
import type { ExperimentResult } from "../../src/experiments/vision/types";

async function memory(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { targetInfos } = await cdp.send("Target.getTargets");
    const target = targetInfos.find((t) => t.type === "worker");
    if (!target) return { unavailable: "No experiment worker target" };
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: false,
    });
    const response = new Promise<Record<string, unknown>>((resolve) => {
      const timeout = setTimeout(
        () => resolve({ unavailable: "Heap snapshot timed out" }),
        3000,
      );
      cdp.on("Target.receivedMessageFromTarget", (e) => {
        if (e.sessionId !== sessionId) return;
        const m = JSON.parse(e.message);
        if (m.id === 1) {
          clearTimeout(timeout);
          resolve(m.result ?? { unavailable: "CDP error" });
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
  } catch {
    return { unavailable: "Worker memory API unavailable" };
  } finally {
    await cdp.detach();
  }
}

test("24 unseen photographs: original vs audited library, real CPU inference and separate judgments", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
  );
  await page.goto("/experiments/vision");
  expect(requests.some((r) => r.url.includes("/experiments/ai/"))).toBe(false);
  const environment = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    isolated: crossOriginIsolated,
  }));
  const records = [];
  for (const mode of ["discovery", "readiness"] as const) {
    await page.getByLabel("Capability").selectOption(mode);
    // Evaluate the held-out split after the audit split, without any intervening changes.
    for (const fixture of [...benchmark.cases].sort((a, b) =>
      a.split.localeCompare(b.split),
    )) {
      const beforeRequests = requests.length;
      await page
        .getByLabel("Experiment image")
        .setInputFiles(path.resolve(fixture.file));
      await expect(
        page.getByRole("img", { name: "Experimental input" }),
      ).toBeVisible();
      expect(
        requests.slice(beforeRequests).some((r) => r.url.includes("clip/")),
      ).toBe(false);
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
          window as unknown as { readinessHeartbeat: typeof state }
        ).readinessHeartbeat = state;
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
      const wallMs = Date.now() - start;
      const result = JSON.parse(
        (await page.getByTestId("experiment-result").textContent())!,
      ) as ExperimentResult;
      const responsiveness = await page.evaluate(() => {
        const s = (
          window as unknown as {
            readinessHeartbeat: { gaps: number[]; timer: number };
          }
        ).readinessHeartbeat;
        clearInterval(s.timer);
        const sorted = [...s.gaps].sort((a, b) => a - b);
        return {
          intervalMs: 20,
          samples: sorted.length,
          maxGapMs: Math.max(...sorted),
          p95GapMs: sorted[Math.floor(sorted.length * 0.95)],
        };
      });
      const snapshot: Record<string, unknown> | null =
        records.length === 0 || fixture.id === "coast"
          ? await memory(page)
          : null;
      const relevant =
        mode === "readiness"
          ? fixture.relevantAudited
          : fixture.relevantOriginal;
      const leading = result.discovery!.leading;
      const judgment = {
        acceptedIds: relevant,
        covered: relevant.length > 0,
        topRelevant: relevant.includes(leading[0].id),
        leading4Relevant: leading
          .slice(0, 4)
          .some((m) => relevant.includes(m.id)),
        leading5Relevant: leading.some((m) => relevant.includes(m.id)),
        // The engine has no automatic out-of-scope detector; disclaimers are separate.
        explicitlyAbstained: false,
      };
      records.push({
        image: fixture.id,
        split: fixture.split,
        mode,
        wallMs,
        result,
        judgment,
        responsiveness,
        workerV8Snapshot: snapshot,
      });
      expect(result.backend).toBe("wasm");
      expect(result.discovery!.libraryVersion).toBe(
        mode === "readiness" ? AUDITED_LIBRARY_VERSION : SCENE_LIBRARY_VERSION,
      );
      expect(result.discovery!.views[0].ranking.length).toBe(36);
      expect(responsiveness.samples).toBeGreaterThan(5);
      await expect(
        page.getByRole("region", { name: "Scene discovery" }),
      ).toContainText("supplied description, not a generated caption");
      console.log(
        "READINESS",
        mode,
        fixture.id,
        leading
          .slice(0, 4)
          .map((m) => m.id)
          .join(","),
        judgment.topRelevant,
        Math.round(result.inferenceMs),
      );
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
    requests.filter((r) => r.url.endsWith("clip/onnx/model_quantized.onnx")),
  ).toHaveLength(1);
  expect(records.slice(1).every((r) => r.result.reused)).toBe(true);
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/phase-4-3-benchmark.json",
    JSON.stringify(
      {
        environment,
        benchmark,
        libraries: {
          original: {
            version: SCENE_LIBRARY_VERSION,
            candidates: SCENE_LIBRARY,
          },
          audited: {
            version: AUDITED_LIBRARY_VERSION,
            candidates: AUDITED_SCENE_LIBRARY,
          },
        },
        requests,
        records,
      },
      null,
      2,
    ) + "\n",
  );
});
