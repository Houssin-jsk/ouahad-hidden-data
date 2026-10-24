import { AVAILABILITY_SCHEMA, type CloudAvailability } from "../availability";
import { authorize, sameOrigin } from "./access";
import { providers, verifiedUntil, type Environment } from "./config";
import { configuredLedger } from "./database";
import type { SharedLedger } from "./ledger";
import { MODEL_CEILINGS, TOKEN_RESERVATION, type ModelKey } from "./policy";
import type { ProviderAdapter } from "./types";

type ReadOnlyLedger = Pick<SharedLedger, "settings" | "models" | "now" | "get">;
function reply(status: CloudAvailability, code = 200) {
  return Response.json(
    { schema: AVAILABILITY_SCHEMA, status },
    {
      status: code,
      headers: {
        "Cache-Control": "no-store, private",
        Vary: "Origin, Authorization",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
function ownerPilotConfigured(env: Environment) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(env.CLOUD_AI_ADMIN_SECRET ?? ""))
    return false;
  const hash = env.CLOUD_AI_OWNER_TEST_INVITE_HASH ?? "";
  if (!/^[a-f0-9]{64}$/.test(hash)) return false;
  try {
    const entry = JSON.parse(env.CLOUD_AI_INVITES ?? "{}")[hash];
    return entry?.country === "MA" && verifiedUntil(entry.expiresAt);
  } catch {
    return false;
  }
}

// This is a read-only presentation snapshot, never an authorization or a quota
// reservation. The unchanged inference handler rechecks every admission gate.
export async function handleAvailability(
  request: Request,
  env: Environment,
  deps: {
    ledger?: ReadOnlyLedger;
    adapters?: ProviderAdapter[];
  } = {},
) {
  if (request.method !== "GET")
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET", "Cache-Control": "no-store" },
    });
  // GET carries no image or state change. Reject cross-site browser requests;
  // authorized requests carry the invitation only in the Authorization header.
  if (
    (request.headers.has("origin") && !sameOrigin(request, env)) ||
    ["cross-site", "same-site"].includes(
      request.headers.get("sec-fetch-site") ?? "",
    )
  )
    return reply("unavailable", 403);
  // Same-origin GETs normally omit Origin. Validate their URL origin against
  // the same runtime configuration used by inference, without sending an image.
  const headers = new Headers(request.headers);
  if (!headers.has("origin"))
    headers.set("origin", new URL(request.url).origin);
  if (!sameOrigin(new Request(request.url, { headers }), env))
    return reply("unavailable");
  const authenticated = request.headers.has("authorization");
  const identity = authorize(request, env);
  if (authenticated && !identity) return reply("invalid_invitation", 403);
  if (!identity) {
    try {
      const entries = Object.entries(JSON.parse(env.CLOUD_AI_INVITES ?? "{}"));
      if (
        !entries.some(
          ([hash, entry]) =>
            /^[a-f0-9]{64}$/.test(hash) &&
            entry &&
            typeof entry === "object" &&
            (entry as { country?: unknown }).country === "MA" &&
            verifiedUntil((entry as { expiresAt?: string }).expiresAt),
        )
      )
        return reply("unavailable");
    } catch {
      return reply("unavailable");
    }
  }
  const released = verifiedUntil(env.CLOUD_AI_RELEASE_READY_UNTIL);
  const ownerPilot = ownerPilotConfigured(env);
  if (
    !released &&
    !(
      ownerPilot &&
      (!identity || identity.client === env.CLOUD_AI_OWNER_TEST_INVITE_HASH)
    )
  )
    return reply("unavailable");
  const adapters = deps.adapters ?? providers(env, identity?.country ?? "MA");
  if (!adapters.some((a) => a.id !== "nvidia" && a.eligibility.enabled))
    return reply("unavailable");
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(4000)]);
    const ledger = deps.ledger ?? configuredLedger(env, signal);
    if ((await ledger.settings()).config.kill) return reply("unavailable");
    const rows = await ledger.models();
    const candidates = adapters.filter((a) => {
      const row = rows.find(
        (r) => r.model_key === a.model && r.provider === a.id,
      );
      return (
        a.id !== "nvidia" &&
        a.eligibility.enabled &&
        MODEL_CEILINGS[a.model as ModelKey]?.daily > 0 &&
        row?.enabled === 1 &&
        row.eligibility === "eligible" &&
        row.daily_cap > 0 &&
        row.rpm_cap > 0 &&
        row.tpm_cap >= TOKEN_RESERVATION
      );
    });
    if (!candidates.length) return reply("unavailable");
    const now = await ledger.now();
    const ready = await Promise.all(
      candidates.map(async (a) => {
        const values = await Promise.all([
          ledger.get(a.model),
          ledger.get(a.id),
        ]);
        return values.every(
          (until) =>
            until !== "suspended" && (until === undefined || until <= now),
        );
      }),
    );
    return reply(
      ready.some(Boolean)
        ? identity
          ? "eligible"
          : "restricted"
        : "unavailable",
    );
  } catch {
    return reply("unavailable");
  }
}
