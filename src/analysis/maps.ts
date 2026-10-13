import { relativeLuminance } from "./pixels";
import type { SpatialMaps } from "./discovery-types";
export const MAP_LIMIT = 512;
export function generateMaps(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): SpatialMaps {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAP_LIMIT ||
    height > MAP_LIMIT ||
    pixels.length !== width * height * 4
  )
    throw new Error("Invalid map pixels.");
  const luminance = new Float64Array(width * height),
    gradient = new Float64Array(width * height);
  const light = new Uint8ClampedArray(pixels.length),
    detail = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < luminance.length; i++)
    luminance[i] = relativeLuminance(
      pixels[i * 4],
      pixels[i * 4 + 1],
      pixels[i * 4 + 2],
    );
  const at = (x: number, y: number) =>
    luminance[
      Math.max(0, Math.min(height - 1, y)) * width +
        Math.max(0, Math.min(width - 1, x))
    ];
  let maximumGradient = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      // Discard kernels touching fully transparent pixels: hidden RGB and alpha
      // silhouettes are not evidence of image detail. Partial alpha is explicit.
      let visible = true;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (
            !pixels[
              (Math.max(0, Math.min(height - 1, y + dy)) * width +
                Math.max(0, Math.min(width - 1, x + dx))) *
                4 +
                3
            ]
          )
            visible = false;
      if (visible) {
        const gx =
          at(x + 1, y - 1) -
          at(x - 1, y - 1) +
          2 * (at(x + 1, y) - at(x - 1, y)) +
          (at(x + 1, y + 1) - at(x - 1, y + 1));
        const gy =
          at(x - 1, y + 1) -
          at(x - 1, y - 1) +
          2 * (at(x, y + 1) - at(x, y - 1)) +
          (at(x + 1, y + 1) - at(x + 1, y - 1));
        gradient[index] = Math.hypot(gx, gy);
        maximumGradient = Math.max(maximumGradient, gradient[index]);
      }
    }
  for (let i = 0; i < luminance.length; i++) {
    const alpha = pixels[i * 4 + 3],
      l = Math.round(luminance[i] * 255),
      d = maximumGradient
        ? Math.round((gradient[i] / maximumGradient) * 255)
        : 0;
    light.set([l, l, l, alpha], i * 4);
    detail.set([d, d, d, alpha], i * 4);
  }
  luminance.fill(0);
  gradient.fill(0);
  return { width, height, light, detail, maximumGradient };
}
export function mapBitmap(bitmap: ImageBitmap): SpatialMaps {
  const scale = Math.min(1, MAP_LIMIT / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)),
    height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", {
    colorSpace: "srgb",
    willReadFrequently: true,
  });
  if (!context)
    throw new Error("Spatial maps are unavailable in this browser.");
  try {
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    try {
      return generateMaps(pixels, width, height);
    } finally {
      pixels.fill(0);
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
