import { CLOUD_SCHEMA, unavailable, type CloudResult } from "../contract";
import {
  ProviderFailure,
  type RoutingControls,
  type ProviderAdapter,
  type VisionImage,
} from "./types";
import { quotaDay } from "./policy";
export async function routeVision(
  adapters: ProviderAdapter[],
  image: VisionImage,
  cooldowns: RoutingControls,
  signal: AbortSignal,
): Promise<CloudResult> {
  const start = Date.now();
  let attempts = 0;
  let last = new ProviderFailure("not_configured");
  const ordered = [...adapters].sort(
    (a, b) =>
      (a.priority ?? (a.id === "gemini" ? 1 : a.id === "cloudflare" ? 3 : 4)) -
        (b.priority ?? (b.id === "gemini" ? 1 : 3)) ||
      a.model.localeCompare(b.model),
  );
  const visited = new Set<string>();
  const policy = await cooldowns.policy?.();
  for (const adapter of ordered) {
    if (visited.has(adapter.model)) continue;
    if (!adapter.eligibility.enabled) {
      await cooldowns.event?.(
        adapter.id,
        adapter.model,
        "skipped",
        "Ineligible or administratively disabled",
      );
      continue;
    }
    if (attempts && policy?.fallbackEnabled === false) break;
    visited.add(adapter.model);
    if (signal.aborted) {
      last = new ProviderFailure(
        signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled",
      );
      break;
    }
    const cooldown = await cooldowns.get(adapter.model);
    const now = await cooldowns.now();
    if (
      cooldown === "suspended" ||
      (typeof cooldown === "number" && cooldown > now)
    ) {
      last = new ProviderFailure("rate_limited");
      await cooldowns.event?.(
        adapter.id,
        adapter.model,
        "skipped",
        "Cooldown or suspension",
      );
      continue;
    }
    if (attempts >= 3) break;
    const reservation = await cooldowns.reserve(adapter);
    if (!reservation) {
      await cooldowns.event?.(
        adapter.id,
        adapter.model,
        "skipped",
        "Capacity threshold, policy change, or admission unavailable",
      );
      last = new ProviderFailure("rate_limited");
      continue;
    }
    attempts++;
    await cooldowns.event?.(
      adapter.id,
      adapter.model,
      "selected",
      attempts > 1
        ? "Fallback after explicit rejection"
        : "Highest-priority eligible capacity",
    );
    let settled = false;
    try {
      signal.throwIfAborted();
      const response = await adapter.run(image, signal);
      signal.throwIfAborted();
      await cooldowns.settle(reservation, response);
      settled = true;
      await cooldowns.event?.(
        adapter.id,
        adapter.model,
        "completed",
        "Validated observations",
      );
      return {
        schema: CLOUD_SCHEMA,
        status: "available",
        provider: adapter.id,
        model: adapter.model,
        interpretation: response.observations,
        processing: {
          elapsedMs: Date.now() - start,
          attempts,
          width: image.width,
          height: image.height,
          usage: response.usage,
        },
      };
    } catch (error) {
      last = signal.aborted
        ? new ProviderFailure(
            signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled",
          )
        : error instanceof ProviderFailure
          ? error
          : new ProviderFailure("invalid_output");
      if (!settled) await cooldowns.settle(reservation, undefined, last);
      await cooldowns.event?.(adapter.id, adapter.model, "failed", last.kind);
      if (
        [
          "rate_limited",
          "quota_exhausted",
          "invalid_credentials",
          "billing_required",
          "model_unavailable",
        ].includes(last.kind)
      )
        await cooldowns.set(
          adapter.model,
          last.retryAt ??
            (last.quotaWindow === "day"
              ? quotaDay(
                  await cooldowns.now(),
                  adapter.id === "gemini" ? "pacific" : "utc",
                ).end
              : ["rate_limited", "quota_exhausted"].includes(last.kind)
                ? (await cooldowns.now()) + 60000
                : "suspended"),
        );
      if (
        [
          "rate_limited",
          "quota_exhausted",
          "invalid_credentials",
          "billing_required",
          "model_unavailable",
        ].includes(last.kind)
      )
        await cooldowns.event?.(
          adapter.id,
          adapter.model,
          "cooldown",
          last.kind,
        );
      // A timeout or lost connection leaves provider execution uncertain. Keep
      // its reservation charged and stop; another call could duplicate that work.
      // Only explicit provider rejections may use the bounded eligible fallback.
      if (
        ![
          "rate_limited",
          "quota_exhausted",
          "invalid_credentials",
          "billing_required",
          "model_unavailable",
        ].includes(last.kind)
      )
        break;
    }
  }
  const messages = {
    safety_refusal:
      "The provider declined this image. No observations were generated.",
    cancelled: "AI analysis cancelled. Local analysis remains available.",
    invalid_image:
      "The cloud preview was not supported. Local analysis remains available.",
    invalid_output:
      "The provider did not return valid observations. You can try again later.",
    not_configured:
      "Cloud AI is unavailable until free access and release safeguards are verified.",
  };
  return {
    ...unavailable(
      last.kind,
      messages[last.kind as keyof typeof messages] ??
        "Cloud AI is temporarily unavailable. Please try again later; local analysis remains available.",
    ),
    processing: {
      elapsedMs: Date.now() - start,
      attempts,
      width: image.width,
      height: image.height,
    },
  };
}
