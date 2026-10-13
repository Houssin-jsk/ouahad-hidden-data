import type { AnalysisResult, ImageSource } from "./types";
import { hex } from "./pixels";
import { formatDecimal } from "../lib/format";
export function imageDNA(result: AnalysisResult, source: ImageSource): string {
  const largest = result.palette[0];
  const basis =
    result.sampling.mode === "all-pixels"
      ? "All decoded pixels"
      : "A native-pixel sample";
  return (
    `${source.width.toLocaleString()} × ${source.height.toLocaleString()} ${source.format}. ` +
    `${basis}: average RGB ${result.average.join(" / ")} (${hex(result.average)}); ` +
    `largest RGB color family ${largest.hex}, about ${Math.round(largest.share * 100)}%. ` +
    `Mean relative luminance ${formatDecimal(result.luminance.mean, 2)}, with tonal standard deviation ${formatDecimal(result.luminance.deviation, 2)}. ` +
    `Opacity-weighted coverage about ${Math.round(result.coverage * 100)}%.`
  );
}
