import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMaps } from "../src/analysis/maps";
import { inspectMetadata } from "../src/analysis/metadata";
import { exifFixture } from "./fixtures/exif";
function pixels(
  width: number,
  height: number,
  fn: (x: number, y: number) => number[],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set(fn(x, y), (y * width + x) * 4);
  return data;
}
test("metadata parser reads synthetic camera, exposure, orientation and private location", async () => {
  const result = await inspectMetadata(exifFixture());
  assert.equal(result.status, "available");
  assert.ok(
    result.fields.some(
      (f) => f.label === "Camera manufacturer" && f.value === "OUAHAD TEST",
    ),
  );
  assert.ok(result.fields.some((f) => f.label === "ISO" && f.value === "200"));
  assert.ok(
    result.fields.some(
      (f) => f.label === "Exposure time" && f.value.includes("125"),
    ),
  );
  assert.ok(
    result.fields.some(
      (f) => f.label === "Orientation" && f.value.includes("90"),
    ),
  );
  assert.deepEqual(result.location, { latitude: 12.5, longitude: -30.25 });
  assert.equal(result.hasLocation, true);
  assert.ok(!result.fields.some((f) => /Latitude|Longitude|GPS/.test(f.label)));
});
test("missing metadata differs from parser errors", async () => {
  const tiff = new ArrayBuffer(14),
    v = new DataView(tiff);
  v.setUint16(0, 0x4949);
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  assert.equal((await inspectMetadata(tiff)).status, "missing");
  assert.equal((await inspectMetadata(new ArrayBuffer(3))).status, "error");
});
test("uniform image has zero Sobel detail and exact fixed-scale light map", () => {
  const m = generateMaps(
    pixels(5, 3, () => [128, 128, 128, 255]),
    5,
    3,
  );
  assert.equal(m.maximumGradient, 0);
  for (let i = 0; i < m.detail.length; i += 4) {
    assert.equal(m.detail[i], 0);
    assert.equal(m.light[i], 55);
    assert.equal(m.light[i + 3], 255);
  }
});
test("every uniform gray and primary color has exactly zero detail, including floating-point cancellation cases", () => {
  for (let value = 0; value < 256; value++) {
    const m = generateMaps(
      pixels(3, 3, () => [value, value, value, 255]),
      3,
      3,
    );
    assert.equal(m.maximumGradient, 0);
  }
  for (const rgb of [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ])
    assert.equal(
      generateMaps(
        pixels(3, 3, () => [...rgb, 255]),
        3,
        3,
      ).maximumGradient,
      0,
    );
});
test("vertical black/white step has Sobel magnitude four at the edge and none away", () => {
  const m = generateMaps(
    pixels(7, 5, (x) => (x < 3 ? [0, 0, 0, 255] : [255, 255, 255, 255])),
    7,
    5,
  );
  assert.equal(m.maximumGradient, 4);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 7; x++)
      assert.equal(m.detail[(y * 7 + x) * 4], x === 2 || x === 3 ? 255 : 0);
});
test("light map preserves alpha and transparent hidden RGB cannot create edges", () => {
  const m = generateMaps(
    pixels(5, 5, (x, y) =>
      x === 2 && y === 2 ? [255, 0, 0, 0] : [128, 128, 128, 128],
    ),
    5,
    5,
  );
  assert.equal(m.maximumGradient, 0);
  assert.equal(m.light[(2 * 5 + 2) * 4 + 3], 0);
  assert.equal(m.light[3], 128);
});
test("horizontal light ramp uses documented Sobel gradient and clamped boundaries", () => {
  const m = generateMaps(
    pixels(3, 3, (x) =>
      x === 0
        ? [0, 0, 0, 255]
        : x === 1
          ? [128, 128, 128, 255]
          : [255, 255, 255, 255],
    ),
    3,
    3,
  );
  assert.equal(m.maximumGradient, 4);
  assert.equal(m.detail[(1 * 3 + 1) * 4], 255);
  assert.ok(m.detail[(1 * 3 + 0) * 4] < m.detail[(1 * 3 + 2) * 4]);
  assert.equal(m.light[0], 0);
  assert.equal(m.light[8], 255);
});
test("bounded map dimensions and malformed buffers are rejected", () => {
  assert.throws(
    () => generateMaps(new Uint8ClampedArray(4), 513, 1),
    /Invalid/,
  );
  assert.throws(() => generateMaps(new Uint8ClampedArray(3), 1, 1), /Invalid/);
  const m = generateMaps(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
  assert.equal(m.light[0], 255);
  assert.equal(m.detail[0], 0);
});
