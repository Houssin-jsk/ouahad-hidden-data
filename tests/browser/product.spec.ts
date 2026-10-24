import { test, expect, type Page } from "@playwright/test";

async function analyze(page: Page) {
  await page
    .getByLabel("Choose image")
    .setInputFiles("tests/fixtures/discovery/landscape.jpg");
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const width of [320, 375, 390, 430, 768, 1280, 1440]) {
  test(`product hierarchy and usable controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const issues: string[] = [];
    page.on("pageerror", (e) => issues.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Color you can use. Light you can understand.",
    );
    await expect(
      page.getByRole("button", { name: "Select image", exact: true }),
    ).toBeVisible();
    const headerTargets = await page
      .locator("header a")
      .evaluateAll((elements) =>
        elements.map((e) => e.getBoundingClientRect().height),
      );
    expect(headerTargets.every((height) => height >= 44)).toBe(true);
    await noOverflow(page);
    if ([320, 390, 1280].includes(width))
      await page.screenshot({
        path: `test-results/product-welcome-${width}.png`,
        fullPage: true,
      });
    await analyze(page);
    await expect(
      page.getByRole("tab", { name: "Overview", exact: true }),
    ).toBeFocused();
    await expect(page.getByTestId("image-dna")).toContainText(
      "Leading color family",
    );
    await expect(page.getByTestId("image-dna")).not.toContainText(
      /standard deviation|average RGB/,
    );
    await expect(page.locator(".measurement-details")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator(".map-explorer")).not.toHaveAttribute("open", "");
    await expect(
      page.getByRole("heading", {
        name: "AI Visual Observations",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".cloud-access[open]")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(
      /PHASE\s*0[1-4]|IMAGE LAB|IMAGE STATISTICS|Interpretation rule:|version 1\.0\.0/,
    );
    await noOverflow(page);
    await page.screenshot({
      path: `test-results/product-overview-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Overview", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Color", exact: true }),
    ).toBeFocused();
    await expect(page.locator(".palette-list code")).toHaveCount(6);
    await expect(page.locator(".distribution-details")).not.toHaveAttribute(
      "open",
      "",
    );
    await noOverflow(page);
    if ([320, 1280].includes(width))
      await page.screenshot({
        path: `test-results/product-color-${width}.png`,
        fullPage: true,
      });
    const smallTargets = await page
      .locator(
        ".results-tabs button, .palette-list button, .palette-actions button, .palette-text summary, .remove-image",
      )
      .evaluateAll((elements) =>
        elements
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width && (b.width < 44 || b.height < 44);
          })
          .map((e) => e.textContent || e.getAttribute("aria-label")),
      );
    expect(smallTargets).toEqual([]);
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Light", exact: true }),
    ).toBeFocused();
    await expect(page.locator(".histogram > div")).toHaveCount(32);
    await expect(page.locator(".light-technical")).not.toHaveAttribute(
      "open",
      "",
    );
    await noOverflow(page);
    if (width === 390)
      await page.screenshot({
        path: "test-results/product-light-390.png",
        fullPage: true,
      });
    await page.keyboard.press("End");
    await expect(
      page.getByRole("tab", { name: "Metadata", exact: true }),
    ).toBeFocused();
    await noOverflow(page);
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("tab", { name: "Overview", exact: true }),
    ).toBeFocused();
    expect(issues).toEqual([]);
  });
}

test("palette copies exact HEX values and reusable CSS; unavailable clipboard has a manual fallback", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await analyze(page);
  await page.getByRole("button", { name: "Explore palette" }).click();
  const colors = await page.locator(".palette-list code").allTextContents();
  await page
    .getByRole("button", { name: `Copy ${colors[0]}`, exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    colors[0],
  );
  await page.getByRole("button", { name: "Copy palette", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    colors.join(", "),
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Palette copied." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy CSS", exact: true }).click();
  const css = `:root {\n${colors.map((color, index) => `  --image-color-${index + 1}: ${color};`).join("\n")}\n}`;
  const copiedCss = await page.evaluate(() => navigator.clipboard.readText());
  // The Windows system clipboard normalizes line endings to CRLF.
  expect(copiedCss.replace(/\r\n/g, "\n")).toBe(css);
  const declarations = await page.evaluate((css) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const rule = sheet.cssRules[0] as CSSStyleRule;
    return Array.from(rule.style).map((name) =>
      rule.style.getPropertyValue(name).trim(),
    );
  }, copiedCss);
  expect(declarations).toEqual(colors);
  await expect(
    page.getByRole("status").filter({ hasText: "CSS variables copied." }),
  ).toBeVisible();
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("Denied by browser");
    };
  });
  await page.getByRole("button", { name: "Copy CSS", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Clipboard unavailable." }),
  ).toBeVisible();
  await expect(page.locator(".copy-feedback")).toBeEmpty();
  await page.getByText("View palette text", { exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Palette HEX codes", exact: true }),
  ).toHaveValue(colors.join(", "));
  const manual = page.getByRole("textbox", {
    name: "Palette CSS variables",
    exact: true,
  });
  await expect(manual).toHaveValue(css);
  await manual.focus();
  expect(
    await manual.evaluate(
      (e) =>
        (e as HTMLTextAreaElement).selectionEnd -
        (e as HTMLTextAreaElement).selectionStart,
    ),
  ).toBe(css.length);
});

test("maps are optional, keyboard operable and honestly described; closing restores the original", async ({
  page,
}) => {
  await page.goto("/");
  await analyze(page);
  const summary = page.locator(".map-explorer > summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.getByRole("img", { name: /Light map/ })).toBeVisible();
  await expect(page.locator(".map-explanation")).toContainText(
    "not an exposure grade",
  );
  await page.getByRole("button", { name: "Detail", exact: true }).click();
  await expect(page.locator(".map-explanation")).toContainText(
    "edges and texture",
  );
  await expect(page.locator(".map-explanation")).toContainText(
    "do not measure sharpness",
  );
  await page.getByText("Map technical details", { exact: true }).click();
  await expect(page.locator(".map-description")).toContainText("Sobel");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page
    .getByRole("slider", { name: "Detail / original split" })
    .fill("25");
  await expect(page.locator(".comparison-map")).toHaveCSS(
    "clip-path",
    "inset(0px 75% 0px 0px)",
  );
  await page.screenshot({
    path: "test-results/product-maps-1280.png",
    fullPage: true,
  });
  await summary.click();
  await expect(
    page.getByRole("img", { name: "Selected image: landscape.jpg" }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("link", { name: "How it works" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#method")).toHaveAttribute("open", "");
  await expect(page.locator("#method")).toContainText("sRGB");
});
