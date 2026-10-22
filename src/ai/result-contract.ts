/** Research contract only. This is not attached to Phase 02 analytics. */
export interface AIModelDescriptor {
  id: string;
  revision: string;
  task:
    "supplied-description-ranking" | "imagenet-content" | "object-detection";
  taxonomy: string;
  preprocessingVersion: string;
}
export type AIResultV1 = {
  schemaVersion: "ai-result/1";
  model: AIModelDescriptor;
  backend: "wasm" | "webgpu" | null;
  scoreSemantics:
    "cosine-similarity" | "full-taxonomy-softmax" | "detector-score";
  predictions: { id: string; label: string; rawScore: number }[];
  interpretation: string;
  abstention: { abstained: boolean; reason: string };
  limitations: string[];
  evaluationReference: string;
} & (
  | { state: "complete"; error: null }
  | {
      state: "unavailable" | "failed" | "cancelled";
      error: { code: string; message: string };
    }
);
