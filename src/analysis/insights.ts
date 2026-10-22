import { relativeLuminance } from "./pixels";
import { SAMPLE_BUDGET } from "./sampling";
import { MAX_PIXELS } from "./files";
import { formatDecimal } from "../lib/format";
import type { PixelStatistics, AnalysisResult } from "./types";
import type {
  ImageAnalytics,
  InsightBasis,
  InsightMethod,
  UnavailableInsight,
} from "./insight-types";

export const INSIGHT_RULES = Object.freeze({
  darkBelow: 0.2,
  brightFrom: 0.7,
  lowSaturationThrough: 0.1,
  strongSaturationFrom: 0.6,
} as const);
const methods: [InsightMethod, InsightMethod] = [
  {
    id: "weighted-luminance-cdf",
    version: "1.0.0",
    description:
      "Linear sRGB relative luminance. P05, median and P95 are the smallest observed values whose cumulative alpha × cell-area weight reaches 5%, 50% and 95%. No histogram-bin estimate or interpolation. Tonal bands use <0.2, 0.2–<0.7 and ≥0.7.",
  },
  {
    id: "weighted-hsv-saturation",
    version: "1.0.0",
    description:
      "HSV saturation S = (max(R,G,B) − min(R,G,B)) / max(R,G,B) in encoded sRGB; S=0 at black. Mean and shares use alpha × source-cell-area weights. Product-defined bands: low S≤0.10, intermediate 0.10<S<0.60, strong S≥0.60.",
  },
];
export function unavailableAnalytics(
  code: UnavailableInsight["reason"]["code"],
  message: string,
): ImageAnalytics {
  const make = (
    id: UnavailableInsight["id"],
    method: InsightMethod,
  ): UnavailableInsight => ({
    id,
    status: "unavailable",
    method: { ...method },
    basis: null,
    reason: { code, message },
  });
  return {
    schemaVersion: "1.0.0",
    tonal: make("tonal-distribution", methods[0]),
    color: make("color-distribution", methods[1]),
  };
}
const percent = (value: number) => `${formatDecimal(value * 100, 1)}%`;
const quantity = <U extends string>(value: number, unit: U) => ({
  value,
  unit,
});

/** Exact inverse weighted empirical CDF. Caller owns/clears arrays.
 * Sorting an index vector preserves value/weight association without object rows. */
export function weightedQuantiles(
  values: Float64Array,
  weights: Float64Array,
  probabilities: readonly number[],
): number[] {
  if (
    !values.length ||
    values.length > SAMPLE_BUDGET ||
    weights.length !== values.length ||
    values.some((v) => !Number.isFinite(v)) ||
    weights.some((w) => !Number.isSafeInteger(w) || w <= 0) ||
    probabilities.some((p) => !Number.isFinite(p) || p < 0 || p > 1)
  )
    throw new Error("Invalid weighted quantile input.");
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!Number.isSafeInteger(total))
    throw new Error("Invalid quantile weight total.");
  if (values.every((v) => v === values[0]))
    return probabilities.map(() => values[0]);
  const order = new Uint32Array(values.length);
  for (let i = 0; i < order.length; i++) order[i] = i;
  try {
    order.sort((a, b) => values[a] - values[b] || a - b);
    // A single CDF scan for the small fixed probability set, including p=0/1.
    const requests = probabilities
      .map((p, index) => ({ p, index }))
      .sort((a, b) => a.p - b.p);
    const output = Array<number>(probabilities.length);
    let cumulative = 0,
      request = 0;
    for (const index of order) {
      cumulative += weights[index];
      while (
        request < requests.length &&
        cumulative >= requests[request].p * total
      ) {
        output[requests[request].index] = values[index];
        request++;
      }
    }
    return output;
  } finally {
    order.fill(0);
  }
}

/** Adds evidence using the SAME bounded native sample. No decode/canvas/network.
 * Existing statistics are consumed, not redefined. Invalid contracts fail closed. */
export function analyzeEvidence(
  pixels: Uint8ClampedArray,
  areas: Uint32Array | undefined,
  statistics: PixelStatistics | undefined,
  sampling: AnalysisResult["sampling"],
): ImageAnalytics {
  const invalid = (message: string) =>
    unavailableAnalytics("invalid-input", message);
  const count = pixels.length / 4;
  if (
    !pixels.length ||
    pixels.length % 4 ||
    count > SAMPLE_BUDGET ||
    (areas && (areas.length !== count || areas.some((v) => !v))) ||
    !sampling ||
    !["all-pixels", "stratified"].includes(sampling.mode) ||
    !Number.isSafeInteger(sampling.sourcePixels) ||
    sampling.sourcePixels < 1 ||
    sampling.sourcePixels > MAX_PIXELS
  )
    return invalid("The bounded RGBA sample or sampling basis is invalid.");
  const totalArea = areas?.reduce((s, a) => s + a, 0) ?? count;
  if (
    totalArea !== sampling.sourcePixels ||
    (sampling.mode === "all-pixels" &&
      (count !== sampling.sourcePixels ||
        (areas && areas.some((a) => a !== 1))))
  )
    return invalid(
      "Sample-cell areas do not agree with the declared source coverage.",
    );
  const values = new Float64Array(count),
    weights = new Float64Array(count);
  let visible = 0,
    weight = 0,
    saturationSum = 0,
    low = 0,
    strong = 0,
    darkWeight = 0,
    midtoneWeight = 0,
    brightWeight = 0;
  try {
    for (let i = 0; i < count; i++) {
      const w = pixels[i * 4 + 3] * (areas?.[i] ?? 1);
      if (!w) continue;
      const r = pixels[i * 4],
        g = pixels[i * 4 + 1],
        b = pixels[i * 4 + 2];
      const maximum = Math.max(r, g, b),
        minimum = Math.min(r, g, b);
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
      const luminance = relativeLuminance(r, g, b);
      values[visible] = luminance;
      if (luminance < INSIGHT_RULES.darkBelow) darkWeight += w;
      else if (luminance < INSIGHT_RULES.brightFrom) midtoneWeight += w;
      else brightWeight += w;
      weights[visible++] = w;
      weight += w;
      saturationSum += saturation * w;
      // Compare integer channel ratios, so exact threshold boundaries do not
      // move due to floating division (0.1 = 1/10; 0.6 = 3/5).
      if (maximum === 0 || (maximum - minimum) * 10 <= maximum) low += w;
      if (maximum > 0 && (maximum - minimum) * 5 >= maximum * 3) strong += w;
    }
    if (!weight)
      return unavailableAnalytics(
        "no-visible-pixels",
        sampling.mode === "stratified"
          ? "No visible pixels were found in the sample; sparse visible content may have been missed."
          : "There are no visible pixels to interpret.",
      );
    const coverage = weight / (255 * totalArea);
    const l = statistics?.luminance;
    const shares = l ? [l.shadows, l.midtones, l.highlights] : [];
    if (
      !statistics ||
      !l ||
      statistics.sampledPixels !== count ||
      statistics.visibleSamples !== visible ||
      !Number.isFinite(statistics.coverage) ||
      Math.abs(statistics.coverage - coverage) > 1e-10 ||
      shares.length !== 3 ||
      shares.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
      shares.some(
        (v, i) =>
          Math.abs(v - [darkWeight, midtoneWeight, brightWeight][i] / weight) >
          1e-10,
      ) ||
      Math.abs(shares.reduce((s, v) => s + v, 0) - 1) > 1e-10
    )
      return unavailableAnalytics(
        "inconsistent-statistics",
        "Compatible pixel statistics are unavailable or disagree with this sample.",
      );
    const basis: InsightBasis = {
      id: "native-srgb-v1",
      representation: "browser-decoded-8bit-srgb",
      mode: sampling.mode,
      sourcePixels: sampling.sourcePixels,
      sampledPixels: count,
      visibleSamples: visible,
      weighting: "alpha-byte-times-source-cell-area",
      opacityCoverage: quantity(coverage, "share"),
      opacityWeightedSourcePixels: quantity(weight / 255, "pixel-equivalents"),
      approximate: sampling.mode === "stratified",
    };
    const [p05, median, p95] = weightedQuantiles(
      values.subarray(0, visible),
      weights.subarray(0, visible),
      [0.05, 0.5, 0.95],
    );
    const leaders = ["dark", "midtone", "bright"].filter(
      (_, i) => Math.abs(shares[i] - Math.max(...shares)) <= 1e-12,
    );
    const leadingShare = Math.max(...shares);
    const lowShare = low / weight,
      strongShare = strong / weight,
      middleShare = (weight - low - strong) / weight;
    const commonLimits = [
      basis.approximate
        ? "Sample-based estimates: one seeded native pixel per cell, weighted by cell area. Rare colors, tails and sparse visible details may be missed. No confidence interval or representativeness guarantee is supplied."
        : "All decoded pixels were visited; fully transparent pixels contribute no weight and partial alpha contributes proportionally. This describes visible color values without a background composite.",
      "Browser decoding, color management and 8-bit low-alpha rounding affect the values. Animated images describe a decoded frame, not all frames.",
    ];
    return {
      schemaVersion: "1.0.0",
      tonal: {
        id: "tonal-distribution",
        status: "available",
        basis,
        method: { ...methods[0] },
        measurements: {
          p05: quantity(p05, "relative-luminance"),
          median: quantity(median, "relative-luminance"),
          p95: quantity(p95, "relative-luminance"),
          percentileSpan: quantity(p95 - p05, "relative-luminance"),
          darkShare: quantity(l.shadows, "share"),
          midtoneShare: quantity(l.midtones, "share"),
          brightShare: quantity(l.highlights, "share"),
        },
        observation: `The weighted median luminance is ${formatDecimal(median, 3)}. The 5th–95th percentile interval runs from ${formatDecimal(p05, 3)} to ${formatDecimal(p95, 3)}.`,
        interpretation: {
          ruleId: "largest-tonal-band-v1",
          classification: "product-defined-description",
          text:
            leaders.length === 1
              ? `The ${leaders[0]} band contains the largest measured share (${percent(leadingShare)}). The percentile interval describes how the measured light levels are distributed beyond their average.`
              : `The ${leaders.join(" and ")} bands share the lead (${percent(leadingShare)} each, within calculation precision). The mean alone does not show this split.`,
        },
        limitations: [
          "Dark/midtone/bright cutoffs are product-defined, not exposure standards. A dark or bright concentration does not prove incorrect exposure, clipped source detail or image quality. Percentiles do not establish a distribution's modality.",
          ...commonLimits,
        ],
      },
      color: {
        id: "color-distribution",
        status: "available",
        basis,
        method: { ...methods[1] },
        measurements: {
          meanSaturation: quantity(saturationSum / weight, "hsv-saturation"),
          lowSaturationShare: quantity(lowShare, "share"),
          strongSaturationShare: quantity(strongShare, "share"),
          intermediateSaturationShare: quantity(middleShare, "share"),
        },
        observation: `Mean HSV saturation is ${formatDecimal(saturationSum / weight, 3)}; ${percent(lowShare)} falls in the low-saturation band and ${percent(strongShare)} in the strong-saturation band.`,
        interpretation: {
          ruleId: "saturation-band-comparison-v1",
          classification: "product-defined-description",
          text:
            low > strong
              ? "Low-saturation pixels account for more weighted area than strongly saturated pixels. Low saturation means the RGB channels are relatively similar; it does not mean the image is dim."
              : strong > low
                ? "Strongly saturated pixels account for more weighted area than low-saturation pixels. Saturation measures channel separation relative to the highest channel, independently of palette-family count."
                : `Low and strong saturation bands have equal weighted shares; ${percent(middleShare)} lies between them. This distinguishes a split between the end bands from concentration in the intermediate band.`,
        },
        limitations: [
          "HSV saturation is an encoded-RGB coordinate, not perceptual colorfulness. Black is assigned S=0 by convention; a very dark red can still have S=1. The 0.10/0.60 bands are product-defined, not validated universal neutral/colorful thresholds. No mood, style or scene content follows from them.",
          ...commonLimits,
        ],
      },
    };
  } finally {
    values.fill(0);
    weights.fill(0);
  }
}
