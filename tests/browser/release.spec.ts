import { test, expect } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`non-AI release at ${width}px: real analysis, replacement, no model or inference traffic`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests: { url: string; method: string; body: string | null }[] = [];
    page.on("request", (r) =>
      requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
    );
    await page.goto("/");
    for (const [name, color] of [
      ["red.png", "red"],
      ["blue.png", "blue"],
    ]) {
      const bytes = await page.evaluate((color) => {
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 40;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 80, 40);
        return canvas.toDataURL("image/png").split(",")[1];
      }, color);
      await page
        .getByLabel("Choose image")
        .setInputFiles({
          name,
          mimeType: "image/png",
          buffer: Buffer.from(bytes, "base64"),
        });
      const start = Date.now();
      await page
        .getByRole("button", { name: "Analyze image", exact: true })
        .click();
      await expect(page.getByTestId("image-dna")).toBeVisible();
      expect(Date.now() - start).toBeLessThan(12000);
      await expect(page.getByRole("tab")).toHaveText([
        "Overview",
        "Color",
        "Light",
        "Metadata",
      ]);
      await expect(page.getByTestId("image-dna")).toContainText(
        color === "red" ? "255 / 0 / 0" : "0 / 0 / 255",
      );
      await page.getByRole("tab", { name: "Color", exact: true }).click();
      await expect(page.locator(".average-color")).toContainText(
        color === "red" ? "#FF0000" : "#0000FF",
      );
      await page.getByRole("tab", { name: "Light", exact: true }).click();
      await expect(page.locator(".histogram>div")).toHaveCount(32);
      await page.getByRole("tab", { name: "Metadata", exact: true }).click();
      await expect(
        page.getByRole("tab", { name: "AI Vision", exact: true }),
      ).toHaveCount(0);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      requests.every(
        (r) =>
          r.method === "GET" &&
          r.body === null &&
          new URL(r.url).origin === new URL(page.url()).origin,
      ),
    ).toBe(true);
    expect(
      requests.filter((r) =>
        /\/ai\/|\/experiments\/|\.onnx|\.wasm|huggingface|inference/i.test(
          r.url,
        ),
      ),
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/release-${width}.png`,
      fullPage: true,
    });
  });
}
test("research routes and model/runtime assets return 404 in production", async ({
  request,
}) => {
  for (const url of [
    "/experiments/vision",
    "/experiments/other",
    "/experiments/vision?research=1",
    "/ai/mobilenetv4/onnx/model.onnx",
    "/ai/runtime/ort-wasm-simd-threaded.asyncify.wasm",
    "/experiments/ai/clip/onnx/model_quantized.onnx",
    "/experiments/ai/yolos/config.json",
  ]) {
    expect((await request.get(url)).status(), url).toBe(404);
  }
});
