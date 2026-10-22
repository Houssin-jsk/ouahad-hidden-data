import { test, expect } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import benchmark from "../fixtures/phase03-final/benchmark.json";
import {
  calibrate,
  accepts,
  quality,
  type QualityRow,
} from "../../src/experiments/vision/quality";
test("one frozen TinyCLIP calibration then held-out pass", async ({ page }) => {
  test.setTimeout(300000);
  const requests: { url: string; method: string; body: boolean }[] = [];
  page.on("request", (r) =>
    requests.push({
      url: r.url(),
      method: r.method(),
      body: r.postData() !== null,
    }),
  );
  await page.goto("/experiments/vision");
  expect(requests.some((r) => /\/ai\//.test(r.url))).toBe(false);
  await page.getByLabel("Capability").selectOption("tiny");
  const records: {
    id: string;
    split: string;
    row: QualityRow;
    wallMs: number;
    result: Record<string, unknown>;
  }[] = [];
  let policies: Record<string, ReturnType<typeof calibrate>> = {};
  for (const split of ["calibration", "test"]) {
    if (split === "test") {
      policies = Object.fromEntries(
        benchmark.labels.map((label) => [
          label,
          calibrate(
            records.map((r) => r.row).filter((r) => r.ranking[0].id === label),
          ),
        ]),
      );
      await writeFile(
        "docs/phase-03/evidence/final/frozen-policies.json",
        JSON.stringify({ policies, createdBeforeTestInference: true }, null, 2),
      );
    }
    for (const fixture of benchmark.cases.filter((c) => c.split === split)) {
      const previous = (await page
        .getByRole("img", { name: "Experimental input" })
        .count())
        ? await page
            .getByRole("img", { name: "Experimental input" })
            .getAttribute("src")
        : null;
      await page
        .getByLabel("Experiment image")
        .setInputFiles(path.resolve(fixture.file));
      await expect(
        page.getByRole("img", { name: "Experimental input" }),
      ).toBeVisible();
      if (previous)
        await expect(
          page.getByRole("img", { name: "Experimental input" }),
        ).not.toHaveAttribute("src", previous);
      const start = Date.now();
      await page
        .getByRole("button", { name: "Run experiment", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await page.getByTestId("experiment-result").count()) === 1 ||
            /failed|unavailable/i.test(
              await page.getByRole("status").innerText(),
            ),
          { timeout: 120000 },
        )
        .toBe(true);
      expect(await page.getByRole("status").innerText()).not.toMatch(
        /failed|unavailable/i,
      );
      const result = JSON.parse(
        (await page.getByTestId("experiment-result").textContent())!,
      );
      const row = {
        id: fixture.id,
        acceptedIds: fixture.acceptedIds,
        ranking: result.predictions.map(
          (p: { label: string; score: number }) => ({
            id: p.label,
            score: p.score,
          }),
        ),
      };
      records.push({
        id: fixture.id,
        split,
        row,
        wallMs: Date.now() - start,
        result,
      });
      await writeFile(
        "docs/phase-03/evidence/final/tiny-quality.json",
        JSON.stringify(
          {
            browser: await page.evaluate(() => navigator.userAgent),
            benchmarkVersion: benchmark.version,
            records,
            requests,
            policies,
          },
          null,
          2,
        ),
      );
      console.log(
        fixture.id,
        row.ranking[0].id,
        Math.round(result.inferenceMs),
      );
    }
  }
  const rows = records.filter((r) => r.split === "test").map((r) => r.row),
    raw = quality(rows, { minimumScore: -1, minimumMargin: 0 });
  const accepted = rows.filter((r) => accepts(r, policies[r.ranking[0].id]));
  const correct = accepted.filter((r) =>
    r.acceptedIds.includes(r.ranking[0].id),
  ).length;
  const unsupportedAccepted = accepted.filter(
    (r) => !r.acceptedIds.length,
  ).length;
  const metrics = {
    relevance: raw.coveredTop1,
    accepted: accepted.length,
    correctAccepted: correct,
    precision: accepted.length ? correct / accepted.length : null,
    coverage: raw.covered
      ? accepted.filter((r) => r.acceptedIds.length).length / raw.covered
      : 0,
    unsupportedAccepted,
    raw,
  };
  const gates = {
    relevance: (metrics.relevance ?? 0) >= 0.8,
    precision: (metrics.precision ?? 0) >= 0.9,
    coverage: metrics.coverage >= 0.5,
    unsupported: unsupportedAccepted === 0,
    nontrivial: correct >= 4,
  };
  await writeFile(
    "docs/phase-03/evidence/final/tiny-decision.json",
    JSON.stringify(
      { metrics, gates, pass: Object.values(gates).every(Boolean), policies },
      null,
      2,
    ),
  );
  expect(
    requests.every(
      (r) =>
        r.url.startsWith("blob:") ||
        (r.method === "GET" &&
          !r.body &&
          new URL(r.url).origin === "http://127.0.0.1:3001"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Release model / discard" }).click();
  await expect.poll(() => page.workers().length).toBe(0);
  // Ensure the model evidence is not an empty artifact even when quality fails.
  expect(
    JSON.parse(
      await readFile("docs/phase-03/evidence/final/tiny-quality.json", "utf8"),
    ).records,
  ).toHaveLength(24);
});
