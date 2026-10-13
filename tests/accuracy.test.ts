import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzePixels } from "../src/analysis/pixels";
import { planSamples, SAMPLE_BUDGET } from "../src/analysis/sampling";
import { imageDNA } from "../src/analysis/dna";
import type { RGB } from "../src/analysis/types";
import { formatDecimal } from "../src/lib/format";
test("display rounding is stable at decimal midpoints without masking real differences", () => {
  assert.equal(formatDecimal(0.1775, 3), "0.178");
  assert.equal(formatDecimal(0.1775 - Number.EPSILON / 4, 3), "0.178");
  assert.equal(formatDecimal(0.1774999, 3), "0.177");
  assert.equal(formatDecimal(0.499999, 2), "0.50");
});
const near = (a: number, b: number, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(a - b) <= tolerance,
    `${a} differs from ${b} by ${Math.abs(a - b)}`,
  );
function image(
  width: number,
  height: number,
  pixel: (x: number, y: number) => number[],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return data;
}
function sampled(
  width: number,
  height: number,
  pixel: (x: number, y: number) => number[],
) {
  const plan = planSamples(width, height);
  const data = new Uint8ClampedArray(plan.x.length * 4);
  for (let i = 0; i < plan.x.length; i++)
    data.set(pixel(plan.x[i], plan.y[i]), i * 4);
  return { plan, result: analyzePixels(data, plan.areas) };
}
for (const [rgb, luminance] of [
  [[0, 0, 0], 0],
  [[255, 255, 255], 1],
  [[255, 0, 0], 0.2126],
  [[0, 255, 0], 0.7152],
  [[0, 0, 255], 0.0722],
  [[128, 128, 128], 0.21586050011389923],
] as [RGB, number][]) {
  test(`uniform ${rgb.join("/")} has exact means and zero variance over a large buffer`, () => {
    const r = analyzePixels(image(512, 512, () => [...rgb, 128]));
    assert.deepEqual(r.average, rgb);
    near(r.luminance.mean, luminance);
    assert.equal(r.luminance.deviation, 0);
    assert.equal(r.palette.length, 1);
    near(r.palette[0].share, 1);
    near(r.coverage, 128 / 255);
    assert.equal(r.visibleSamples, 262144);
  });
}
test("256-level grayscale ramp matches independent reference mean, spread and all 32 bin counts", () => {
  const r = analyzePixels(image(256, 1, (x) => [x, x, x, 255]));
  assert.deepEqual(r.average, [128, 128, 128]);
  near(r.luminance.mean, 0.3110134861116172);
  near(r.luminance.deviation, 0.293965191383006);
  const counts = [
    50, 21, 16, 13, 11, 9, 9, 8, 8, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 5, 4, 4,
    4, 4, 4, 4, 4, 3, 4, 4,
  ];
  assert.deepEqual(
    r.luminance.histogram,
    counts.map((v) => v / 256),
  );
  r.palette.forEach((p) => assert.equal(p.rgb[0], p.rgb[1]));
  r.palette.forEach((p) => assert.equal(p.rgb[1], p.rgb[2]));
  near(
    r.luminance.histogram.reduce((s, v) => s + v, 0),
    1,
  );
  near(r.luminance.shadows + r.luminance.midtones + r.luminance.highlights, 1);
});
test("alpha and unequal cell area use one consistent weighting for all metrics", () => {
  const r = analyzePixels(
    new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 85, 0, 255, 0, 0]),
    new Uint32Array([1, 3, 5]),
  );
  assert.deepEqual(r.average, [128, 0, 128]);
  near(r.coverage, 2 / 9);
  assert.equal(r.visibleSamples, 2);
  near(r.luminance.mean, 0.1424);
  near(r.luminance.deviation, 0.0702);
  near(r.luminance.histogram[2], 0.5);
  near(r.luminance.histogram[6], 0.5);
  r.palette.forEach((p) => near(p.share, 0.5));
  near(r.luminance.shadows, 0.5);
  near(r.luminance.midtones, 0.5);
  assert.throws(
    () =>
      analyzePixels(new Uint8ClampedArray([1, 2, 3, 4]), new Uint32Array([0])),
    /weights/,
  );
  assert.throws(
    () =>
      analyzePixels(new Uint8ClampedArray([1, 2, 3, 4]), new Uint32Array(2)),
    /weights/,
  );
});
test("integer alpha avoids accumulated half-channel rounding errors", () => {
  const r = analyzePixels(
    image(512, 512, (x) => (x % 2 ? [255, 255, 255, 128] : [0, 0, 0, 128])),
  );
  assert.deepEqual(r.average, [128, 128, 128]);
  near(r.luminance.mean, 0.5);
  near(r.luminance.deviation, 0.5);
});
test("palette is repeatable and independent of pixel traversal order, including ties", () => {
  const data = image(180, 1, (x) => [
    x % 3 === 0 ? 255 : 0,
    x % 3 === 1 ? 255 : 0,
    x % 3 === 2 ? 255 : 0,
    255,
  ]);
  const reverse = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4)
    reverse.set(data.subarray(i, i + 4), data.length - i - 4);
  assert.deepEqual(analyzePixels(data).palette, analyzePixels(reverse).palette);
  assert.deepEqual(analyzePixels(data), analyzePixels(data));
});
test("sampling cells exhaust the source area, are bounded, and are repeatable", () => {
  for (const [width, height] of [
    [17, 19],
    [1001, 997],
    [4000, 3000],
    [1, 40000000],
    [40000000, 1],
  ]) {
    const p = planSamples(width, height);
    assert.ok(p.x.length <= SAMPLE_BUDGET);
    assert.deepEqual(p, planSamples(width, height));
    assert.equal(
      p.areas.reduce((s, v) => s + v, 0),
      width * height,
    );
    for (let i = 0; i < p.x.length; i++) {
      assert.ok(p.x[i] < width);
      assert.ok(p.y[i] < height);
      assert.ok(p.areas[i] > 0);
    }
  }
  assert.throws(() => planSamples(0, 10), /dimensions/);
  assert.throws(() => planSamples(40000001, 1), /dimensions/);
});
test("small non-square images analyze every original pixel", () => {
  const p = planSamples(600, 400);
  assert.equal(p.exact, true);
  assert.equal(p.x.length, 240000);
  assert.ok(p.areas.every((v) => v === 1));
  for (let i = 0; i < p.x.length; i++) {
    assert.equal(p.x[i], i % 600);
    assert.equal(p.y[i], Math.floor(i / 600));
  }
});
test("one-pixel checkerboard remains black/white with correct light statistics after sampling", () => {
  const { result: r } = sampled(2048, 2048, (x, y) => {
    const v = ((x + y) % 2) * 255;
    return [v, v, v, 255];
  });
  near(r.luminance.mean, 0.5, 0.004);
  near(r.luminance.deviation, 0.5, 0.0001);
  r.average.forEach((v) => assert.ok(Math.abs(v - 127.5) < 1));
  assert.deepEqual(r.palette.map((p) => p.hex).sort(), ["#000000", "#FFFFFF"]);
  near(r.luminance.histogram[0], 0.5, 0.004);
  near(r.luminance.histogram[31], 0.5, 0.004);
  assert.equal(r.luminance.histogram.filter((v) => v > 0).length, 2);
});
test("unequal boundaries recover 75/25 color shares without resampling colors", () => {
  const { result: r } = sampled(2003, 1501, (x) =>
    x < 1502 ? [255, 0, 0, 255] : [0, 0, 255, 255],
  );
  const red = r.palette.find((p) => p.hex === "#FF0000")!;
  near(red.share, 1502 / 2003, 0.002);
  assert.equal(r.palette.length, 2);
  assert.ok(Math.abs(r.average[0] - 191) < 2);
  assert.ok(Math.abs(r.average[2] - 64) < 2);
});
test("sampled grayscale gradient remains close to the complete ramp reference", () => {
  const { result: r } = sampled(4096, 1024, (x) => {
    const v = Math.floor(x / 16);
    return [v, v, v, 255];
  });
  near(r.luminance.mean, 0.3110134861116172, 0.001);
  near(r.luminance.deviation, 0.293965191383006, 0.001);
  r.average.forEach((v) => assert.ok(Math.abs(v - 127.5) < 1));
});
test("transparent hidden RGB does not contaminate sampled visible colors", () => {
  const { result: r } = sampled(1024, 1024, (x, y) =>
    (x + y) % 2 ? [255, 0, 0, 255] : [0, 255, 255, 0],
  );
  assert.deepEqual(r.average, [255, 0, 0]);
  assert.equal(r.palette.length, 1);
  near(r.luminance.mean, 0.2126);
  near(r.coverage, 0.5, 0.004);
});
test("Image DNA uses measured values and identifies the sampling basis", () => {
  const r = {
    ...analyzePixels(new Uint8ClampedArray([255, 0, 0, 255])),
    sampleWidth: 1,
    sampleHeight: 1,
    sampling: { mode: "all-pixels" as const, sourcePixels: 1 },
  };
  const s = {
    url: "blob:test",
    name: "red.png",
    width: 1,
    height: 1,
    size: 4,
    format: "PNG",
  };
  const summary = imageDNA(r, s);
  assert.match(summary, /All decoded pixels/);
  assert.match(summary, /255 \/ 0 \/ 0/);
  assert.match(summary, /#FF0000, about 100%/);
  assert.match(summary, /luminance 0.21/);
  assert.match(summary, /standard deviation 0.00/);
  assert.match(
    imageDNA(
      { ...r, sampling: { mode: "stratified", sourcePixels: 1000000 } },
      s,
    ),
    /native-pixel sample/,
  );
});
