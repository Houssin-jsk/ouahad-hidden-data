export const SAMPLE_BUDGET = 262_144;
export const TILE_SIZE = 512;
export interface SamplePlan {
  columns: number;
  rows: number;
  x: Uint32Array;
  y: Uint32Array;
  areas: Uint32Array;
  exact: boolean;
}

/** One seeded, uniformly chosen native pixel per disjoint rectangular cell.
 * Cell-area weights correct for unequal cell sizes; no interpolation occurs. */
export function planSamples(
  width: number,
  height: number,
  budget = SAMPLE_BUDGET,
): SamplePlan {
  if (
    ![width, height, budget].every((v) => Number.isSafeInteger(v) && v > 0) ||
    width * height > 40_000_000
  )
    throw new Error("Invalid sampling dimensions.");
  const exact = width * height <= budget;
  let columns = exact
    ? width
    : Math.min(
        width,
        Math.max(1, Math.floor(Math.sqrt((budget * width) / height))),
      );
  const rows = exact
    ? height
    : Math.min(height, Math.max(1, Math.floor(budget / columns)));
  if (!exact) columns = Math.min(width, Math.floor(budget / rows));
  const count = columns * rows;
  const x = new Uint32Array(count),
    y = new Uint32Array(count),
    areas = new Uint32Array(count);
  let seed = (0x48444441 ^ width ^ Math.imul(height, 31)) >>> 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let row = 0, index = 0; row < rows; row++) {
    const top = Math.floor((row * height) / rows),
      bottom = Math.floor(((row + 1) * height) / rows);
    for (let col = 0; col < columns; col++, index++) {
      const left = Math.floor((col * width) / columns),
        right = Math.floor(((col + 1) * width) / columns);
      x[index] = left + Math.floor(random() * (right - left));
      y[index] = top + Math.floor(random() * (bottom - top));
      areas[index] = (right - left) * (bottom - top);
    }
  }
  return { columns, rows, x, y, areas, exact };
}

/** Bounded tile readback. The full decoded bitmap remains browser-managed,
 * but neither a full-sized canvas nor a full-image RGBA buffer is allocated. */
export function sampleBitmap(bitmap: ImageBitmap) {
  const plan = planSamples(bitmap.width, bitmap.height);
  const pixels = new Uint8ClampedArray(plan.x.length * 4);
  const tilesAcross = Math.ceil(bitmap.width / TILE_SIZE);
  const groups = new Map<number, number[]>();
  for (let i = 0; i < plan.x.length; i++) {
    const tile =
      Math.floor(plan.y[i] / TILE_SIZE) * tilesAcross +
      Math.floor(plan.x[i] / TILE_SIZE);
    const group = groups.get(tile);
    if (group) group.push(i);
    else groups.set(tile, [i]);
  }
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
    colorSpace: "srgb",
  });
  if (!ctx)
    throw new Error("Native pixel sampling is unavailable in this browser.");
  ctx.imageSmoothingEnabled = false;
  try {
    for (const [tile, indices] of groups) {
      const left = (tile % tilesAcross) * TILE_SIZE,
        top = Math.floor(tile / tilesAcross) * TILE_SIZE;
      const width = Math.min(TILE_SIZE, bitmap.width - left),
        height = Math.min(TILE_SIZE, bitmap.height - top);
      ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.drawImage(bitmap, left, top, width, height, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      for (const i of indices) {
        const offset = ((plan.y[i] - top) * width + plan.x[i] - left) * 4;
        pixels.set(data.subarray(offset, offset + 4), i * 4);
      }
      data.fill(0);
    }
    return { plan, pixels };
  } catch (error) {
    pixels.fill(0);
    plan.areas.fill(0);
    throw error;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    groups.clear();
    plan.x.fill(0);
    plan.y.fill(0);
  }
}
