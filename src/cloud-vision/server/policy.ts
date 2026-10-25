export const MODEL_KEYS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "@cf/meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-11b-vision-instruct",
] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];
export const TOKEN_RESERVATION = 4096;
// Operator-reported project quotas (2026-10-22) are ceilings, not a balance API.
// Internal ceilings remain below 500 RPD / 15 RPM / 250,000 input TPM per model.
export const MODEL_CEILINGS = {
  "gemini-3.5-flash-lite": { daily: 300, rpm: 10, tpm: 200000, neurons: 0 },
  "gemini-3.1-flash-lite": { daily: 300, rpm: 10, tpm: 200000, neurons: 0 },
  "@cf/meta/llama-3.2-11b-vision-instruct": {
    daily: 0,
    rpm: 0,
    tpm: 0,
    neurons: 0,
  },
  "meta/llama-3.2-11b-vision-instruct": {
    daily: 0,
    rpm: 0,
    tpm: 0,
    neurons: 0,
  },
} as const;
export const GLOBAL_CEILINGS = {
  dailyActions: 60,
  minuteActions: 6,
  concurrency: 2,
  visitorDaily: 3,
  visitorMinute: 1,
  projectDaily: 300,
  projectRpm: 10,
  projectTpm: 200000,
  projectDailyTokens: 1000000,
} as const;
export interface GlobalPolicy {
  kill: boolean;
  publicEnabled: boolean;
  fallbackEnabled: boolean;
  warningPercent: number;
  dailyActions: number;
  minuteActions: number;
  concurrency: number;
  visitorDaily: number;
  visitorMinute: number;
  projectDaily: number;
  projectRpm: number;
  projectTpm: number;
  projectDailyTokens: number;
}
export const DEFAULT_POLICY: GlobalPolicy = {
  kill: true,
  publicEnabled: false,
  fallbackEnabled: true,
  warningPercent: 80,
  ...GLOBAL_CEILINGS,
};
export function validateGlobalPolicy(value: unknown): GlobalPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid global settings");
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join() !==
      Object.keys(DEFAULT_POLICY).sort().join() ||
    typeof row.kill !== "boolean" ||
    typeof row.publicEnabled !== "boolean" ||
    typeof row.fallbackEnabled !== "boolean" ||
    !Number.isInteger(row.warningPercent) ||
    Number(row.warningPercent) < 10 ||
    Number(row.warningPercent) > 100
  )
    throw Error("Invalid global settings");
  for (const [key, ceiling] of Object.entries(GLOBAL_CEILINGS))
    if (
      !Number.isSafeInteger(row[key]) ||
      Number(row[key]) < 1 ||
      Number(row[key]) > ceiling
    )
      throw Error("Global limit exceeds safe ceiling");
  return row as unknown as GlobalPolicy;
}
export interface ProviderPolicy {
  model_key: ModelKey;
  provider: string;
  enabled: number;
  eligibility: string;
  priority: number;
  daily_cap: number;
  rpm_cap: number;
  tpm_cap: number;
  neuron_cap: number;
  reset_policy: string;
  verified_at: number | null;
  updated_at: number;
  revision: number;
}
export interface ProviderChange {
  model: ModelKey;
  enabled: boolean;
  priority: number;
  daily: number;
  rpm: number;
  tpm: number;
  revision: number;
}
export function validateProviderChange(value: unknown): ProviderChange {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid model settings");
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join() !==
      ["model", "enabled", "priority", "daily", "rpm", "tpm", "revision"]
        .sort()
        .join() ||
    !MODEL_KEYS.includes(row.model as ModelKey) ||
    typeof row.enabled !== "boolean"
  )
    throw Error("Invalid model settings");
  const cap = MODEL_CEILINGS[row.model as ModelKey];
  for (const [key, ceiling] of Object.entries({
    daily: cap.daily,
    rpm: cap.rpm,
    tpm: cap.tpm,
    priority: 4,
    revision: Number.MAX_SAFE_INTEGER,
  }))
    if (
      !Number.isSafeInteger(row[key]) ||
      Number(row[key]) < (key === "priority" ? 1 : 0) ||
      Number(row[key]) > ceiling
    )
      throw Error("Model limit exceeds safe ceiling");
  if (row.enabled && cap.daily === 0)
    throw Error("This model is not qualified for production");
  if (
    row.enabled &&
    (Number(row.daily) < 1 ||
      Number(row.rpm) < 1 ||
      Number(row.tpm) < TOKEN_RESERVATION)
  )
    throw Error("Invalid enabled model limits");
  return row as unknown as ProviderChange;
}
function pacificParts(time: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}
function pacificMidnight(year: number, month: number, day: number) {
  const wall = Date.UTC(year, month - 1, day);
  let candidate = wall;
  for (let i = 0; i < 3; i++) {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      timeZoneName: "longOffset",
    })
      .formatToParts(candidate)
      .find((p) => p.type === "timeZoneName")
      ?.value.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!offset) throw Error("Pacific reset could not be determined");
    candidate =
      wall -
      (offset[1] === "+" ? 1 : -1) *
        (Number(offset[2]) * 60 + Number(offset[3])) *
        60000;
  }
  return candidate;
}
export function quotaDay(time: number, reset: "pacific" | "utc") {
  if (reset === "utc") {
    const start = Math.floor(time / 86400000) * 86400000;
    return { start, end: start + 86400000 };
  }
  const parts = pacificParts(time);
  const year = Number(parts.year),
    month = Number(parts.month),
    day = Number(parts.day);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    start: pacificMidnight(year, month, day),
    end: pacificMidnight(
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
    ),
  };
}
