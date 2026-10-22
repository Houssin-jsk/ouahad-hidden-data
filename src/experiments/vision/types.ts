import type { SceneDiscovery } from "@/scene/ranking";
export type ExperimentMode =
  | "detector"
  | "scene"
  | "baseline"
  | "discovery"
  | "readiness"
  | "tiny"
  | "places";
export const SCENE_CANDIDATES = [
  "outdoor cooking with pots over a fire",
  "an indoor kitchen with cooking utensils",
  "animals resting indoors on furniture",
  "a wild animal outdoors",
  "people eating at a restaurant",
  "a market selling pottery",
  "a landscape without cooking equipment",
  "binoculars and optical equipment",
  "a military vehicle",
  "a radio telescope",
] as const;
export interface Suggestion {
  label: string;
  score: number;
}
export interface Detection extends Suggestion {
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}
export interface ExperimentResult {
  mode: ExperimentMode;
  backend: "wasm";
  initializationMs: number;
  inferenceMs: number;
  preprocessingMs: number;
  reused: boolean;
  inputShape: number[];
  predictions: Suggestion[];
  detections: Detection[];
  discovery?: SceneDiscovery;
  assetLoads?: {
    file: string;
    durationMs: number;
    transferBytes: number;
    decodedBytes: number;
  }[];
}
export type ExperimentEvent =
  | { type: "status"; message: string }
  | { type: "result"; result: ExperimentResult }
  | { type: "error"; message: string };
