import type { AnalysisResult } from "../analysis/types";

export function paletteText(palette: readonly { hex: string }[], css = false) {
  return css
    ? `:root {\n${palette.map((color, index) => `  --image-color-${index + 1}: ${color.hex};`).join("\n")}\n}`
    : palette.map((color) => color.hex).join(", ");
}

// Describe existing measured bands; never infer exposure, subject or quality.
export function tonalSummary(
  light: Pick<
    AnalysisResult["luminance"],
    "shadows" | "midtones" | "highlights"
  >,
) {
  if (light.shadows > 0.5) return "Mostly darker tones";
  if (light.midtones > 0.5) return "Mostly middle tones";
  if (light.highlights > 0.5) return "Mostly lighter tones";
  return "A mix of tonal ranges";
}
