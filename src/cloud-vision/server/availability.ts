import { AVAILABILITY_SCHEMA, type CloudAvailability } from "../availability";
import { publicIdentity, sameOrigin } from "./access";
import { providers, verifiedUntil, type Environment } from "./config";
import { configuredLedger } from "./database";
import type { SharedLedger } from "./ledger";
import {
  quotaDay,
  MODEL_CEILINGS,
  TOKEN_RESERVATION,
  type ModelKey,
} from "./policy";
import type { ProviderAdapter } from "./types";

type ReadOnlyLedger = Pick<
  SharedLedger,
  "settings" | "models" | "now" | "get" | "query"
>;
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
  // no invitation or client-generated identity controls admission.
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
  const identity = publicIdentity(request, env);
  if (!identity || !verifiedUntil(env.CLOUD_AI_RELEASE_READY_UNTIL))
    return reply("unavailable");
  const adapters = deps.adapters ?? providers(env, identity.country);
  if (!adapters.some((a) => a.id !== "nvidia" && a.eligibility.enabled))
    return reply("unavailable");
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(4000)]);
    const ledger = deps.ledger ?? configuredLedger(env, signal);
    const { config } = await ledger.settings();
    if (config.kill || !config.publicEnabled) return reply("unavailable");
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
        if (
          !values.every(
            (until) =>
              until !== "suspended" && (until === undefined || until <= now),
          )
        )
          return false;
        const row = rows.find((r) => r.model_key === a.model)!;
        const day = quotaDay(now, a.id === "gemini" ? "pacific" : "utc");
        const utc = Math.floor(now / 86400000) * 86400000;
        const usage = await ledger.query(
          `SELECT
          (SELECT COUNT(*) FROM cloud_jobs WHERE created>=?) AS global_day,
          (SELECT COUNT(*) FROM cloud_jobs WHERE created>?) AS global_minute,
          (SELECT COUNT(*) FROM cloud_jobs WHERE client=? AND created>=?) AS visitor_day,
          (SELECT COUNT(*) FROM cloud_jobs WHERE client=? AND created>?) AS visitor_minute,
          (SELECT COUNT(*) FROM cloud_jobs WHERE released=0 AND lease_until>?) AS active,
          (SELECT reserved_requests FROM usage_counters WHERE scope=? AND window_type='day' AND window_start=?) AS model_day,
          (SELECT reserved_requests FROM usage_counters WHERE scope=? AND window_type='day' AND window_start=?) AS project_day,
          (SELECT reserved_tokens FROM usage_counters WHERE scope=? AND window_type='day' AND window_start=?) AS project_tokens,
          COUNT(*) AS project_minute,SUM(model_key=?) AS model_minute,
          COALESCE(SUM(MAX(reserved_tokens,COALESCE(actual_tokens,0))),0) AS project_tpm,
          COALESCE(SUM(CASE WHEN model_key=? THEN MAX(reserved_tokens,COALESCE(actual_tokens,0)) ELSE 0 END),0) AS model_tpm
          FROM request_logs WHERE provider=? AND started>?`,
          [
            utc,
            now - 60000,
            identity.client,
            utc,
            identity.client,
            now - 60000,
            now,
            a.model,
            day.start,
            "project:" + a.id,
            day.start,
            "project:" + a.id,
            day.start,
            a.model,
            a.model,
            a.id,
            now - 60000,
          ],
        );
        const u = usage[0],
          n = (key: string) => Number(u[key] ?? 0);
        return (
          n("global_day") < config.dailyActions &&
          n("global_minute") < config.minuteActions &&
          n("visitor_day") < config.visitorDaily &&
          n("visitor_minute") < config.visitorMinute &&
          n("active") < config.concurrency &&
          n("model_day") <
            Math.max(
              1,
              Math.floor((row.daily_cap * config.warningPercent) / 100),
            ) &&
          n("project_day") < config.projectDaily &&
          n("project_tokens") + TOKEN_RESERVATION <=
            config.projectDailyTokens &&
          n("model_minute") < row.rpm_cap &&
          n("project_minute") < config.projectRpm &&
          n("model_tpm") + TOKEN_RESERVATION <= row.tpm_cap &&
          n("project_tpm") + TOKEN_RESERVATION <= config.projectTpm
        );
      }),
    );
    return reply(ready.some(Boolean) ? "eligible" : "unavailable");
  } catch {
    return reply("unavailable");
  }
}
