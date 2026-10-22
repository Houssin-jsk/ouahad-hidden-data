import type { Prediction, VisionBackend } from "./types";
export interface LoadedVision<T> {
  model: T;
  backend: VisionBackend;
  reused: boolean;
}

export async function inferWithFallback<T, R>(
  loaded: LoadedVision<T>,
  session: VisionSession<T>,
  infer: (model: T) => Promise<R>,
  dispose: (model: T) => Promise<unknown>,
  onFallback: () => void,
) {
  try {
    return { loaded, output: await infer(loaded.model) };
  } catch (error) {
    if (loaded.backend !== "webgpu") throw error;
    await dispose(loaded.model);
    session.reset();
    onFallback();
    const fallback = await session.initialize(false);
    return { loaded: fallback, output: await infer(fallback.model) };
  }
}

/** A single reusable session, with one fallback after GPU initialization failure. */
export class VisionSession<T> {
  private ready?: Promise<{ model: T; backend: VisionBackend }>;
  constructor(private load: (backend: VisionBackend) => Promise<T>) {}
  initialize(gpu: boolean) {
    const reused = !!this.ready;
    this.ready ??= (async () => {
      if (gpu) {
        try {
          return {
            model: await this.load("webgpu"),
            backend: "webgpu" as const,
          };
        } catch {
          /* Retry the model with WASM. */
        }
      }
      return { model: await this.load("wasm"), backend: "wasm" as const };
    })();
    const pending = this.ready;
    return pending
      .then((value) => ({ ...value, reused }))
      .catch((error) => {
        if (this.ready === pending) this.ready = undefined;
        throw error;
      });
  }
  reset() {
    this.ready = undefined;
  }
}

/** Standard softmax over every ImageNet logit, never normalized over only the top five. */
export function rankPredictions(
  logits: ArrayLike<number>,
  labels: Record<string, string>,
): Prediction[] {
  if (logits.length !== 1000 || Object.keys(labels).length !== 1000)
    throw new Error("Unexpected classifier vocabulary.");
  const values = Array.from(logits);
  if (values.some((v) => !Number.isFinite(v)))
    throw new Error("Invalid model output.");
  const max = Math.max(...values);
  const weights = values.map((v) => Math.exp(v - max));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights
    .map((v, i) => ({ label: labels[i], score: v / total }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
