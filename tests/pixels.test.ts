import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzePixels, relativeLuminance } from "../src/analysis/pixels";
import { validateFile, MAX_BYTES } from "../src/analysis/files";
import { readFile } from "node:fs/promises";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("solid red has exact RGB, palette, luminance, and one occupied bin", () => {
  const r = analyzePixels(
    new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]),
  );
  assert.deepEqual(r.average, [255, 0, 0]);
  assert.deepEqual(r.palette, [{ hex: "#FF0000", rgb: [255, 0, 0], share: 1 }]);
  close(r.luminance.mean, 0.2126);
  close(r.luminance.deviation, 0);
  assert.equal(r.luminance.histogram[6], 1);
  close(
    r.luminance.histogram.reduce((a, b) => a + b),
    1,
  );
});
test("equal black and white has exact mean, full range and RMS spread", () => {
  const r = analyzePixels(
    new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
  );
  assert.deepEqual(r.average, [128, 128, 128]);
  close(r.luminance.mean, 0.5);
  close(r.luminance.deviation, 0.5);
  close(r.luminance.min, 0);
  close(r.luminance.max, 1);
  assert.equal(r.luminance.histogram[0], 0.5);
  assert.equal(r.luminance.histogram[31], 0.5);
  assert.equal(r.luminance.shadows, 0.5);
  assert.equal(r.luminance.highlights, 0.5);
  assert.deepEqual(
    r.palette.map((p) => p.share),
    [0.5, 0.5],
  );
});
test("sRGB luminance is linearized rather than a byte average", () => {
  close(relativeLuminance(128, 128, 128), 0.21586050011389923);
});
test("alpha weighting ignores invisible RGB and handles partial transparency", () => {
  const r = analyzePixels(
    new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 128]),
  );
  assert.deepEqual(r.average, [170, 85, 0]);
  close(r.coverage, (1 + 128 / 255) / 3);
  close(
    r.palette.reduce((a, p) => a + p.share, 0),
    1,
  );
});
test("invalid buffers and transparent images fail clearly", () => {
  assert.throws(() => analyzePixels(new Uint8ClampedArray()), /Invalid/);
  assert.throws(() => analyzePixels(new Uint8ClampedArray(3)), /Invalid/);
  assert.throws(
    () => analyzePixels(new Uint8ClampedArray(8)),
    /fully transparent/,
  );
});
test("known 75/25 red-blue distribution is recovered deterministically", () => {
  const p = new Uint8ClampedArray([
    255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255,
  ]);
  const r = analyzePixels(p);
  assert.deepEqual(r.average, [191, 0, 64]);
  assert.equal(r.palette[0].hex, "#FF0000");
  close(r.palette[0].share, 0.75);
  assert.equal(r.palette[1].hex, "#0000FF");
  assert.deepEqual(analyzePixels(p), r);
});
test("file validation accepts real signatures, rejects oversized, empty and spoofed files", async () => {
  const png = await readFile(
    new URL("./fixtures/phase01/red.png", import.meta.url),
  );
  assert.equal(
    await validateFile(new File([png], "test.png", { type: "image/png" })),
    "PNG",
  );
  assert.equal(
    await validateFile(
      new File(
        [
          await readFile(
            new URL("./fixtures/phase01/quadrants.jpg", import.meta.url),
          ),
        ],
        "test.jpg",
        {
          type: "image/jpeg",
        },
      ),
    ),
    "JPEG",
  );
  assert.equal(
    await validateFile(
      new File(
        [
          await readFile(
            new URL("./fixtures/phase01/red.webp", import.meta.url),
          ),
        ],
        "test.webp",
        { type: "image/webp" },
      ),
    ),
    "WebP",
  );
  await assert.rejects(validateFile(new File([], "empty.png")), /empty/);
  await assert.rejects(
    validateFile(new File(["not an image"], "fake.png", { type: "image/png" })),
    /Unsupported/,
  );
  await assert.rejects(
    validateFile(new File([png], "fake.jpg", { type: "image/jpeg" })),
    /do not match/,
  );
  await assert.rejects(
    validateFile(
      new File([new Uint8Array(MAX_BYTES + 1)], "huge.png", {
        type: "image/png",
      }),
    ),
    /20 MiB/,
  );
});
