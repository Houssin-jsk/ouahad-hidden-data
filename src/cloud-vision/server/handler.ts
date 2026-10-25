import { randomUUID } from "node:crypto";
import {
  CLOUD_API_TIMEOUT_MS,
  MAX_IMAGE_BYTES,
  unavailable,
} from "../contract";
import { publicIdentity, sameOrigin } from "./access";
import { providers, verifiedUntil, type Environment } from "./config";
import { SharedLedger } from "./ledger";
import { configuredLedger } from "./database";
import { validateCloudImage } from "./image";
import { routeVision } from "./router";
import { ProviderFailure, type ProviderAdapter } from "./types";

const reply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      Vary: "Origin",
    },
  });
interface Dependencies {
  ledger?: SharedLedger;
  adapters?: ProviderAdapter[];
  onAdmitted?: () => void;
}
export async function handleVision(
  request: Request,
  env: Environment,
  deps: Dependencies = {},
): Promise<Response> {
  if (request.method !== "POST")
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    });
  if (!sameOrigin(request, env))
    return reply(
      unavailable("restricted", "This request is not allowed."),
      403,
    );
  if (
    request.headers.get("x-cloud-consent") !== "external-v1" ||
    request.headers.get("x-cloud-eligibility") !==
      "adult-professional-nonsensitive-v2"
  )
    return reply(
      unavailable(
        "invalid_request",
        "Review and accept external image processing before starting.",
      ),
      400,
    );
  const identity = publicIdentity(request, env);
  if (!identity)
    return reply(
      unavailable(
        "restricted",
        "Cloud AI requires verified network admission. Local analysis remains available.",
      ),
      403,
    );
  if (!verifiedUntil(env.CLOUD_AI_RELEASE_READY_UNTIL))
    return reply(
      unavailable(
        "not_configured",
        "Cloud AI is awaiting its final admitted release check.",
      ),
      503,
    );
  let adapters = deps.adapters ?? providers(env, identity.country);
  if (!adapters.some((a) => a.eligibility.enabled))
    return reply(
      unavailable(
        "cost_unverified",
        "Cloud AI is unavailable until free account access has been verified.",
      ),
      503,
    );
  // Include database preflight/admission in the processing budget, rather than
  // starting a fresh long deadline only after the preflight has finished.
  const deadline = AbortSignal.timeout(CLOUD_API_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, deadline]);
  let ledger: SharedLedger;
  try {
    // Keep a small, bounded settlement window even when the browser disconnects.
    // Cancellation stops inference but must not cancel uncertain-debit recording.
    ledger = deps.ledger ?? configuredLedger(env, AbortSignal.timeout(58_000));
    const policy = await ledger.models();
    adapters = adapters.map((adapter) => {
      const row = policy.find((p) => p.model_key === adapter.model);
      return {
        ...adapter,
        priority: row?.priority ?? adapter.priority,
        eligibility: {
          ...adapter.eligibility,
          enabled:
            adapter.eligibility.enabled &&
            row?.enabled === 1 &&
            row?.eligibility === "eligible",
        },
      };
    });
    signal.throwIfAborted();
  } catch {
    return reply(
      unavailable(
        "not_configured",
        "Cloud AI is unavailable until shared usage protection is configured.",
      ),
      503,
    );
  }
  const requestKey = request.headers.get("x-cloud-request-id");
  if (
    !requestKey ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestKey,
    )
  )
    return reply(
      unavailable(
        "invalid_request",
        "A valid submission identifier is required.",
      ),
      400,
    );
  if (request.headers.get("content-type") !== "image/jpeg")
    return reply(
      unavailable("invalid_image", "Send a processed JPEG preview."),
      415,
    );
  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!/^\d+$/.test(declared) || Number(declared) > MAX_IMAGE_BYTES)
  )
    return reply(
      unavailable(
        "invalid_image",
        "The cloud preview exceeds the image limit.",
      ),
      413,
    );
  let admitted = false;
  const id = randomUUID();
  let bytes: Uint8Array | undefined;
  let clean: Uint8Array | undefined;
  try {
    // Reserve globally before accepting image bytes. Invalid attempts also spend
    // the anonymous network's conservative request budget. No infinite validation retries.
    admitted = await ledger.admit(identity.client, id, undefined, requestKey);
    if (!admitted) {
      await ledger.event(
        null,
        null,
        null,
        "rejected",
        "Anonymous fair-use, global limit, duplicate request or emergency stop",
      );
      return reply(
        unavailable(
          "rate_limited",
          "The anonymous fair-use or shared concurrency limit has been reached. Try again later.",
        ),
        429,
      );
    }
    deps.onAdmitted?.();
    if (!request.body) throw new ProviderFailure("invalid_image");
    const reader = request.body.getReader();
    const abortRead = () => {
      void reader.cancel().catch(() => {});
    };
    signal.addEventListener("abort", abortRead, { once: true });
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_IMAGE_BYTES) throw new ProviderFailure("invalid_image");
        chunks.push(value);
      }
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
        chunk.fill(0);
      }
    } finally {
      signal.removeEventListener("abort", abortRead);
      await reader.cancel().catch(() => {});
      for (const chunk of chunks) chunk.fill(0);
    }
    signal.throwIfAborted();
    const image = validateCloudImage(bytes, "image/jpeg");
    clean = image.bytes;
    const result = await routeVision(
      adapters,
      image,
      ledger.routing(id),
      signal,
    );
    return reply(result);
  } catch (error) {
    const kind = request.signal.aborted
      ? "cancelled"
      : deadline.aborted
        ? "timeout"
        : error instanceof ProviderFailure
          ? error.kind
          : "not_configured";
    return reply(
      unavailable(
        kind,
        kind === "invalid_image"
          ? "The cloud preview is invalid or too large."
          : "Cloud AI is unavailable. Local analysis remains available.",
      ),
      kind === "invalid_image" ? 400 : 503,
    );
  } finally {
    bytes?.fill(0);
    clean?.fill(0);
    // A failed release retains the lease for 120 seconds, safely denying excess
    // concurrency. No failed/aborted action refunds the daily budget.
    if (admitted) {
      await ledger.release(id).catch(() => {});
    }
  }
}
