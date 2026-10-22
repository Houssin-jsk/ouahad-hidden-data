import * as ort from "onnxruntime-web/wasm";
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = {
  mjs: new URL(
    "/ai/runtime/ort-wasm-simd-threaded.asyncify.mjs",
    self.location.origin,
  ).href,
  wasm: new URL(
    "/ai/runtime/ort-wasm-simd-threaded.asyncify.wasm",
    self.location.origin,
  ).href,
};
let session: ort.InferenceSession | undefined,
  labels: string[] = [];
let busy = false;
self.onmessage = async (e: MessageEvent<{ bitmap: ImageBitmap }>) => {
  const { bitmap } = e.data;
  if (busy) {
    bitmap.close();
    return;
  }
  busy = true;
  let input: ort.Tensor | undefined,
    output: ort.InferenceSession.ReturnType | undefined;
  try {
    self.postMessage({
      type: "status",
      message: "Loading official Places365 export, WASM only",
    });
    const reused = !!session,
      at = performance.now();
    if (!session) {
      session = await ort.InferenceSession.create(
        "/experiments/ai/places/model.onnx",
        { executionProviders: ["wasm"] },
      );
      labels = await (await fetch("/experiments/ai/places/labels.json")).json();
      const zero = new ort.Tensor(
        "float32",
        new Float32Array(3 * 224 * 224),
        [1, 3, 224, 224],
      );
      const ref = await session.run({ pixel_values: zero });
      self.postMessage({ type: "status", message: "Reference check complete" });
      const expected = await (
        await fetch("/experiments/ai/places/reference.json")
      ).json();
      let max = 0;
      const arr = ref.logits.data as Float32Array;
      for (let i = 0; i < arr.length; i++)
        max = Math.max(max, Math.abs(arr[i] - expected[i]));
      zero.dispose();
      ref.logits.dispose();
      if (max > 1e-4) throw Error(`Export equivalence error ${max}`);
    }
    const initializationMs = performance.now() - at,
      prep = performance.now(),
      canvas = new OffscreenCanvas(224, 224),
      ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 224, 224);
    const side = Math.min(bitmap.width, bitmap.height) * 0.875;
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      224,
      224,
    );
    const bytes = ctx.getImageData(0, 0, 224, 224).data,
      values = new Float32Array(3 * 224 * 224),
      means = [0.485, 0.456, 0.406],
      std = [0.229, 0.224, 0.225];
    for (let c = 0; c < 3; c++)
      for (let j = 0; j < 224 * 224; j++)
        values[c * 224 * 224 + j] =
          (bytes[j * 4 + c] / 255 - means[c]) / std[c];
    bytes.fill(0);
    canvas.width = canvas.height = 1;
    input = new ort.Tensor("float32", values, [1, 3, 224, 224]);
    const preprocessingMs = performance.now() - prep,
      start = performance.now();
    output = await session.run({ pixel_values: input });
    const inferenceMs = performance.now() - start;
    const logits = Array.from(output.logits.data as Float32Array),
      max = Math.max(...logits),
      weights = logits.map((x) => Math.exp(x - max)),
      sum = weights.reduce((a, b) => a + b, 0);
    self.postMessage({
      type: "result",
      result: {
        mode: "places",
        backend: "wasm",
        reused,
        initializationMs,
        preprocessingMs,
        inferenceMs,
        inputShape: [1, 3, 224, 224],
        predictions: weights
          .map((w, i) => ({ label: labels[i], score: w / sum }))
          .sort((a, b) => b.score - a.score),
        detections: [],
      },
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: `Places failed: ${String(error)}`,
    });
  } finally {
    input?.dispose();
    if (output) for (const t of Object.values(output)) t.dispose();
    bitmap.close();
    busy = false;
  }
};
