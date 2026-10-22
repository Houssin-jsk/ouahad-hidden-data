import { SCENE_LIBRARY, SCENE_LIBRARY_VERSION } from "./candidates";
import { sceneViewPlan, type Coverage, type Region } from "./coverage";
import { cosineScores, rankScenes, summarizeViews } from "./ranking";
import type {
  PreTrainedModel,
  Processor,
  PreTrainedTokenizer,
  Tensor,
} from "@huggingface/transformers";

/** Reusable model adapter: caches prompt tokenization, owns temporary tensors, UI-independent. */
export class ClipSceneEngine {
  private tokens?: Record<string, Tensor>;
  private tokenVersion?: string;
  constructor(
    private runtime: typeof import("@huggingface/transformers"),
    private model: PreTrainedModel,
    private processor: Processor,
    private tokenizer: PreTrainedTokenizer,
  ) {}
  dispose() {
    if (this.tokens) this.clear(this.tokens);
    this.tokens = undefined;
  }
  private clear(values: Record<string, unknown>) {
    for (const value of new Set(Object.values(values)))
      if (value instanceof this.runtime.Tensor) value.dispose();
  }
  async analyze(
    bitmap: ImageBitmap,
    coverage: Coverage,
    onView: (name: string) => void,
    library = SCENE_LIBRARY,
    libraryVersion = SCENE_LIBRARY_VERSION,
  ) {
    const plan = sceneViewPlan(bitmap.width, bitmap.height, coverage);
    if (this.tokenVersion !== libraryVersion) {
      this.dispose();
      this.tokenVersion = libraryVersion;
    }
    this.tokens ??= this.tokenizer(
      library.map((candidate) => `This is a photo of ${candidate.description}`),
      {
        padding: true,
        truncation: true,
      },
    );
    const views = [];
    let preprocessingMs = 0,
      inferenceMs = 0;
    for (const view of plan) {
      onView(view.name);
      const canvas = new OffscreenCanvas(224, 224),
        ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw Error("Worker canvas unavailable");
      let input: Record<string, Tensor> | undefined,
        output: Record<string, Tensor> | undefined;
      let pixels: Uint8ClampedArray | undefined,
        rgb: Uint8ClampedArray | Uint8Array | undefined;
      try {
        const prep = performance.now();
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 224, 224);
        ctx.imageSmoothingQuality = "high";
        const region: Region = view.region ?? {
          x: 0,
          y: 0,
          width: bitmap.width,
          height: bitmap.height,
        };
        const scale = 224 / Math.max(region.width, region.height),
          w = region.width * scale,
          h = region.height * scale;
        ctx.drawImage(
          bitmap,
          region.x,
          region.y,
          region.width,
          region.height,
          (224 - w) / 2,
          (224 - h) / 2,
          w,
          h,
        );
        pixels = ctx.getImageData(0, 0, 224, 224).data;
        const image = new this.runtime.RawImage(pixels, 224, 224, 4).rgb();
        rgb = image.data;
        input = await this.processor(image);
        preprocessingMs += performance.now() - prep;
        const start = performance.now();
        output = await this.model({
          ...this.tokens,
          pixel_values: input!.pixel_values,
        });
        inferenceMs += performance.now() - start;
        const scores = cosineScores(
          output!.image_embeds.data as Float32Array,
          output!.text_embeds.data as Float32Array,
          output!.image_embeds.dims.at(-1)!,
          library,
        );
        views.push({ ...view, ranking: rankScenes(scores, library) });
      } finally {
        if (input) this.clear(input);
        if (output) this.clear(output);
        pixels?.fill(0);
        rgb?.fill(0);
        canvas.width = canvas.height = 1;
      }
    }
    return {
      discovery: summarizeViews(views, libraryVersion),
      preprocessingMs,
      inferenceMs,
      inputShape: [1, 3, 224, 224],
    };
  }
}
