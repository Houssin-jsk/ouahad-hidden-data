import {
  env,
  CLIPModel,
  AutoProcessor,
  CLIPTokenizer,
  RawImage,
  Tensor,
} from "@huggingface/transformers";
const labels = [
  "natural scenery",
  "buildings and city streets",
  "an indoor room",
  "animals",
  "food or a meal",
  "vehicles used for transportation",
];
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;
env.localModelPath = new URL("/experiments/ai/", self.location.origin).href;
env.backends.onnx.wasm!.numThreads = 1;
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
let session:
  | Promise<{
      model: Awaited<ReturnType<typeof CLIPModel.from_pretrained>>;
      processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
      tokenizer: CLIPTokenizer;
    }>
  | undefined;
let busy = false;
self.onmessage = async (event: MessageEvent<{ bitmap: ImageBitmap }>) => {
  const { bitmap } = event.data;
  if (busy) {
    bitmap.close();
    return;
  }
  busy = true;
  let input: Record<string, Tensor> | undefined,
    output: Record<string, Tensor> | undefined,
    tokens: Record<string, Tensor> | undefined;
  const clear = (v?: Record<string, Tensor>) => {
    for (const t of new Set(Object.values(v ?? {})))
      if (t instanceof Tensor) t.dispose();
  };
  try {
    const reused = !!session,
      start = performance.now();
    self.postMessage({
      type: "status",
      message: "Loading pinned TinyCLIP INT8 locally",
    });
    session ??= (async () => ({
      model: await CLIPModel.from_pretrained("tiny", {
        device: "wasm",
        dtype: "int8",
      }),
      processor: await AutoProcessor.from_pretrained("tiny"),
      tokenizer: new CLIPTokenizer(
        ...((await Promise.all(
          ["tokenizer.json", "tokenizer_config.json"].map(async (f) => {
            const r = await fetch(`/experiments/ai/tiny/${f}`);
            if (!r.ok) throw Error("Tokenizer unavailable");
            return r.json();
          }),
        )) as [
          ConstructorParameters<typeof CLIPTokenizer>[0],
          ConstructorParameters<typeof CLIPTokenizer>[1],
        ]),
      ),
    }))();
    const { model, processor, tokenizer } = await session,
      initializationMs = performance.now() - start;
    const prep = performance.now(),
      canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
      ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    input = await processor(
      new RawImage(pixels, canvas.width, canvas.height, 4).rgb(),
    );
    pixels.fill(0);
    canvas.width = canvas.height = 1;
    tokens = tokenizer(
      labels.map((l) => `a photo of ${l}`),
      { padding: true, truncation: true },
    );
    const preprocessingMs = performance.now() - prep,
      at = performance.now();
    output = await model({ ...tokens, pixel_values: input!.pixel_values });
    const inferenceMs = performance.now() - at,
      a = Array.from(output!.image_embeds.data as Float32Array),
      b = Array.from(output!.text_embeds.data as Float32Array),
      n = a.length;
    const predictions = labels
      .map((label, i) => {
        const v = b.slice(i * n, (i + 1) * n);
        return {
          label,
          score:
            a.reduce((s, x, j) => s + x * v[j], 0) /
            (Math.hypot(...a) * Math.hypot(...v)),
        };
      })
      .sort((a, b) => b.score - a.score);
    self.postMessage({
      type: "result",
      result: {
        mode: "tiny",
        backend: "wasm",
        initializationMs,
        preprocessingMs,
        inferenceMs,
        reused,
        inputShape: input!.pixel_values.dims,
        predictions,
        detections: [],
      },
    });
  } catch (e) {
    session = undefined;
    self.postMessage({
      type: "error",
      message: `TinyCLIP failed: ${e instanceof Error ? e.message : "unknown error"}`,
    });
  } finally {
    clear(input);
    clear(tokens);
    clear(output);
    bitmap.close();
    busy = false;
  }
};
