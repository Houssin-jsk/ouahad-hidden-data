import { test, expect, type Page } from "@playwright/test";

async function textContrast(page: Page, selector: string) {
  const failures = await page.locator(selector).evaluateAll((elements) => {
    const rgb = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (color: number[]) => {
      const linear = color.map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    return elements.flatMap((element) => {
      if (!element.getBoundingClientRect().width || element.closest(".sr-only"))
        return [];
      const style = getComputedStyle(element);
      let ancestor: Element | null = element;
      let background = "rgb(217, 201, 180)";
      while (ancestor) {
        const value = getComputedStyle(ancestor).backgroundColor;
        if (value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
          background = value;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      const a = luminance(rgb(style.color)),
        b = luminance(rgb(background));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const large =
        parseFloat(style.fontSize) >= 24 ||
        (parseFloat(style.fontSize) >= 18.66 &&
          Number(style.fontWeight) >= 700);
      return ratio >= (large ? 3 : 4.5)
        ? []
        : [{ text: element.textContent?.trim(), ratio }];
    });
  });
  expect(failures).toEqual([]);
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`warm theme, first-screen CTA and result layout at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const consoleIssues: string[] = [];
    page.on("pageerror", (error) => consoleIssues.push(error.message));
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type()))
        consoleIssues.push(message.text());
    });
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(217, 201, 180)",
    );
    await expect(page.locator(".identity img")).toHaveAttribute(
      "src",
      "/brand/logo_black.png",
    );
    const cta = await page.locator(".select-button").boundingBox();
    expect(cta).not.toBeNull();
    expect(cta!.y + cta!.height).toBeLessThan(viewport.height);
    expect(cta!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await textContrast(
      page,
      ".identity strong, .identity small, .local-badge, .edition, .intro p, .eyebrow, .step, .panel-heading, .drop-zone h2, .drop-zone p, .drop-zone small, .select-button, .file-label, .image-toolbar small, .privacy, .empty-top h2, .empty-top p, .feature-list h3, .feature-list p, .statistics-note p, .method-strip > span, footer",
    );
    await page.screenshot({
      path: `test-results/warm-welcome-${viewport.width}.png`,
      fullPage: true,
    });
    const encoded = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ["#3590DF", "#F3A339", "#077F64"].forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * 200, 0, 200, 400);
      });
      return canvas.toDataURL().split(",")[1];
    });
    await page
      .getByLabel("Choose image")
      .setInputFiles({
        name: "known-colors.png",
        mimeType: "image/png",
        buffer: Buffer.from(encoded, "base64"),
      });
    await textContrast(page, ".analyze-button, .text-button");
    await page.getByRole("button", { name: "Analyze image" }).click();
    await expect(page.locator(".properties")).toContainText("600 × 400");
    await expect(page.locator(".step.completed")).toHaveCount(2);
    for (const tab of ["Overview", "Color", "Light"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await textContrast(
        page,
        ".results-tabs button, .result-title h2, .result-title p, .properties dt, .properties dd, .overview-caption, .overview-caption button, .overview-light > span, .axis, .palette-list code, .average-color strong, .average-color small, .sample-note, .result-footnote, .tone-list span, .light-stats dt, .light-stats dd",
      );
    }
    const chartContrast = await page
      .locator(".histogram > div")
      .first()
      .evaluate((element) => ({
        border: getComputedStyle(element).borderColor,
        fill: getComputedStyle(element).backgroundColor,
      }));
    expect(chartContrast).toEqual({
      border: "rgb(42, 123, 192)",
      fill: "rgb(53, 144, 223)",
    });
    await page.screenshot({
      path: `test-results/warm-results-${viewport.width}.png`,
      fullPage: true,
    });
    expect(consoleIssues).toEqual([]);
  });
}
