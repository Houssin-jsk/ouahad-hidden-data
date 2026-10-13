export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Decimal half-up display with a machine-scale allowance for arithmetic drift.
 * This changes rounding at binary midpoint noise only, not measurement precision. */
export function formatDecimal(value: number, places: number): string {
  const scale = 10 ** places,
    scaled = value * scale;
  const allowance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 8;
  return (Math.round(scaled + allowance) / scale).toFixed(places);
}
