/** Plain finite numbers/strings only: safe for structured clone and JSON. */
export interface Quantity<Unit extends string> {
  value: number;
  unit: Unit;
}
export interface InsightBasis {
  id: "native-srgb-v1";
  representation: "browser-decoded-8bit-srgb";
  mode: "all-pixels" | "stratified";
  sourcePixels: number;
  sampledPixels: number;
  visibleSamples: number;
  weighting: "alpha-byte-times-source-cell-area";
  opacityCoverage: Quantity<"share">;
  opacityWeightedSourcePixels: Quantity<"pixel-equivalents">;
  approximate: boolean;
}
export interface InsightMethod {
  id: "weighted-luminance-cdf" | "weighted-hsv-saturation";
  version: "1.0.0";
  description: string;
}
export type InsightId = "tonal-distribution" | "color-distribution";
interface InsightCommon {
  id: InsightId;
  method: InsightMethod;
  basis: InsightBasis | null;
}
export interface UnavailableInsight extends InsightCommon {
  status: "unavailable";
  reason: {
    code:
      | "invalid-input"
      | "no-visible-pixels"
      | "inconsistent-statistics"
      | "calculation-failed";
    message: string;
  };
}
interface AvailableInsight<
  Id extends InsightId,
  Measurements,
> extends InsightCommon {
  id: Id;
  status: "available";
  basis: InsightBasis;
  measurements: Measurements;
  observation: string;
  interpretation: {
    ruleId: "largest-tonal-band-v1" | "saturation-band-comparison-v1";
    classification: "product-defined-description";
    text: string;
  };
  limitations: string[];
}
export type TonalInsight = AvailableInsight<
  "tonal-distribution",
  {
    p05: Quantity<"relative-luminance">;
    median: Quantity<"relative-luminance">;
    p95: Quantity<"relative-luminance">;
    percentileSpan: Quantity<"relative-luminance">;
    darkShare: Quantity<"share">;
    midtoneShare: Quantity<"share">;
    brightShare: Quantity<"share">;
  }
>;
export type ColorInsight = AvailableInsight<
  "color-distribution",
  {
    meanSaturation: Quantity<"hsv-saturation">;
    lowSaturationShare: Quantity<"share">;
    strongSaturationShare: Quantity<"share">;
    intermediateSaturationShare: Quantity<"share">;
  }
>;
export type EvidenceInsight = TonalInsight | ColorInsight | UnavailableInsight;
export interface ImageAnalytics {
  schemaVersion: "1.0.0";
  tonal: TonalInsight | UnavailableInsight;
  color: ColorInsight | UnavailableInsight;
}
