import type { Detection } from "./types";
/** Full-frame fit. Never silently crop the detector's input or its overlays. */
export function fullFrameSize(width: number, height: number, limit = 1333) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw Error("Invalid image dimensions");
  const scale = Math.min(
    512 / Math.min(width, height),
    limit / Math.max(width, height),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
/** Model boxes normalized to the complete source image; reject malformed boxes. */
export function normalizeDetections(detections: Detection[]): Detection[] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return detections.flatMap((detection) => {
    const { xmin, ymin, xmax, ymax } = detection.box;
    if (
      ![xmin, ymin, xmax, ymax, detection.score].every(Number.isFinite) ||
      detection.score < 0 ||
      detection.score > 1
    )
      return [];
    const box = {
      xmin: clamp(xmin),
      ymin: clamp(ymin),
      xmax: clamp(xmax),
      ymax: clamp(ymax),
    };
    return box.xmax > box.xmin && box.ymax > box.ymin
      ? [{ ...detection, box }]
      : [];
  });
}
