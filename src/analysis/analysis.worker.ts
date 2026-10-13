import { analyzePixels } from "./pixels";
import { sampleBitmap } from "./sampling";
import type { AnalysisResult } from "./types";
import { inspectMetadata } from "./metadata";
import { mapBitmap } from "./maps";
async function encodeMap(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot prepare maps.");
  try {
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), width, height),
      0,
      0,
    );
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
self.onmessage = async (
  event: MessageEvent<{ bitmap: ImageBitmap; file: File }>,
) => {
  const { bitmap, file } = event.data;
  let sample: ReturnType<typeof sampleBitmap> | undefined;
  let response: { result?: AnalysisResult; error?: string };
  try {
    const sourcePixels = bitmap.width * bitmap.height;
    sample = sampleBitmap(bitmap);
    self.postMessage({ stage: "calculating" });
    const result: AnalysisResult = {
      ...analyzePixels(sample.pixels, sample.plan.areas),
      sampleWidth: sample.plan.columns,
      sampleHeight: sample.plan.rows,
      sampling: {
        mode: sample.plan.exact ? "all-pixels" : "stratified",
        sourcePixels,
      },
    };
    self.postMessage({ stage: "metadata" });
    const buffer = await file.arrayBuffer();
    try {
      result.metadata = await inspectMetadata(buffer);
    } finally {
      new Uint8Array(buffer).fill(0);
    }
    self.postMessage({ stage: "maps" });
    let maps: ReturnType<typeof mapBitmap> | undefined;
    try {
      maps = mapBitmap(bitmap);
      self.postMessage({ stage: "preparing" });
      const light = await encodeMap(maps.light, maps.width, maps.height);
      const detail = await encodeMap(maps.detail, maps.width, maps.height);
      result.maps = {
        width: maps.width,
        height: maps.height,
        light,
        detail,
        maximumGradient: maps.maximumGradient,
      };
    } catch {
      result.mapError =
        "Spatial visualizations could not be generated. Pixel statistics remain available.";
    } finally {
      maps?.light.fill(0);
      maps?.detail.fill(0);
    }
    response = { result };
  } catch (error) {
    let message = error instanceof Error ? error.message : "Analysis failed.";
    if (
      sample &&
      !sample.plan.exact &&
      !sample.pixels.some((v, i) => i % 4 === 3 && v > 0)
    )
      message =
        "No visible pixels were found in this sample. Very sparse visible details may be missed.";
    response = { error: message };
  } finally {
    bitmap.close();
    sample?.pixels.fill(0);
    sample?.plan.areas.fill(0);
  }
  self.postMessage(response);
};
