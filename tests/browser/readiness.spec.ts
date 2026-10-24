import { test, expect } from "@playwright/test";

test("security headers protect the workspace and owner routes", async ({
  request,
}) => {
  for (const path of [
    "/",
    "/admin/ai",
    "/api/admin/ai",
    "/api/cloud-vision/status",
  ]) {
    const response = await request.get(path);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["x-powered-by"]).toBeUndefined();
    if (path.startsWith("/api/"))
      expect(headers["cache-control"]).toContain("no-store");
  }
});

for (const width of [320, 1280]) {
  test(`WCAG automated accessibility and real local analysis at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    // axe-core is included by the locked eslint-plugin-jsx-a11y dependency.
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const scan = async (state: string) => {
      const report = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                node: Document,
                options: unknown,
              ) => Promise<{
                violations: unknown[];
                incomplete: unknown[];
                passes: unknown[];
              }>;
            };
          }
        ).axe;
        const result = await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        });
        return {
          violations: result.violations,
          incomplete: result.incomplete,
          passes: result.passes.length,
        };
      });
      await testInfo.attach(`${state}-${width}-axe`, {
        body: JSON.stringify(report),
        contentType: "application/json",
      });
      expect(report.violations).toEqual([]);
    };
    await scan("landing");
    await page
      .getByLabel("Choose image")
      .setInputFiles("tests/fixtures/discovery/landscape.jpg");
    const started = Date.now();
    await page
      .getByRole("button", { name: "Analyze image", exact: true })
      .click();
    await expect(page.getByTestId("image-dna")).toBeVisible();
    const localAnalysisMs = Date.now() - started;
    for (const tab of ["Overview", "Color", "Light", "Metadata"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.locator("details").evaluateAll((elements) =>
        elements.forEach((element) => {
          (element as HTMLDetailsElement).open = true;
        }),
      );
      await scan(tab);
    }
    await testInfo.attach(`performance-${width}`, {
      body: JSON.stringify({
        localAnalysisMs,
        resources: await page.evaluate(() =>
          performance.getEntriesByType("resource").map((r) => {
            const entry = r as PerformanceResourceTiming;
            return {
              kind: entry.initiatorType,
              encodedBytes: entry.encodedBodySize,
              durationMs: entry.duration,
            };
          }),
        ),
      }),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
  });
}

test("comparison split responds to touch, mouse and keyboard", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3001/");
    await page
      .getByLabel("Choose image")
      .setInputFiles("tests/fixtures/discovery/landscape.jpg");
    await page
      .getByRole("button", { name: "Analyze image", exact: true })
      .click();
    await expect(page.getByTestId("image-dna")).toBeVisible();
    await page.locator(".map-explorer > summary").tap();
    await page.getByRole("button", { name: "Compare", exact: true }).tap();
    const slider = page.getByRole("slider", {
      name: "Detail / original split",
    });
    await slider.scrollIntoViewIfNeeded();
    const bounds = (await slider.boundingBox())!;
    await page.touchscreen.tap(
      bounds.x + bounds.width * 0.75,
      bounds.y + bounds.height / 2,
    );
    const afterTouch = Number(await slider.inputValue());
    expect(afterTouch).toBeGreaterThan(65);
    await page.mouse.click(
      bounds.x + bounds.width * 0.25,
      bounds.y + bounds.height / 2,
    );
    const afterMouse = Number(await slider.inputValue());
    expect(afterMouse).toBeLessThan(35);
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    expect(Number(await slider.inputValue())).toBe(afterMouse + 1);
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("0");
    await expect(page.locator(".comparison-map")).toHaveCSS(
      "clip-path",
      "inset(0px 100% 0px 0px)",
    );
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("100");
    await expect(page.locator(".comparison-map")).toHaveCSS(
      "clip-path",
      "inset(0px 0% 0px 0px)",
    );
  } finally {
    await context.close();
  }
});
