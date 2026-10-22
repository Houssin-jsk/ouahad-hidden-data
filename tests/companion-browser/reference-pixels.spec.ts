import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { withExif, withPngSoftware } from "../fixtures/exif";

const address = "http://127.0.0.1:18431";
const result = {
  version: "1.1.0",
  model: "Qwen3-VL 2B Instruct Q4_K_M",
  elapsedSeconds: 1,
  limitations: "Model-generated observations can be wrong.",
  observations: {
    image_description: "The image contains geometric color areas.",
    main_visible_objects: [],
    scene_and_surroundings: null,
    notable_visual_details: [],
    uncertainties: [],
  },
};

test("explicit pixel transport preserves alpha on white, full wide WebP frame and EXIF orientation without metadata", async ({
  page,
}) => {
  test.setTimeout(120000);
  let sent = "";
  await page.route(`${address}/**`, async (route) => {
    if (route.request().url().endsWith("/analyze"))
      sent = JSON.parse(route.request().postData()!).image;
    await route.fulfill({
      json: route.request().url().endsWith("/pair")
        ? { token: "T".repeat(43), observationsEnabled: true }
        : result,
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3001" },
    });
  });
  await page.goto("/");
  const synthetic = await page.evaluate(() => {
    const alpha = document.createElement("canvas");
    alpha.width = 400;
    alpha.height = 200;
    const a = alpha.getContext("2d")!;
    a.fillStyle = "red";
    a.fillRect(0, 0, 40, 200);
    a.fillStyle = "blue";
    a.fillRect(360, 0, 40, 200);
    a.fillStyle = "rgba(0,0,0,0.5)";
    a.fillRect(180, 0, 40, 200);
    const wide = document.createElement("canvas");
    wide.width = 3200;
    wide.height = 400;
    const w = wide.getContext("2d")!;
    w.fillStyle = "white";
    w.fillRect(0, 0, 3200, 400);
    w.fillStyle = "red";
    w.fillRect(0, 0, 200, 400);
    w.fillStyle = "blue";
    w.fillRect(3000, 0, 200, 400);
    return {
      alpha: alpha.toDataURL("image/png").split(",")[1],
      wide: wide.toDataURL("image/webp", 0.95).split(",")[1],
    };
  });
  const cases = [
    {
      name: "alpha.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        withPngSoftware(Buffer.from(synthetic.alpha, "base64")),
      ),
      size: [400, 200],
      points: [
        [20, 100, 255, 0, 0],
        [380, 100, 0, 0, 255],
        [100, 100, 255, 255, 255],
        [200, 100, 127, 127, 127],
      ],
      tolerance: 1,
    },
    {
      name: "wide.webp",
      mimeType: "image/webp",
      buffer: Buffer.from(synthetic.wide, "base64"),
      size: [1536, 192],
      points: [
        [20, 90, 255, 0, 0],
        [1516, 90, 0, 0, 255],
        [768, 90, 255, 255, 255],
      ],
      tolerance: 4,
    },
    {
      name: "oriented.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(
        withExif(await readFile("tests/fixtures/phase01/quadrants.jpg"), 6),
      ),
      size: [24, 40],
      points: [
        [6, 10, 128, 128, 128],
        [18, 10, 0, 0, 0],
        [6, 30, 255, 0, 0],
        [18, 30, 255, 255, 255],
      ],
      tolerance: 15,
    },
  ];
  for (const source of cases) {
    await page.goto("/");
    sent = "";
    await page
      .getByLabel("Choose image")
      .setInputFiles({
        name: source.name,
        mimeType: source.mimeType,
        buffer: source.buffer,
      });
    await page
      .getByRole("button", { name: "Analyze image", exact: true })
      .click();
    await expect(page.getByTestId("image-dna")).toBeVisible({ timeout: 15000 });
    await page
      .getByText("Optional AI observations · local companion", { exact: true })
      .click();
    await page.getByLabel("Pairing code from the companion").fill("ABCDEF12");
    await page.getByRole("button", { name: "Connect companion" }).click();
    await page
      .getByRole("button", { name: "Analyze with companion", exact: true })
      .click();
    await expect
      .poll(() => sent.length, { message: source.name })
      .toBeGreaterThan(0);
    const png = Buffer.from(sent, "base64");
    expect([...png.subarray(0, 8)], source.name).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(png.includes(Buffer.from("Exif\0\0")), source.name).toBe(false);
    expect(png.includes(Buffer.from("GPS")), source.name).toBe(false);
    expect(png.includes(Buffer.from("OUAHAD Test Editor")), source.name).toBe(
      false,
    );
    expect(png.includes(Buffer.from("Synthetic Camera")), source.name).toBe(
      false,
    );
    const pixels = await page.evaluate(
      async ({ encoded, points }) => {
        const image = new Image();
        image.src = "data:image/png;base64," + encoded;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return {
          size: [canvas.width, canvas.height],
          samples: points.map(([x, y]) => [
            ...context.getImageData(x, y, 1, 1).data,
          ]),
        };
      },
      { encoded: sent, points: source.points },
    );
    expect(pixels.size, source.name).toEqual(source.size);
    source.points.forEach((point, i) => {
      const expected = [...point.slice(2), 255];
      pixels.samples[i].forEach((channel, c) => {
        expect(
          Math.abs(channel - expected[c]),
          `${source.name} sample ${i} channel ${c}`,
        ).toBeLessThanOrEqual(source.tolerance);
      });
    });
    await page.getByRole("button", { name: "Disconnect companion" }).click();
  }
});
