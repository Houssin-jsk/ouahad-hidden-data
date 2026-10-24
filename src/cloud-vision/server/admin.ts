import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { Environment } from "./config";
import { providers, verifiedUntil } from "./config";
import { sameOrigin } from "./access";
import { configuredLedger } from "./database";
import { SharedLedger, DB_NOW } from "./ledger";
import {
  MODEL_CEILINGS,
  TOKEN_RESERVATION,
  validateGlobalPolicy,
  validateProviderChange,
  quotaDay,
} from "./policy";
import { boundedJson } from "./http";

const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const equal = (a: string, b: string) =>
  timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export const adminReply = (
  value: unknown,
  status = 200,
  headers: HeadersInit = {},
) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
function cookieOptions(env: Environment) {
  const secure = (
    env.CLOUD_AI_ORIGIN ?? "https://hidden-data.ouahad.space"
  ).startsWith("https:");
  if (!secure && env.VERCEL) throw Error("HTTPS required");
  return {
    name: secure ? "__Host-hd_admin" : "hd_admin_dev",
    attributes: `Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`,
  };
}
export async function adminSession(
  request: Request,
  env: Environment,
  ledger: SharedLedger,
  csrfRequired = false,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(env.CLOUD_AI_ADMIN_SECRET ?? "")) return null;
  const options = cookieOptions(env);
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(options.name + "="))
    ?.slice(options.name.length + 1);
  if (!cookie || !/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(cookie))
    return null;
  const secret = env.CLOUD_AI_ADMIN_SECRET!;
  const [token, signature] = cookie.split(".");
  const expected = createHmac("sha256", secret)
    .update("session:" + token)
    .digest("base64url");
  if (!equal(signature, expected)) return null;
  const csrf = createHmac("sha256", secret)
    .update("csrf:" + token)
    .digest("base64url");
  const rows = await ledger.query(
    `SELECT token_hash,csrf_hash FROM admin_sessions WHERE token_hash=? AND credential_hash=? AND expires>${DB_NOW}`,
    [hash(token), hash(secret)],
  );
  if (!rows.length || rows[0].csrf_hash !== hash(csrf)) return null;
  if (
    csrfRequired &&
    (!sameOrigin(request, env) ||
      !equal(request.headers.get("x-admin-csrf") ?? "", csrf))
  )
    return null;
  return { tokenHash: hash(token), csrf };
}
async function adminBody(request: Request) {
  if (request.headers.get("content-type") !== "application/json")
    throw Error("Use JSON");
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    throw Error("Request too large");
  const value = await boundedJson(
    new Response(request.body),
    4096,
    AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
  );
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid request");
  return value as Record<string, unknown>;
}
export async function handleAdminSession(
  request: Request,
  env: Environment,
  dependency?: SharedLedger,
) {
  if (
    request.method !== "POST" ||
    !sameOrigin(request, env) ||
    request.headers.get("x-admin-action") !== "session-v1"
  )
    return adminReply({ message: "Request denied." }, 403);
  try {
    const body = await adminBody(request);
    const logout = body.action === "logout";
    // The owner secret is a random 256-bit capability, not a low-entropy password.
    // Invalid guesses never spend database queries or expose configuration.
    if (
      !logout &&
      (Object.keys(body).join() !== "secret" ||
        typeof body.secret !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(body.secret) ||
        !/^[A-Za-z0-9_-]{43}$/.test(env.CLOUD_AI_ADMIN_SECRET ?? "") ||
        !equal(body.secret, env.CLOUD_AI_ADMIN_SECRET!))
    )
      return adminReply({ message: "Owner authentication failed." }, 401);
    const ledger = dependency ?? configuredLedger(env, request.signal);
    const options = cookieOptions(env);
    if (logout) {
      const session = await adminSession(request, env, ledger, true);
      if (!session)
        return adminReply({ message: "Owner authentication required." }, 401);
      await ledger.query("DELETE FROM admin_sessions WHERE token_hash=?", [
        session.tokenHash,
      ]);
      await ledger.query(
        `INSERT INTO admin_audit(created,actor,action,setting,outcome) VALUES(${DB_NOW},'owner','logout','session','applied')`,
        [],
      );
      return adminReply({ ok: true }, 200, {
        "Set-Cookie": `${options.name}=; ${options.attributes}; Max-Age=0`,
      });
    }
    const attempts = await ledger.query(
      `INSERT INTO admin_login_attempts(id,created) SELECT ?,${DB_NOW} WHERE (SELECT COUNT(*) FROM admin_login_attempts WHERE created>${DB_NOW}-60000)<10 RETURNING id`,
      [randomUUID()],
    );
    if (!attempts.length)
      return adminReply({ message: "Try owner sign-in again later." }, 429);
    const token = randomBytes(32).toString("base64url");
    const signature = createHmac("sha256", env.CLOUD_AI_ADMIN_SECRET!)
      .update("session:" + token)
      .digest("base64url");
    const csrf = createHmac("sha256", env.CLOUD_AI_ADMIN_SECRET!)
      .update("csrf:" + token)
      .digest("base64url");
    await ledger.query(
      `INSERT INTO admin_sessions(token_hash,csrf_hash,credential_hash,created,expires) VALUES(?,?,?,${DB_NOW},${DB_NOW}+3600000)`,
      [hash(token), hash(csrf), hash(env.CLOUD_AI_ADMIN_SECRET!)],
    );
    await ledger.query(
      `INSERT INTO admin_audit(created,actor,action,setting,outcome) VALUES(${DB_NOW},'owner','login','session','applied')`,
      [],
    );
    await ledger.query(
      `DELETE FROM admin_sessions WHERE expires<=${DB_NOW}`,
      [],
    );
    await ledger.query(
      `DELETE FROM admin_login_attempts WHERE created<${DB_NOW}-60000`,
      [],
    );
    return adminReply({ ok: true, csrf }, 200, {
      "Set-Cookie": `${options.name}=${token}.${signature}; ${options.attributes}; Max-Age=3600`,
    });
  } catch {
    return adminReply(
      {
        message:
          "Owner sign-in is unavailable until the verified shared database is configured.",
      },
      503,
    );
  }
}
export async function adminSnapshot(ledger: SharedLedger, env: Environment) {
  const now = await ledger.now();
  const day = quotaDay(now, "utc");
  const [
    settings,
    models,
    overview,
    logs,
    audit,
    counters,
    cooldowns,
    rolling,
  ] = await Promise.all([
    ledger.settings(),
    ledger.models(),
    ledger.query(
      `SELECT (SELECT COUNT(*) FROM cloud_jobs WHERE created>=?) AS accepted_actions,(SELECT COUNT(DISTINCT client) FROM cloud_jobs WHERE created>=?) AS participants,(SELECT COUNT(*) FROM cloud_jobs WHERE created>?) AS accepted_minute,(SELECT COUNT(*) FROM cloud_jobs WHERE released=0 AND lease_until>?) AS active_actions,COUNT(*) AS provider_attempts,COALESCE(SUM(outcome='completed'),0) AS completed,COALESCE(SUM(outcome IN ('failed','uncertain')),0) AS failed,COALESCE(SUM(outcome='uncertain' OR (outcome='reserved' AND lease_until<=?)),0) AS uncertain,COALESCE(SUM(reserved_tokens),0) AS reserved_tokens,COALESCE(SUM(actual_tokens),0) AS reported_tokens,COALESCE(SUM(fallback),0) AS fallbacks,(SELECT COUNT(*) FROM request_logs WHERE outcome='reserved' AND lease_until>?) AS active FROM request_logs WHERE started>=?`,
      [day.start, day.start, now - 60000, now, now, now, day.start],
    ),
    ledger.query(
      "SELECT r.id,r.started,r.model_key,r.provider,r.outcome,r.error_category,r.duration_ms,r.reserved_tokens,r.actual_tokens,r.actual_neurons,r.fallback,CASE WHEN r.fallback=1 THEN (SELECT COALESCE(prev.error_category,prev.outcome) FROM request_logs prev WHERE prev.action_id=r.action_id AND prev.rowid<r.rowid ORDER BY prev.rowid DESC LIMIT 1) END AS fallback_reason FROM request_logs r ORDER BY r.started DESC,r.id DESC LIMIT 50",
      [],
    ),
    ledger.query(
      "SELECT created,actor,action,setting,old_value,new_value,outcome FROM admin_audit ORDER BY id DESC LIMIT 50",
      [],
    ),
    ledger.query(
      "SELECT * FROM usage_counters WHERE window_type='day' AND window_end>?",
      [now],
    ),
    ledger.query("SELECT provider,until_time FROM cloud_cooldowns", []),
    ledger.query(
      "SELECT model_key AS scope,COUNT(*) AS attempts,SUM(MAX(reserved_tokens,COALESCE(actual_tokens,0))) AS tokens FROM request_logs WHERE started>? GROUP BY model_key UNION ALL SELECT 'project:'||provider AS scope,COUNT(*) AS attempts,SUM(MAX(reserved_tokens,COALESCE(actual_tokens,0))) AS tokens FROM request_logs WHERE started>? GROUP BY provider",
      [now - 60000, now - 60000],
    ),
  ]);
  const runtime = providers(env, "MA", now);
  const list = models.map((row) => {
    const adapter = runtime.find((a) => a.model === row.model_key);
    const usage = counters.find((c) => c.scope === row.model_key) ?? {};
    const project =
      counters.find((c) => c.scope === "project:" + row.provider) ?? {};
    const minute = rolling.find((c) => c.scope === row.model_key) ?? {};
    const projectMinute =
      rolling.find((c) => c.scope === "project:" + row.provider) ?? {};
    const applicable = cooldowns.filter(
      (c) => c.provider === row.model_key || c.provider === row.provider,
    );
    const cooldown =
      applicable.find((c) => c.until_time === null) ??
      applicable.sort((a, b) => Number(b.until_time) - Number(a.until_time))[0];
    const suspended = Boolean(
      cooldown &&
      (cooldown.until_time === null || Number(cooldown.until_time) > now),
    );
    const eligible = Boolean(
      adapter?.eligibility.enabled &&
      row.provider !== "nvidia" &&
      MODEL_CEILINGS[row.model_key]?.daily > 0,
    );
    const used = Number(usage.reserved_requests ?? 0);
    const capacityAvailable =
      used < row.daily_cap &&
      Number(minute.attempts ?? 0) < row.rpm_cap &&
      Number(minute.tokens ?? 0) + TOKEN_RESERVATION <= row.tpm_cap &&
      Number(project.reserved_requests ?? 0) < settings.config.projectDaily &&
      Number(project.reserved_tokens ?? 0) + TOKEN_RESERVATION <=
        settings.config.projectDailyTokens &&
      Number(projectMinute.attempts ?? 0) < settings.config.projectRpm &&
      Number(projectMinute.tokens ?? 0) + TOKEN_RESERVATION <=
        settings.config.projectTpm &&
      Number(overview[0]?.accepted_actions ?? 0) <
        settings.config.dailyActions &&
      Number(overview[0]?.accepted_minute ?? 0) <
        settings.config.minuteActions &&
      Number(overview[0]?.active_actions ?? 0) < settings.config.concurrency &&
      Number(overview[0]?.active ?? 0) < settings.config.concurrency;
    const dailyExhausted =
      used >= row.daily_cap ||
      Number(project.reserved_requests ?? 0) >= settings.config.projectDaily ||
      Number(project.reserved_tokens ?? 0) + TOKEN_RESERVATION >
        settings.config.projectDailyTokens ||
      Number(overview[0]?.accepted_actions ?? 0) >=
        settings.config.dailyActions;
    const busy =
      Number(overview[0]?.active_actions ?? 0) >= settings.config.concurrency ||
      Number(overview[0]?.active ?? 0) >= settings.config.concurrency;
    const status = !eligible
      ? "Unqualified"
      : row.enabled !== 1
        ? "Disabled"
        : row.eligibility !== "eligible"
          ? "Unqualified"
          : settings.config.kill
            ? "Paused by owner"
            : suspended
              ? "Temporarily unavailable"
              : dailyExhausted
                ? "Quota exhausted"
                : busy
                  ? "Concurrency busy"
                  : !capacityAvailable
                    ? "Minute capacity limited"
                    : "Active";
    const statusReason =
      status === "Unqualified"
        ? (adapter?.eligibility.reason ?? "Model is not qualified.")
        : status === "Disabled"
          ? "Owner activation is off."
          : status === "Paused by owner"
            ? "Global emergency stop is on."
            : suspended
              ? cooldown?.until_time === null
                ? "Operator review is required before reuse."
                : "A provider cooldown is still active."
              : dailyExhausted
                ? "A model, shared-project or global daily budget is exhausted; reservations remain charged."
                : busy
                  ? "The shared concurrency slots are occupied."
                  : !capacityAvailable
                    ? "A rolling request or token limit is reached; retry only when capacity returns."
                    : "Qualified, enabled and within the tracked shared capacity.";
    return {
      ...row,
      actor: undefined,
      eligible,
      status,
      statusReason,
      effectiveEnabled:
        eligible &&
        row.eligibility === "eligible" &&
        row.enabled === 1 &&
        !settings.config.kill &&
        !suspended &&
        capacityAvailable,
      capacityAvailable,
      minuteAttempts: Number(minute.attempts ?? 0),
      minuteReservedTokens: Number(minute.tokens ?? 0),
      reason: adapter?.eligibility.reason ?? "Not registered",
      used,
      remainingInternal: Math.max(0, row.daily_cap - used),
      reservedTokens: Number(usage.reserved_tokens ?? 0),
      actualTokens: Number(usage.actual_tokens ?? 0),
      actualNeurons: Number(usage.actual_neurons ?? 0),
      nextReset: quotaDay(
        now,
        row.reset_policy === "pacific" ? "pacific" : "utc",
      ).end,
      cooldownUntil: cooldown?.until_time ?? (suspended ? null : undefined),
      lastError:
        logs.find((l) => l.model_key === row.model_key && l.error_category)
          ?.error_category ?? null,
      ceiling: MODEL_CEILINGS[row.model_key],
    };
  });
  return {
    settings,
    models: list,
    overview: overview[0],
    logs,
    audit,
    now,
    database: { status: "Connected", checkedAt: now },
    primary: list.find((m) => m.effectiveEnabled)?.model_key ?? null,
    publicReleaseVerified: verifiedUntil(env.CLOUD_AI_RELEASE_READY_UNTIL, now),
    providerBalance:
      "Unknown: internal remaining allocation is not a provider balance.",
  };
}
export async function handleAdmin(
  request: Request,
  env: Environment,
  dependency?: SharedLedger,
) {
  if (!["GET", "POST"].includes(request.method))
    return adminReply({ message: "Method not allowed." }, 405, {
      Allow: "GET, POST",
    });
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return adminReply({ message: "Request denied." }, 403);
  // Fail unauthorized access before constructing a DB client where possible.
  if (
    !request.headers.get("cookie") ||
    !/^[A-Za-z0-9_-]{43}$/.test(env.CLOUD_AI_ADMIN_SECRET ?? "")
  )
    return adminReply({ message: "Owner authentication required." }, 401);
  try {
    const ledger = dependency ?? configuredLedger(env, request.signal);
    const session = await adminSession(
      request,
      env,
      ledger,
      request.method === "POST",
    );
    if (!session)
      return adminReply({ message: "Owner authentication required." }, 401);
    if (request.method === "GET")
      return adminReply({
        ...(await adminSnapshot(ledger, env)),
        csrf: session.csrf,
      });
    const body = await adminBody(request);
    if (body.action === "global") {
      if (
        Object.keys(body).sort().join() !==
          ["action", "config", "revision"].sort().join() ||
        !Number.isSafeInteger(body.revision)
      )
        return adminReply({ message: "Invalid settings." }, 400);
      const config = validateGlobalPolicy(body.config);
      if (!config.kill) {
        const candidates = providers(env, "MA");
        const rows = await ledger.models();
        if (
          !rows.some(
            (p) =>
              p.enabled === 1 &&
              p.eligibility === "eligible" &&
              candidates.some(
                (a) => a.model === p.model_key && a.eligibility.enabled,
              ) &&
              MODEL_CEILINGS[p.model_key].daily > 0,
          )
        )
          return adminReply(
            {
              message:
                "No verified free model is eligible. Emergency stop remains active.",
            },
            409,
          );
      }
      const rows = await ledger.query(
        `UPDATE ai_settings SET config=?,revision=revision+1,actor='owner',updated_at=${DB_NOW} WHERE id=1 AND revision=? RETURNING revision`,
        [JSON.stringify(config), Number(body.revision)],
      );
      if (!rows.length)
        return adminReply(
          { message: "Settings changed. Reload before saving." },
          409,
        );
    } else if (body.action === "provider") {
      if (
        Object.keys(body).sort().join() !== ["action", "change"].sort().join()
      )
        return adminReply({ message: "Invalid settings." }, 400);
      const change = validateProviderChange(body.change);
      const adapter = providers(env, "MA").find(
        (a) => a.model === change.model,
      );
      if (change.enabled && !adapter?.eligibility.enabled)
        return adminReply(
          {
            message:
              "Free account eligibility and exact-model vision verification are required.",
          },
          409,
        );
      const rows = await ledger.query(
        `UPDATE providers SET enabled=?,priority=?,daily_cap=?,rpm_cap=?,tpm_cap=?,eligibility=?,verified_at=CASE WHEN ?=1 THEN ${DB_NOW} ELSE verified_at END,revision=revision+1,actor='owner',updated_at=${DB_NOW} WHERE model_key=? AND revision=? RETURNING revision`,
        [
          change.enabled ? 1 : 0,
          change.priority,
          change.daily,
          change.rpm,
          change.tpm,
          change.enabled ? "eligible" : "unverified",
          change.enabled ? 1 : 0,
          change.model,
          change.revision,
        ],
      );
      if (!rows.length)
        return adminReply(
          { message: "Model settings changed. Reload before saving." },
          409,
        );
    } else
      return adminReply({ message: "Unknown administrative action." }, 400);
    return adminReply({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      /Invalid|ceiling|qualified/.test(error.message)
    )
      return adminReply(
        { message: "Settings exceed the safe production policy." },
        400,
      );
    return adminReply(
      {
        message:
          "The shared control center is unavailable. Inference remains protected.",
      },
      503,
    );
  }
}
