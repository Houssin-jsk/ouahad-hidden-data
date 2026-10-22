import { VisionSession, rankPredictions, inferWithFallback } from "./engine";
import type { VisionEvent, VisionResult } from "./types";
import type {
  PreTrainedModel,
  ImageProcessor,
} from "@huggingface/transformers";
interface Classifier {
  model: PreTrainedModel;
  processor: ImageProcessor;
  dispose(): Promise<unknown>;
}

const send = (event: VisionEvent) => self.postMessage(event);
const stage = (
  value: "loading" | "preparing" | "running" | "finalizing",
  detail?: string,
) => send({ type: "stage", stage: value, detail });
let runtime: typeof import("@huggingface/transformers") | undefined;
const session = new VisionSession<Classifier>(async (backend) => {
  stage(
    "loading",
    backend === "wasm"
      ? "Initializing WASM · local CPU processing"
      : "Initializing WebGPU · local acceleration",
  );
  runtime ??= await import("@huggingface/transformers");
  const { env, AutoModelForImageClassification, AutoImageProcessor } = runtime;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = new URL("/ai/", self.location.origin).href;
  // HTTP caching is sufficient. Do not create a persistent application CacheStorage.
  env.useBrowserCache = false;
  env.backends.onnx.wasm!.numThreads = 1;
  env.backends.onnx.wasm!.proxy = false;
  env.backends.onnx.wasm!.wasmPaths = {
    mjs: new URL(
      "/ai/runtime/ort-wasm-simd-threaded.asyncify.mjs",
      self.location.origin,
    ).href,
    wasm: new URL(
      "/ai/runtime/ort-wasm-simd-threaded.asyncify.wasm",
      self.location.origin,
    ).href,
  };
  const options = {
    device: backend,
    dtype: "fp32" as const,
    progress_callback: (progress: {
      status: string;
      loaded?: number;
      total?: number;
      file?: string;
    }) => {
      if (
        progress.status === "progress" &&
        Number.isFinite(progress.loaded) &&
        (progress.total ?? 0) > 0
      ) {
        send({
          type: "download",
          file: progress.file ?? "model",
          loaded: progress.loaded!,
          total: progress.total!,
        });
      }
    },
  };
  const processor = await AutoImageProcessor.from_pretrained(
    "mobilenetv4",
    options,
  );
  const model = await AutoModelForImageClassification.from_pretrained(
    "mobilenetv4",
    options,
  );
  processor.do_resize = false;
  processor.do_center_crop = false;
  return { model, processor, dispose: () => model.dispose() };
});

async function run(bitmap: ImageBitmap, preferWasm: boolean) {
  let pixels: Uint8ClampedArray | undefined;
  let rgbPixels: Uint8ClampedArray | Uint8Array | undefined;
  let tensor: Awaited<ReturnType<Classifier["processor"]>> | undefined;
  let output: Awaited<ReturnType<Classifier["model"]>> | undefined;
  try {
    stage(
      "loading",
      "Downloading model assets if they are not in your browser’s HTTP cache. No image upload.",
    );
    const initializedAt = performance.now();
    const gpu = navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<unknown> };
    };
    const available =
      !preferWasm &&
      ((await gpu.gpu
        ?.requestAdapter()
        .then(Boolean)
        .catch(() => false)) ??
        false);
    let loaded = await session.initialize(available);
    const initializationMs = performance.now() - initializedAt;
    stage("preparing");
    // Crop in native coordinates first to bound the pixel buffer even for panoramas.
    // The model sees only the central square: shortest edge 256, center crop 224.
    const edge = Math.min(bitmap.width, bitmap.height);
    const crop = (edge * 224) / 256;
    const canvas = new OffscreenCanvas(224, 224);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 224, 224);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bitmap,
      (bitmap.width - crop) / 2,
      (bitmap.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      224,
      224,
    );
    bitmap.close();
    pixels = ctx.getImageData(0, 0, 224, 224).data;
    const image = new runtime!.RawImage(pixels, 224, 224, 4).rgb();
    rgbPixels = image.data;
    // Resize/crop was done above to avoid decoding a second full-size image.
    // Official processor still performs rescale and ImageNet channel normalization.
    tensor = await loaded.model.processor(image);
    stage("running");
    const inferenceAt = performance.now();
    const inferred = await inferWithFallback(
      loaded,
      session,
      (classifier) => {
        stage("running");
        return classifier.model(tensor!);
      },
      (classifier) => classifier.dispose(),
      () =>
        stage(
          "loading",
          "GPU inference unavailable; initializing the WASM fallback.",
        ),
    );
    loaded = inferred.loaded;
    output = inferred.output;
    stage("finalizing");
    const labels = (
      loaded.model.model.config as unknown as {
        id2label: Record<string, string>;
      }
    ).id2label;
    const predictions = rankPredictions(
      output.logits.data as Float32Array,
      labels,
    );
    const result: VisionResult = {
      predictions,
      backend: loaded.backend,
      reused: loaded.reused,
      initializationMs,
      inferenceMs: performance.now() - inferenceAt,
    };
    send({ type: "result", result });
    canvas.width = canvas.height = 1;
  } catch {
    send({
      type: "error",
      message:
        "AI Vision could not finish. Check your connection for the first model download, or try again on a device with more available memory. Pixel analysis remains available.",
    });
  } finally {
    bitmap.close();
    pixels?.fill(0);
    rgbPixels?.fill(0);
    tensor?.pixel_values.dispose();
    output?.logits.dispose();
  }
}
// The client allows only one active request. No overlapping session.run calls.
self.onmessage = (
  event: MessageEvent<{ bitmap: ImageBitmap; preferWasm?: boolean }>,
) => void run(event.data.bitmap, event.data.preferWasm ?? false);
