export const CLOUD_SCHEMA = "cloud-vision/1" as const;
export const MAX_IMAGE_BYTES = 768 * 1024;
export const MAX_IMAGE_SIDE = 1024;
export const OUTPUT_TOKENS = 480;
// The provider gets 45s inside the API budget; the browser also allows for
// quota settlement/release and its own local preview preparation.
export const GEMINI_TIMEOUT_MS = 45_000;
export const CLOUD_API_TIMEOUT_MS = 50_000;
export const CLOUD_BROWSER_TIMEOUT_MS = 65_000;
export const CLOUD_SMOKE_RESPONSE_TIMEOUT_MS = 70_000;
export type ProviderId = "gemini" | "nvidia" | "cloudflare";
export type CloudError =
  | "restricted"
  | "not_configured"
  | "cost_unverified"
  | "invalid_image"
  | "invalid_request"
  | "rate_limited"
  | "quota_exhausted"
  | "invalid_credentials"
  | "model_unavailable"
  | "billing_required"
  | "outage"
  | "timeout"
  | "cancelled"
  | "invalid_output"
  | "safety_refusal";
export interface Observations {
  description: string;
  observations: string[];
  limitations: string[];
}
export interface CloudResult {
  schema: typeof CLOUD_SCHEMA;
  status: "available" | "unavailable";
  provider?: ProviderId;
  model?: string;
  interpretation?: Observations;
  error?: CloudError;
  message?: string;
  processing?: {
    elapsedMs: number;
    attempts: number;
    width: number;
    height: number;
    usage?: { inputTokens?: number; outputTokens?: number };
  };
}
export function unavailable(error: CloudError, message: string): CloudResult {
  return { schema: CLOUD_SCHEMA, status: "unavailable", error, message };
}
function shortText(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  );
}
export function validateObservations(value: unknown): Observations {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("invalid_output");
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).some(
      (k) => !["description", "observations", "limitations"].includes(k),
    ) ||
    !shortText(row.description, 600)
  )
    throw Error("invalid_output");
  for (const key of ["observations", "limitations"]) {
    if (
      !Array.isArray(row[key]) ||
      row[key].length > 4 ||
      !row[key].every((v) => shortText(v, 240))
    )
      throw Error("invalid_output");
  }
  if (!(row.limitations as unknown[]).length) throw Error("invalid_output");
  return {
    description: row.description.trim(),
    observations: (row.observations as string[]).map((v) => v.trim()),
    limitations: (row.limitations as string[]).map((v) => v.trim()),
  };
}
export function validateCloudResult(value: unknown): CloudResult {
  if (!value || typeof value !== "object") throw Error("invalid_output");
  const row = value as CloudResult;
  if (row.schema !== CLOUD_SCHEMA) throw Error("invalid_output");
  if (
    row.status === "available" &&
    ["gemini", "nvidia", "cloudflare"].includes(row.provider ?? "") &&
    shortText(row.model, 120)
  ) {
    return { ...row, interpretation: validateObservations(row.interpretation) };
  }
  if (
    row.status === "unavailable" &&
    shortText(row.message, 300) &&
    typeof row.error === "string"
  )
    return row;
  throw Error("invalid_output");
}
