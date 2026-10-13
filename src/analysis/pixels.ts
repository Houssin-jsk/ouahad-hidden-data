import type { PixelStatistics, RGB } from "./types";
export const hex = (rgb: RGB) =>
  "#" +
  rgb
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
const linear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
export const relativeLuminance = (r: number, g: number, b: number) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const distance = (a: RGB, b: RGB) =>
  a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);

/** Pure analysis module. Alpha weights exclude invisible pixels and reduce edge bias. */
export function analyzePixels(
  pixels: Uint8ClampedArray,
  areas?: Uint32Array,
): PixelStatistics {
  if (!pixels.length || pixels.length % 4)
    throw new Error("Invalid pixel buffer.");
  if (areas && (areas.length !== pixels.length / 4 || areas.some((v) => !v)))
    throw new Error("Invalid sample-area weights.");
  const buckets = new Map<number, { sum: RGB; weight: number }>();
  const sum: RGB = [0, 0, 0];
  const histogram = Array<number>(32).fill(0);
  let weight = 0,
    totalArea = 0,
    visibleSamples = 0,
    mean = 0,
    m2 = 0,
    min = 1,
    max = 0,
    shadows = 0,
    midtones = 0,
    highlights = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const area = areas?.[i / 4] ?? 1;
    totalArea += area;
    // Keep alpha in integer byte units: sums stay exact within image limits.
    const w = pixels[i + 3] * area;
    if (!w) continue;
    visibleSamples++;
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    const l = relativeLuminance(r, g, b);
    const nextWeight = weight + w;
    // Weighted Welford variance avoids cancellation near uniformity.
    const delta = l - mean;
    mean += delta * (w / nextWeight);
    m2 += w * delta * (l - mean);
    weight = nextWeight;
    sum[0] += r * w;
    sum[1] += g * w;
    sum[2] += b * w;
    min = Math.min(min, l);
    max = Math.max(max, l);
    histogram[Math.min(31, Math.floor(l * 32))] += w;
    if (l < 0.2) shadows += w;
    else if (l < 0.7) midtones += w;
    else highlights += w;
    const key = (r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3);
    const bucket = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, weight: 0 };
    bucket.sum[0] += r * w;
    bucket.sum[1] += g * w;
    bucket.sum[2] += b * w;
    bucket.weight += w;
    buckets.set(key, bucket);
  }
  if (!weight)
    throw new Error(
      "This image is fully transparent. There are no visible pixels to analyze.",
    );
  const points = [...buckets.entries()]
    .sort(([keyA, a], [keyB, b]) => b.weight - a.weight || keyA - keyB)
    .map(([, p]) => ({
      rgb: p.sum.map((v) => v / p.weight) as RGB,
      sum: p.sum,
      weight: p.weight,
    }));
  const centers: RGB[] = [points[0].rgb];
  while (centers.length < Math.min(6, points.length)) {
    const farthest = points.reduce(
      (best, p) => {
        const score =
          Math.min(...centers.map((c) => distance(c, p.rgb))) *
          Math.sqrt(p.weight);
        return score > best.score ? { score, rgb: p.rgb } : best;
      },
      { score: 0, rgb: points[0].rgb },
    );
    if (farthest.score < 1) break;
    centers.push(farthest.rgb);
  }
  let clusters: { sum: RGB; weight: number }[] = [];
  for (let iteration = 0; iteration < 24; iteration++) {
    clusters = centers.map(() => ({ sum: [0, 0, 0], weight: 0 }));
    for (const p of points) {
      let nearest = 0;
      for (let j = 1; j < centers.length; j++)
        if (distance(p.rgb, centers[j]) < distance(p.rgb, centers[nearest]))
          nearest = j;
      const c = clusters[nearest];
      c.weight += p.weight;
      for (let k = 0; k < 3; k++) c.sum[k] += p.sum[k];
    }
    let movement = 0;
    clusters.forEach((c, j) => {
      if (c.weight) {
        const next = c.sum.map((v) => v / c.weight) as RGB;
        movement = Math.max(movement, distance(centers[j], next));
        centers[j] = next;
      }
    });
    if (movement < 1e-10) break;
  }
  const palette = new Map<string, { rgb: RGB; hex: string; share: number }>();
  for (const c of clusters) {
    if (!c.weight) continue;
    const rgb = c.sum.map((v) => Math.round(v / c.weight)) as RGB;
    const code = hex(rgb),
      previous = palette.get(code);
    palette.set(code, {
      rgb,
      hex: code,
      share: (previous?.share ?? 0) + c.weight / weight,
    });
  }
  return {
    average: sum.map((v) => Math.round(v / weight)) as RGB,
    palette: [...palette.values()].sort(
      (a, b) => b.share - a.share || a.hex.localeCompare(b.hex),
    ),
    luminance: {
      mean,
      min,
      max,
      deviation: Math.sqrt(Math.max(0, m2 / weight)),
      histogram: histogram.map((v) => v / weight),
      shadows: shadows / weight,
      midtones: midtones / weight,
      highlights: highlights / weight,
    },
    sampledPixels: pixels.length / 4,
    visibleSamples,
    coverage: weight / (totalArea * 255),
  };
}
