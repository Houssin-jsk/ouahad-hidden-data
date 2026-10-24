import type { AnalysisStage } from "../analysis/discovery-types";
export const MINIMUM_LOADING_MS = 0;
export const PRESENTATION_REFRESH_MS = 80;
export const PRESENTATION_STAGES = [
  {
    label: "Opening image",
    offset: 0,
    helper: "The image is decoded locally. Your original stays private.",
  },
  {
    label: "Reading colors",
    offset: 0.15,
    helper: "Original-resolution pixels are sampled without blending colors.",
  },
  {
    label: "Grouping palette",
    offset: 0.31,
    helper: "Color families use actual pixel values, area and transparency.",
  },
  {
    label: "Measuring light",
    offset: 0.48,
    helper: "Luminance and tonal spread use the validated sRGB calculations.",
  },
  {
    label: "Finding edges & texture",
    offset: 0.66,
    helper:
      "Sobel gradients reveal spatial detail, not an image-quality score.",
  },
  {
    label: "Preparing results",
    offset: 0.84,
    helper: "Available measurements are organized for exploration.",
  },
] as const;
const reached: Partial<Record<AnalysisStage, number>> = {
  decoding: 0,
  sampling: 1,
  calculating: 3,
  metadata: 3,
  maps: 4,
  preparing: 5,
};
export interface LoadingFrame {
  stage: AnalysisStage;
  presentedIndex: number;
  progress: number;
  workReady: boolean;
  canRelease: boolean;
}
export function loadingFrame(
  elapsed: number,
  stage: AnalysisStage,
  workReady: boolean,
  minimumMs = MINIMUM_LOADING_MS,
): LoadingFrame {
  const fraction =
    minimumMs === 0 ? 1 : Math.min(1, Math.max(0, elapsed / minimumMs));
  const actualIndex = workReady ? 5 : (reached[stage] ?? 0);
  let timedIndex = 0;
  PRESENTATION_STAGES.forEach((step, i) => {
    if (fraction >= step.offset) timedIndex = i;
  });
  const canRelease = workReady && elapsed >= minimumMs;
  return {
    stage,
    presentedIndex: Math.min(timedIndex, actualIndex),
    progress: canRelease ? 1 : Math.min(0.995, fraction, (actualIndex + 1) / 6),
    workReady,
    canRelease,
  };
}
export interface PresentationClock {
  now: () => number;
  set: (callback: () => void, ms: number) => number;
  clear: (id: number) => void;
}
export interface LoadingRun<T> {
  update: (stage: AnalysisStage) => void;
  complete: (result: T) => void;
  cancel: () => void;
}
/** Presentation timing never delays the worker. Results are held independently,
 * then released once real work AND the minimum presentation time are complete. */
export function createLoadingRun<T>({
  onFrame,
  onReady,
  minimumMs = MINIMUM_LOADING_MS,
  clock = {
    now: () => performance.now(),
    set: (fn, ms) => window.setTimeout(fn, ms),
    clear: (id) => window.clearTimeout(id),
  },
}: {
  onFrame: (frame: LoadingFrame) => void;
  onReady: (result: T) => void;
  minimumMs?: number;
  clock?: PresentationClock;
}): LoadingRun<T> {
  if (!Number.isFinite(minimumMs) || minimumMs < 0)
    throw new Error("Invalid minimum loading duration.");
  const start = clock.now();
  let stage: AnalysisStage = "decoding",
    active = true,
    timer: number | undefined,
    pending: T | undefined,
    ready = false;
  const clearTimer = () => {
    if (timer !== undefined) clock.clear(timer);
    timer = undefined;
  };
  const tick = () => {
    clearTimer();
    if (!active) return;
    const elapsed = clock.now() - start,
      frame = loadingFrame(elapsed, stage, ready, minimumMs);
    onFrame(frame);
    if (frame.canRelease && ready) {
      active = false;
      const result = pending!;
      pending = undefined;
      onReady(result);
      return;
    }
    timer = clock.set(
      tick,
      ready
        ? Math.max(1, Math.min(PRESENTATION_REFRESH_MS, minimumMs - elapsed))
        : PRESENTATION_REFRESH_MS,
    );
  };
  tick();
  return {
    update(next) {
      if (!active) return;
      stage = next;
      tick();
    },
    complete(result) {
      if (!active) return;
      pending = result;
      ready = true;
      tick();
    },
    cancel() {
      active = false;
      clearTimer();
      pending = undefined;
    },
  };
}
