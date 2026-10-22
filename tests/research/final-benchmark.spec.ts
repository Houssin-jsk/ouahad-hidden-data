import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
test("final candidate timing stability privacy and research cleanup", async ({
  page,
}) => {
  test.setTimeout(180000);
  const transfers: { url: string; bytes: number }[] = [];
  const requests: { url: string; method: string; body: boolean }[] = [];
  page.on("response", (r) => {
    if (/\/ai\//.test(r.url()))
      transfers.push({
        url: r.url(),
        bytes: Number(r.headers()["content-length"]),
      });
  });
  page.on("request", (r) =>
    requests.push({
      url: r.url(),
      method: r.method(),
      body: r.postData() !== null,
    }),
  );
  await page.goto("/experiments/vision");
  expect(transfers).toHaveLength(0);
  const original = await readFile(
      "tests/fixtures/phase03-final/natural-00.jpg",
    ),
    records = [];
  for (const mode of ["tiny", "places"]) {
    await page.getByLabel("Capability").selectOption(mode);
    for (const variant of ["original", "repeat", "dark", "blur"]) {
      const buffer =
        variant === "dark"
          ? await sharp(original)
              .modulate({ brightness: 0.25 })
              .jpeg()
              .toBuffer()
          : variant === "blur"
            ? await sharp(original).blur(8).jpeg().toBuffer()
            : original;
      const previous = (await page
        .getByRole("img", { name: "Experimental input" })
        .count())
        ? await page
            .getByRole("img", { name: "Experimental input" })
            .getAttribute("src")
        : null;
      await page
        .getByLabel("Experiment image")
        .setInputFiles({
          name: variant + ".jpg",
          mimeType: "image/jpeg",
          buffer,
        });
      await expect(
        page.getByRole("img", { name: "Experimental input" }),
      ).toBeVisible();
      if (previous)
        await expect(
          page.getByRole("img", { name: "Experimental input" }),
        ).not.toHaveAttribute("src", previous);
      await page.evaluate(() => {
        const state = {
          last: performance.now(),
          gaps: [] as number[],
          timer: 0,
        };
        state.timer = window.setInterval(() => {
          const at = performance.now();
          state.gaps.push(at - state.last);
          state.last = at;
        }, 20);
        Object.assign(window, { finalHeartbeat: state });
      });
      const at = Date.now();
      await page
        .getByRole("button", { name: "Run experiment", exact: true })
        .click();
      await expect(page.getByTestId("experiment-result")).toHaveCount(1, {
        timeout: 120000,
      });
      const result = JSON.parse(
        (await page.getByTestId("experiment-result").textContent())!,
      );
      const heartbeat = await page.evaluate(() => {
        const s = (
          window as unknown as {
            finalHeartbeat: { gaps: number[]; timer: number };
          }
        ).finalHeartbeat;
        clearInterval(s.timer);
        return { samples: s.gaps.length, maxGapMs: Math.max(...s.gaps) };
      });
      const cdp = await page.context().newCDPSession(page),
        pageV8Heap = await cdp.send("Runtime.getHeapUsage");
      await cdp.detach();
      records.push({
        mode,
        variant,
        input:
          "Final calibration natural-00 only; transformations are related diagnostics, not independent quality examples",
        wallMs: Date.now() - at,
        result,
        heartbeat,
        pageV8Heap,
      });
      expect(page.workers()).toHaveLength(1);
    }
    await page.getByRole("button", { name: "Release model / discard" }).click();
    await expect.poll(() => page.workers().length).toBe(0);
  }
  await page.getByLabel("Capability").selectOption("tiny");
  await page.route("**/experiments/ai/tiny/**", (r) => r.abort());
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("failed", {
    timeout: 30000,
  });
  await page.unroute("**/experiments/ai/tiny/**");
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByTestId("experiment-result")).toHaveCount(1, {
    timeout: 120000,
  });
  await page.getByRole("button", { name: "Release model / discard" }).click();
  await expect.poll(() => page.workers().length).toBe(0);
  expect(
    requests.every(
      (r) =>
        r.url.startsWith("blob:") ||
        (r.method === "GET" &&
          !r.body &&
          new URL(r.url).origin === "http://127.0.0.1:3001"),
    ),
  ).toBe(true);
  await writeFile(
    "docs/phase-03/evidence/final/browser-benchmark.json",
    JSON.stringify(
      {
        browser: await page.evaluate(() => navigator.userAgent),
        records,
        requests,
        transfers,
        workerRelease: true,
        manualRetry: true,
        memoryCaveat:
          "Page V8 snapshots exclude worker/native WASM heap and are not peak model memory.",
        conditions:
          "Desktop Chrome/WASM localhost, unthrottled; not physical mobile or WAN transfer.",
      },
      null,
      2,
    ),
  );
});
