import type { CloudError, Observations, ProviderId } from "../contract";
export interface VisionImage {
  bytes: Uint8Array;
  mime: "image/jpeg";
  width: number;
  height: number;
}
export class ProviderFailure extends Error {
  constructor(
    public kind: CloudError,
    public retryAt?: number,
    public quotaWindow: "minute" | "day" | "unknown" = "unknown",
  ) {
    super(kind);
  }
}
export interface ProviderResponse {
  observations: Observations;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    neurons?: number;
  };
}
export interface ProviderAdapter {
  id: ProviderId;
  model: string;
  priority?: number;
  constraints: {
    mime: "image/jpeg";
    maxBytes: number;
    maxSide: number;
    outputTokens: number;
  };
  eligibility: { enabled: boolean; reason: string };
  run(image: VisionImage, signal: AbortSignal): Promise<ProviderResponse>;
}
export interface Cooldowns {
  get(model: string): Promise<number | "suspended" | undefined>;
  set(model: string, until: number | "suspended"): Promise<void>;
}
export interface RoutingControls extends Cooldowns {
  now(): Promise<number>;
  reserve(adapter: ProviderAdapter): Promise<string | null>;
  settle(
    id: string,
    response?: ProviderResponse,
    error?: ProviderFailure,
  ): Promise<void>;
}
