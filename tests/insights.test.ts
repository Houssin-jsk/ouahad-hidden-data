import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analyzePixels } from "../src/analysis/pixels";
import {
  analyzeEvidence,
  weightedQuantiles,
  unavailableAnalytics,
  INSIGHT_RULES,
} from "../src/analysis/insights";
import { planSamples, SAMPLE_BUDGET } from "../src/analysis/sampling";
import { EvidenceInsight } from "../src/components/evidence-insight";
import type { ColorInsight, TonalInsight } from "../src/analysis/insight-types";
import type { AnalysisResult } from "../src/analysis/types";
const near = (actual: number, expected: number, tolerance = 1e-12) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
function run(
  data: number[],
  areas?: number[],
  sampling?: AnalysisResult["sampling"],
) {
  const pixels = new Uint8ClampedArray(data),
    weights = areas ? new Uint32Array(areas) : undefined;
  const statistics = analyzePixels(pixels, weights);
  const result = analyzeEvidence(
    pixels,
    weights,
    statistics,
    sampling ?? { mode: "all-pixels", sourcePixels: pixels.length / 4 },
  );
  assert.equal(result.tonal.status, "available");
  assert.equal(result.color.status, "available");
  return {
    report: result,
    tonal: result.tonal as TonalInsight,
    color: result.color as ColorInsight,
    pixels,
    weights,
    statistics,
  };
}
// Independent reference values: primary luminance coefficients; grayscale
// transfer constants calculated before assertions (see Phase 02 design).
for (const [name, rgb, luminance, saturation] of [
  ["black", [0, 0, 0], 0, 0],
  ["white", [255, 255, 255], 1, 0],
  ["middle gray", [128, 128, 128], 0.21586050011389926, 0],
  ["red", [255, 0, 0], 0.2126, 1],
  ["green", [0, 255, 0], 0.7152, 1],
  ["blue", [0, 0, 255], 0.0722, 1],
] as const) {
  test(`uniform ${name}: exact quantiles, saturation, units and zero percentile span`, () => {
    const { tonal, color } = run([...rgb, 255, ...rgb, 128]);
    for (const key of ["p05", "median", "p95"] as const) {
      near(tonal.measurements[key].value, luminance);
      assert.equal(tonal.measurements[key].unit, "relative-luminance");
    }
    near(tonal.measurements.percentileSpan.value, 0);
    near(color.measurements.meanSaturation.value, saturation);
    near(color.measurements.lowSaturationShare.value, 1 - saturation);
    near(color.measurements.strongSaturationShare.value, saturation);
    assert.equal(color.measurements.meanSaturation.unit, "hsv-saturation");
    assert.equal(
      color.interpretation.classification,
      "product-defined-description",
    );
    assert.ok(
      tonal.observation.includes(
        luminance === 1
          ? "1.000"
          : luminance === 0
            ? "0.000"
            : luminance.toFixed(3),
      ),
    );
    assert.equal(tonal.basis.approximate, false);
    near(tonal.basis.opacityCoverage.value, (255 + 128) / 510);
  });
}
test("weighted empirical quantiles use inverse CDF, exact endpoints, ties and no interpolation", () => {
  const values = new Float64Array([1, 0.2, 0, 0.8]),
    weights = new Float64Array([6, 2, 1, 1]);
  assert.deepEqual(
    weightedQuantiles(values, weights, [0, 0.05, 0.1, 0.3, 0.4, 0.5, 0.95, 1]),
    [0, 0, 0, 0.2, 0.8, 1, 1, 1],
  );
  assert.deepEqual(
    weightedQuantiles(
      new Float64Array([0, 1]),
      new Float64Array([1, 1]),
      [0.5],
    ),
    [0],
  );
  assert.deepEqual(
    weightedQuantiles(
      new Float64Array([0.4, 0.4, 0.8]),
      new Float64Array([1, 2, 1]),
      [0.5, 0.75, 1],
    ),
    [0.4, 0.4, 0.8],
  );
  assert.deepEqual([...values], [1, 0.2, 0, 0.8]);
  assert.deepEqual([...weights], [6, 2, 1, 1]);
});
test("quantiles reject nonfinite values, invalid probabilities/weights, mismatches and excessive allocation", () => {
  const v = new Float64Array([0, 1]);
  for (const [values, weights, p] of [
    [new Float64Array(), new Float64Array(), [0.5]],
    [v, new Float64Array([1]), [0.5]],
    [new Float64Array([NaN, 1]), v, [0.5]],
    [v, new Float64Array([1, Infinity]), [0.5]],
    [v, new Float64Array([1, 0]), [0.5]],
    [v, new Float64Array([1, 1]), [-1]],
    [v, new Float64Array([1, 1]), [NaN]],
    [v, new Float64Array([1, 1]), [1.01]],
    [
      new Float64Array(SAMPLE_BUDGET + 1),
      new Float64Array(SAMPLE_BUDGET + 1),
      [0.5],
    ],
  ] as const)
    assert.throws(() => weightedQuantiles(values, weights, p), /Invalid/);
});
test("256-level grayscale ramp quantiles are actual observed levels 12, 127 and 243", () => {
  const data = Array.from({ length: 256 }, (_, i) => [i, i, i, 255]).flat();
  const { tonal, color } = run(data);
  near(tonal.measurements.p05.value, 0.003676507324047436);
  near(tonal.measurements.median.value, 0.21223075741405523);
  near(tonal.measurements.p95.value, 0.8962693533742664);
  near(color.measurements.meanSaturation.value, 0);
  near(color.measurements.lowSaturationShare.value, 1);
  assert.match(
    color.interpretation.text,
    /Low-saturation pixels account for more/,
  );
});
test("mixed black/white and low-contrast levels preserve discrete median and non-authoritative meaning", () => {
  const split = run([0, 0, 0, 255, 255, 255, 255, 255]);
  assert.equal(split.tonal.measurements.median.value, 0);
  assert.equal(split.tonal.measurements.p95.value, 1);
  assert.match(
    split.tonal.interpretation.text,
    /dark and bright bands share the lead \(50.0% each/,
  );
  assert.match(split.tonal.limitations[0], /does not prove incorrect exposure/);
  const low = run([127, 127, 127, 255, 129, 129, 129, 255]);
  near(low.tonal.measurements.median.value, 0.21223075741405523);
  assert.ok(
    low.tonal.measurements.percentileSpan.value > 0 &&
      low.tonal.measurements.percentileSpan.value < 0.01,
  );
  assert.match(low.tonal.interpretation.text, /midtone band.*100.0%/);
});
test("opacity × unequal cell area controls quantiles, saturation and source pixel-equivalents consistently", () => {
  // Red weight=255*1, gray=85*3, hidden blue=0*5. Equal visible weights,
  // total source area=9; effective opacity area=510/255=2 pixel-equivalents.
  const { tonal, color } = run(
    [255, 0, 0, 255, 128, 128, 128, 85, 0, 0, 255, 0],
    [1, 3, 5],
    { mode: "stratified", sourcePixels: 9 },
  );
  near(tonal.measurements.median.value, 0.2126);
  near(tonal.measurements.p95.value, 0.21586050011389926);
  near(color.measurements.meanSaturation.value, 0.5);
  near(color.measurements.lowSaturationShare.value, 0.5);
  near(color.measurements.strongSaturationShare.value, 0.5);
  near(tonal.basis.opacityCoverage.value, 2 / 9);
  near(tonal.basis.opacityWeightedSourcePixels.value, 2);
  assert.equal(
    tonal.basis.opacityWeightedSourcePixels.unit,
    "pixel-equivalents",
  );
  assert.equal(tonal.basis.visibleSamples, 2);
  assert.equal(tonal.basis.approximate, true);
  assert.match(tonal.limitations.join(" "), /Rare colors, tails/);
});
test("HSV band boundaries include exactly .10 and .60; intermediate values stay separate", () => {
  assert.equal(INSIGHT_RULES.lowSaturationThrough, 0.1);
  assert.equal(INSIGHT_RULES.strongSaturationFrom, 0.6);
  const { color } = run([
    100, 90, 90, 255, 100, 89, 90, 255, 100, 40, 40, 255, 100, 41, 41, 255,
  ]);
  near(color.measurements.meanSaturation.value, 0.35);
  near(color.measurements.lowSaturationShare.value, 0.25);
  near(color.measurements.strongSaturationShare.value, 0.25);
  near(color.measurements.intermediateSaturationShare.value, 0.5);
  assert.match(color.observation, /0.350; 25.0%.*25.0%/);
  assert.match(color.interpretation.text, /50.0% lies between/);
});
test("nearest encoded gray levels on each side of tonal thresholds keep existing band semantics", () => {
  // Independent transfer values: L123=.19806931955994886,
  // L124=.20155625379439707, L217=.6938717612919899, L218=.7011018919329731.
  const { tonal } = run([
    123, 123, 123, 255, 124, 124, 124, 255, 217, 217, 217, 255, 218, 218, 218,
    255,
  ]);
  near(tonal.measurements.darkShare.value, 0.25);
  near(tonal.measurements.midtoneShare.value, 0.5);
  near(tonal.measurements.brightShare.value, 0.25);
});
test("counterexamples: dark red is maximally HSV-saturated and all-intermediate is not an end-band split", () => {
  const red = run([1, 0, 0, 255]);
  near(red.color.measurements.meanSaturation.value, 1);
  near(red.tonal.measurements.darkShare.value, 1);
  assert.match(red.color.limitations[0], /very dark red can still have S=1/);
  const middle = run([100, 70, 70, 255]);
  near(middle.color.measurements.intermediateSaturationShare.value, 1);
  assert.match(middle.color.interpretation.text, /100.0% lies between/);
});
test("sampled 12MP uniform source uses bounded native sample and matches full-image quantities", () => {
  const plan = planSamples(4000, 3000);
  const pixels = new Uint8ClampedArray(plan.x.length * 4);
  for (let i = 0; i < plan.x.length; i++)
    pixels.set([128, 128, 128, 255], i * 4);
  const report = analyzeEvidence(
    pixels,
    plan.areas,
    analyzePixels(pixels, plan.areas),
    { mode: "stratified", sourcePixels: 12000000 },
  );
  assert.equal(report.tonal.status, "available");
  assert.equal(report.color.status, "available");
  if (
    report.tonal.status !== "available" ||
    report.color.status !== "available"
  )
    return;
  near(report.tonal.measurements.median.value, 0.21586050011389926);
  near(report.color.measurements.lowSaturationShare.value, 1);
  assert.ok(report.tonal.basis.sampledPixels <= SAMPLE_BUDGET);
  near(report.tonal.basis.opacityWeightedSourcePixels.value, 12000000);
});
test("empty, malformed, transparent and inconsistent samples produce explicit unavailable reasons, never NaN", () => {
  const opaque = new Uint8ClampedArray([0, 0, 0, 255]),
    sampling = { mode: "all-pixels" as const, sourcePixels: 1 };
  const stats = analyzePixels(opaque);
  const cases = [
    analyzeEvidence(new Uint8ClampedArray(), undefined, undefined, sampling),
    analyzeEvidence(new Uint8ClampedArray(3), undefined, undefined, sampling),
    analyzeEvidence(opaque, new Uint32Array([0]), stats, sampling),
    analyzeEvidence(opaque, new Uint32Array([2]), stats, sampling),
    analyzeEvidence(opaque, undefined, stats, {
      ...sampling,
      sourcePixels: 40000001,
    }),
    analyzeEvidence(opaque, undefined, undefined, sampling),
    analyzeEvidence(opaque, undefined, { ...stats, coverage: NaN }, sampling),
    analyzeEvidence(
      opaque,
      undefined,
      {
        ...stats,
        luminance: { ...stats.luminance, shadows: 0, highlights: 1 },
      },
      sampling,
    ),
    analyzeEvidence(new Uint8ClampedArray(4), undefined, undefined, sampling),
    analyzeEvidence(
      new Uint8ClampedArray(4),
      new Uint32Array([100]),
      undefined,
      { mode: "stratified", sourcePixels: 100 },
    ),
  ];
  for (const report of cases) {
    assert.equal(report.tonal.status, "unavailable");
    assert.equal(report.color.status, "unavailable");
    const encoded = JSON.stringify(report);
    assert.ok(!/NaN|Infinity/.test(encoded));
    assert.deepEqual(JSON.parse(encoded), structuredClone(report));
  }
  assert.equal(
    cases[8].tonal.status === "unavailable" && cases[8].tonal.reason.code,
    "no-visible-pixels",
  );
  assert.match(
    cases[9].tonal.status === "unavailable"
      ? cases[9].tonal.reason.message
      : "",
    /sample.*sparse/,
  );
});
test("outputs are deterministic, JSON-safe, do not mutate inputs or share mutable method state across runs", () => {
  const { report, pixels, weights, statistics } = run([
    0, 0, 0, 255, 255, 0, 0, 128,
  ]);
  const original = [...pixels],
    source = { mode: "all-pixels" as const, sourcePixels: 2 };
  assert.deepEqual(
    report,
    analyzeEvidence(pixels, weights, statistics, source),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(report)), structuredClone(report));
  report.tonal.method.description = "consumer edit";
  assert.notEqual(
    analyzeEvidence(pixels, weights, statistics, source).tonal.method
      .description,
    "consumer edit",
  );
  assert.deepEqual([...pixels], original);
});
test("legacy missing results and explicit unavailable insights render honestly without invented measurements", () => {
  const legacy = renderToStaticMarkup(
    createElement(EvidenceInsight, { kind: "tonal" }),
  );
  assert.match(legacy, /not produced.*Original measurements remain available/);
  const missing = unavailableAnalytics(
    "calculation-failed",
    "Insights unavailable for this input.",
  );
  const html = renderToStaticMarkup(
    createElement(EvidenceInsight, { kind: "color", insight: missing.color }),
  );
  assert.match(html, /Insights unavailable/);
  assert.ok(!html.includes("Mean HSV saturation"));
});
