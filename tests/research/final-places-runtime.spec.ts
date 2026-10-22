import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";
test("exact Places365 ResNet18 Chrome WASM eligibility", async ({ page }) => {
  test.setTimeout(120000);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/experiments/vision");
  await page.getByLabel("Capability").selectOption("places");
  await page
    .getByLabel("Experiment image")
    .setInputFiles(path.resolve("tests/fixtures/phase03/natural-00.jpg"));
  await expect(
    page.getByRole("img", { name: "Experimental input" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await page.getByTestId("experiment-result").count()) > 0 ||
        /failed|unavailable/i.test(await page.getByRole("status").innerText()),
      { timeout: 110000 },
    )
    .toBe(true);
  const status = await page.getByRole("status").innerText(),
    raw = (await page.getByTestId("experiment-result").count())
      ? JSON.parse((await page.getByTestId("experiment-result").textContent())!)
      : null;
  await writeFile(
    "docs/phase-03/evidence/final/places-runtime.json",
    JSON.stringify(
      {
        browser: await page.evaluate(() => navigator.userAgent),
        input:
          "Prior calibration image natural-00, compatibility only; not new quality evidence",
        status,
        result: raw,
        requests,
      },
      null,
      2,
    ),
  );
  expect(raw).not.toBeNull();
});
