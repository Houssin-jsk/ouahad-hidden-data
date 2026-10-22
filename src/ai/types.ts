export type VisionBackend = "webgpu" | "wasm";
export type VisionStage = "loading" | "preparing" | "running" | "finalizing";
export interface Prediction {
  label: string;
  score: number;
}
export interface VisionResult {
  predictions: Prediction[];
  backend: VisionBackend;
  initializationMs: number;
  inferenceMs: number;
  reused: boolean;
}
export type VisionEvent =
  | { type: "stage"; stage: VisionStage; detail?: string }
  | { type: "download"; file: string; loaded: number; total: number }
  | { type: "result"; result: VisionResult }
  | { type: "error"; message: string };
export const UNCERTAIN_SCORE = 0.5;
export const VISION_STAGES: Record<VisionStage, string> = {
  loading: "Loading AI model",
  preparing: "Preparing image for AI",
  running: "Running on-device inference",
  finalizing: "Finalizing AI suggestions",
};
