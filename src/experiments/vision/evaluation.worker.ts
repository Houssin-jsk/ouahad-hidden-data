import type {
  ExperimentMode,
  ExperimentEvent,
  ExperimentResult,
} from "./types";
import { SCENE_CANDIDATES } from "./types";
import { fullFrameSize, normalizeDetections } from "./geometry";
import { rankPredictions } from "@/ai/engine";
import { ClipSceneEngine } from "@/scene/clip-engine";
import { SCENE_LIBRARY, SCENE_LIBRARY_VERSION } from "@/scene/candidates";
import {
  AUDITED_SCENE_LIBRARY,
  AUDITED_LIBRARY_VERSION,
} from "@/scene/audited-candidates";
import type { Coverage } from "@/scene/coverage";
let sceneEngine: ClipSceneEngine | undefined;
import type {
  PreTrainedModel,
  Processor,
  PreTrainedTokenizer,
  YolosImageProcessor,
} from "@huggingface/transformers";

let runtime: typeof import("@huggingface/transformers") | undefined;
let loaded:
  | {
      mode: ExperimentMode;
      model: PreTrainedModel;
      processor: Processor;
      tokenizer?: PreTrainedTokenizer;
    }
  | undefined;
const emit = (event: ExperimentEvent) => self.postMessage(event);
const status = (message: string) => emit({ type: "status", message });
const isClip = (mode?: ExperimentMode) =>
  mode === "scene" || mode === "discovery" || mode === "readiness";

async function initialize(mode: ExperimentMode) {
  if (loaded?.mode === mode || (isClip(mode) && isClip(loaded?.mode)))
    return true;
  if (loaded) {
    sceneEngine?.dispose();
    sceneEngine = undefined;
    await loaded.model.dispose();
    loaded = undefined;
  }
  runtime ??= await import("@huggingface/transformers");
  const {
    env,
    AutoProcessor,
    AutoModelForObjectDetection,
    AutoModelForImageClassification,
    CLIPModel,
  } = runtime;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.localModelPath = new URL(
    mode === "baseline" ? "/ai/" : "/experiments/ai/",
    self.location.origin,
  ).href;
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
  const id =
    mode === "detector" ? "yolos" : isClip(mode) ? "clip" : "mobilenetv4";
  const options = {
    device: "wasm" as const,
    dtype: mode === "baseline" ? ("fp32" as const) : ("q8" as const),
  };
  status(
    `Loading ${id} assets from this site; initializing WASM. No image upload.`,
  );
  const processor = await AutoProcessor.from_pretrained(id);
  const model =
    mode === "detector"
      ? await AutoModelForObjectDetection.from_pretrained(id, options)
      : isClip(mode)
        ? await CLIPModel.from_pretrained(id, options)
        : await AutoModelForImageClassification.from_pretrained(id, options);
  // AutoTokenizer's registry file discovery is not reliable for local aliases.
  // Load the two pinned local files explicitly, without any Hub lookup.
  const tokenizer = isClip(mode)
    ? new runtime.CLIPTokenizer(
        ...((await Promise.all(
          ["tokenizer.json", "tokenizer_config.json"].map(async (file) => {
            const response = await fetch(
              new URL(`/experiments/ai/clip/${file}`, self.location.origin),
            );
            if (!response.ok) throw Error("Local tokenizer asset unavailable");
            return await response.json();
          }),
        )) as [
          ConstructorParameters<typeof runtime.CLIPTokenizer>[0],
          ConstructorParameters<typeof runtime.CLIPTokenizer>[1],
        ]),
      )
    : undefined;
  if (mode === "baseline") {
    processor.image_processor!.do_resize = false;
    processor.image_processor!.do_center_crop = false;
  }
  // v4's generic resize helper can upscale beyond the requested shortest edge
  // when both edges are configured. Apply the export's 512 / max 1333 rule here.
  if (mode === "detector") processor.image_processor!.do_resize = false;
  loaded = { mode, model, processor, tokenizer };
  if (tokenizer)
    sceneEngine = new ClipSceneEngine(runtime, model, processor, tokenizer);
  return false;
}
function disposeTensors(values: Record<string, unknown>) {
  for (const value of new Set(Object.values(values)))
    if (value instanceof runtime!.Tensor) value.dispose();
}
let busy = false;
self.onmessage = async (
  event: MessageEvent<{
    mode: ExperimentMode;
    bitmap: ImageBitmap;
    coverage?: Coverage;
  }>,
) => {
  const { mode, bitmap } = event.data;
  if (busy) {
    bitmap.close();
    return;
  }
  busy = true;
  let pixels: Uint8ClampedArray | undefined;
  let rgbPixels: Uint8ClampedArray | Uint8Array | undefined;
  let inputs: Record<string, unknown> | undefined;
  let outputs: Record<string, unknown> | undefined;
  try {
    const start = performance.now();
    const reused = await initialize(mode);
    const initializationMs = performance.now() - start;
    if (mode === "discovery" || mode === "readiness") {
      const analysis = await sceneEngine!.analyze(
        bitmap,
        event.data.coverage ?? "whole",
        (name) =>
          status(
            `Matching ${name} view locally · frozen 36-description library`,
          ),
        mode === "readiness" ? AUDITED_SCENE_LIBRARY : SCENE_LIBRARY,
        mode === "readiness" ? AUDITED_LIBRARY_VERSION : SCENE_LIBRARY_VERSION,
      );
      emit({
        type: "result",
        result: {
          mode,
          backend: "wasm",
          initializationMs,
          reused,
          ...analysis,
          predictions: [],
          detections: [],
          assetLoads: performance
            .getEntriesByType("resource")
            .filter(
              (entry) =>
                entry.name.includes("/experiments/ai/clip/") ||
                entry.name.includes("/ai/runtime/"),
            )
            .map((entry) => {
              const resource = entry as PerformanceResourceTiming;
              return {
                file: new URL(entry.name).pathname,
                durationMs: resource.duration,
                transferBytes: resource.transferSize,
                decodedBytes: resource.decodedBodySize,
              };
            }),
        },
      });
      return;
    }
    status("Preparing pixels locally · white alpha composite");
    const prepStart = performance.now();
    const size =
      mode === "detector"
        ? fullFrameSize(bitmap.width, bitmap.height)
        : { width: 224, height: 224 };
    const canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !loaded || !runtime) throw Error("Canvas unavailable");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.imageSmoothingQuality = "high";
    if (mode === "baseline") {
      const crop = (Math.min(bitmap.width, bitmap.height) * 224) / 256;
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
    } else if (mode === "scene") {
      const scale = 224 / Math.max(bitmap.width, bitmap.height);
      const w = bitmap.width * scale,
        h = bitmap.height * scale;
      ctx.drawImage(bitmap, (224 - w) / 2, (224 - h) / 2, w, h);
    } else ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    pixels = ctx.getImageData(0, 0, size.width, size.height).data;
    const image = new runtime.RawImage(
      pixels,
      size.width,
      size.height,
      4,
    ).rgb();
    rgbPixels = image.data;
    const prepared = await loaded.processor(image);
    inputs = {
      pixel_values: prepared.pixel_values,
      ...(prepared.pixel_mask ? { pixel_mask: prepared.pixel_mask } : {}),
    };
    if (mode === "scene")
      Object.assign(
        inputs,
        loaded.tokenizer!(
          SCENE_CANDIDATES.map((label) => `This is a photo of ${label}`),
          { padding: true, truncation: true },
        ),
      );
    const inputShape = prepared.pixel_values.dims;
    const preprocessingMs = performance.now() - prepStart;
    status("Running real WASM inference · no artificial delay");
    const inferenceStart = performance.now();
    const output = await loaded.model(inputs);
    outputs = output;
    const inferenceMs = performance.now() - inferenceStart;
    status("Postprocessing measured model outputs");
    let predictions: ExperimentResult["predictions"] = [];
    let detections: ExperimentResult["detections"] = [];
    if (mode === "detector") {
      const boxes = (
        loaded.processor.image_processor as YolosImageProcessor
      ).post_process_object_detection(output, 0.25, undefined)[0];
      const labels = (
        loaded.model.config as unknown as { id2label: Record<string, string> }
      ).id2label;
      detections = normalizeDetections(
        boxes.boxes.map((box: number[], i: number) => ({
          label: labels[boxes.classes[i]],
          score: boxes.scores[i],
          box: { xmin: box[0], ymin: box[1], xmax: box[2], ymax: box[3] },
        })),
      );
    } else if (mode === "baseline")
      predictions = rankPredictions(
        (output.logits as InstanceType<typeof runtime.Tensor>)
          .data as Float32Array,
        (loaded.model.config as unknown as { id2label: Record<string, string> })
          .id2label,
      );
    else {
      const logits = Array.from(
        (output.logits_per_image as InstanceType<typeof runtime.Tensor>)
          .data as Float32Array,
      );
      const max = Math.max(...logits),
        weights = logits.map((value) => Math.exp(value - max)),
        total = weights.reduce((a, b) => a + b, 0);
      predictions = weights
        .map((weight, i) => ({
          label: SCENE_CANDIDATES[i],
          score: weight / total,
        }))
        .sort((a, b) => b.score - a.score);
    }
    emit({
      type: "result",
      result: {
        mode,
        backend: "wasm",
        initializationMs,
        inferenceMs,
        preprocessingMs,
        reused,
        inputShape,
        predictions,
        detections,
      },
    });
    canvas.width = canvas.height = 1;
  } catch (error) {
    emit({
      type: "error",
      message: `Experimental inference failed. ${error instanceof Error ? error.message.slice(0, 500) : "Runtime initialization or inference failed."} Reload the experiment to retry; the main product is unaffected.`,
    });
  } finally {
    bitmap.close();
    pixels?.fill(0);
    rgbPixels?.fill(0);
    if (inputs) disposeTensors(inputs);
    if (outputs) disposeTensors(outputs);
    busy = false;
  }
};
