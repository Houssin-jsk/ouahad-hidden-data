import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE, OUTPUT_TOKENS } from "../contract";
import { geminiAdapter } from "./providers/gemini";
import { nvidiaAdapter } from "./providers/nvidia";
import { cloudflareAdapter } from "./providers/cloudflare";
import { freeGeminiRegion } from "./regions";
export type Environment = Record<string, string | undefined>;
// A key is configuration, not evidence of free inference. Operator checks must be
// current, expire within seven days, and be repeated after account-plan changes.
export function verifiedUntil(value: string | undefined, now = Date.now()) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) && time > now && time <= now + 7 * 86400000;
}
export function providers(env: Environment, country: string, now = Date.now()) {
  const constraints = {
    mime: "image/jpeg" as const,
    maxBytes: MAX_IMAGE_BYTES,
    maxSide: MAX_IMAGE_SIDE,
    outputTokens: OUTPUT_TOKENS,
  };
  // Public admission still enforces provider audience, region and free-tier terms.
  const gemini = Boolean(
    env.GEMINI_API_KEY &&
    freeGeminiRegion(country) &&
    verifiedUntil(env.CLOUD_AI_GEMINI_FREE_UNTIL, now),
  );
  const cloudflare = Boolean(
    env.CLOUDFLARE_API_TOKEN &&
    /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID ?? "") &&
    env.CLOUD_AI_CF_LICENSE_ACCEPTED === "true" &&
    verifiedUntil(env.CLOUD_AI_CF_FREE_UNTIL, now),
  );
  return [
    geminiAdapter(
      env.GEMINI_API_KEY ?? "",
      {
        enabled: gemini,
        reason: gemini
          ? "Owner-verified free tier; adults using the service for professional purposes in permitted regions."
          : "Free account billing status or permitted user region is unverified.",
      },
      constraints,
    ),
    geminiAdapter(
      env.GEMINI_API_KEY ?? "",
      {
        enabled:
          gemini && verifiedUntil(env.CLOUD_AI_GEMINI_31_VISION_UNTIL, now),
        reason:
          "Requires verified free project and a current exact-model vision smoke test.",
      },
      constraints,
      "gemini-3.1-flash-lite",
    ),
    cloudflareAdapter(
      env.CLOUDFLARE_ACCOUNT_ID ?? "",
      env.CLOUDFLARE_API_TOKEN ?? "",
      {
        enabled: cloudflare,
        reason: cloudflare
          ? "Owner-verified Workers Free account and accepted model license."
          : "Workers Free subscription and model license are unverified.",
      },
      constraints,
    ),
    nvidiaAdapter(env.NVIDIA_API_KEY ?? "", constraints),
  ];
}
