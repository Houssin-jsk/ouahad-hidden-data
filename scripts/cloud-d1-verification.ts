// Remote verification only; never imported by the app or used to call a model.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  LEDGER_SCHEMA,
  SharedLedger,
  DB_NOW,
} from "../src/cloud-vision/server/ledger";
import {
  DEFAULT_POLICY,
  MODEL_KEYS,
  quotaDay,
} from "../src/cloud-vision/server/policy";
import {
  handleAdmin,
  handleAdminSession,
} from "../src/cloud-vision/server/admin";
import {
  ProviderFailure,
  type ProviderAdapter,
} from "../src/cloud-vision/server/types";
import type { Environment } from "../src/cloud-vision/server/config";

export async function verifyRemoteD1(real: SharedLedger, env: Environment) {
  const before = await real.settings();
  const attemptsBefore = await real.query(
    "SELECT COUNT(*) AS n FROM request_logs",
    [],
  );
  const models = await real.models();
  if (!before.config.kill || models.some((m) => m.enabled))
    throw Error(
      "Verification failed: real database must remain stopped with all models disabled.",
    );
  // Exact application schema/SQL in a separate, unmistakable verification namespace.
  // Keep the small fixture tables as evidence: no DROP or production-counter reset.
  const prefix =
    "cloud_verify_" + randomUUID().replaceAll("-", "").slice(0, 12) + "_";
  const objectNames = LEDGER_SCHEMA.flatMap((sql) => {
    const match = sql.match(
      /^CREATE (?:UNIQUE )?(?:TABLE|INDEX|TRIGGER) (?:IF NOT EXISTS )?(\w+)/,
    );
    return match ? [match[1]] : [];
  });
  const pattern = new RegExp("\\b(" + objectNames.join("|") + ")\\b", "g");
  const rewrite = (sql: string) =>
    sql.replace(pattern, (name) => prefix + name);
  for (const sql of LEDGER_SCHEMA) await real.query(rewrite(sql), []);
  let clock: number | undefined;
  const fixture = new SharedLedger((sql, params) =>
    real.query(
      rewrite(
        clock === undefined ? sql : sql.replaceAll(DB_NOW, String(clock)),
      ),
      params,
    ),
  );
  await fixture.query(
    "UPDATE ai_settings SET config=?,actor='verification' WHERE id=1",
    [JSON.stringify({ ...DEFAULT_POLICY, kill: false })],
  );
  await fixture.query(
    "UPDATE providers SET enabled=1,eligibility='eligible',daily_cap=1,actor='verification' WHERE provider='gemini'",
    [],
  );
  const adapter = (model: string): ProviderAdapter => ({
    id: "gemini",
    model,
    priority: 1,
    eligibility: {
      enabled: true,
      reason: "Isolated remote SQL fixture, no provider access",
    },
    constraints: {
      mime: "image/jpeg",
      maxBytes: 786432,
      maxSide: 1024,
      outputTokens: 480,
    },
    run: async () => {
      throw Error("Verification failed: provider invocation forbidden.");
    },
  });
  const actions = Array.from({ length: 8 }, () => randomUUID());
  const now = await fixture.now();
  // Seed action leases only inside the fixture so eight callers exercise the same
  // production reservation statement without the earlier action-concurrency gate.
  for (const id of actions)
    await fixture.query(
      "INSERT INTO cloud_jobs(id,client,created,lease_until,request_key) VALUES(?,?,?,?,?)",
      [id, randomUUID(), now, now + 120000, randomUUID()],
    );
  const reserved = await Promise.all(
    actions.map((action) => fixture.reserve(action, adapter(MODEL_KEYS[0]))),
  );
  const winners = reserved.filter((id) => id !== null);
  assert.equal(
    winners.length,
    1,
    "Verification failed: atomic model cap must admit exactly one of eight.",
  );
  await fixture.settle(winners[0], undefined, new ProviderFailure("timeout"));
  for (const action of actions) await fixture.release(action);
  const day = quotaDay(now, "pacific");
  const counter = await fixture.query(
    "SELECT reserved_requests,failed_attempts,reserved_tokens FROM usage_counters WHERE scope=? AND window_type='day' AND window_start=?",
    [MODEL_KEYS[0], day.start],
  );
  assert.equal(counter[0]?.reserved_requests, 1);
  assert.equal(counter[0]?.failed_attempts, 1);
  assert.equal(counter[0]?.reserved_tokens, 4096);
  const persisted = await real.query(
    rewrite("SELECT COUNT(*) AS n FROM request_logs WHERE outcome='uncertain'"),
    [],
  );
  assert.equal(persisted[0]?.n, 1);
  clock = now + 61000;
  async function action() {
    const id = randomUUID();
    assert.equal(await fixture.admit(randomUUID(), id), true);
    return id;
  }
  const fallbackAction = await action();
  assert.equal(
    await fixture.reserve(fallbackAction, adapter(MODEL_KEYS[0])),
    null,
  );
  const secondary = await fixture.reserve(
    fallbackAction,
    adapter(MODEL_KEYS[1]),
  );
  assert(secondary);
  const response = {
    observations: {
      description: "Synthetic SQL fixture only.",
      observations: [],
      limitations: ["No image or provider call."],
    },
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  };
  await fixture.settle(secondary, response);
  await fixture.release(fallbackAction);
  await fixture.query("UPDATE providers SET daily_cap=2 WHERE model_key=?", [
    MODEL_KEYS[0],
  ]);
  await fixture.set(MODEL_KEYS[0], clock + 60000);
  const cooling = await action();
  assert.equal(await fixture.reserve(cooling, adapter(MODEL_KEYS[0])), null);
  await fixture.release(cooling);
  clock += 61000;
  const recovered = await action();
  const recoveredAttempt = await fixture.reserve(
    recovered,
    adapter(MODEL_KEYS[0]),
  );
  assert(recoveredAttempt);
  await fixture.settle(recoveredAttempt, response);
  await fixture.release(recovered);
  clock = quotaDay(clock, "pacific").end + 1000;
  const nextDay = await action();
  const nextAttempt = await fixture.reserve(nextDay, adapter(MODEL_KEYS[0]));
  assert(nextAttempt);
  await fixture.settle(nextAttempt, response);
  await fixture.release(nextDay);
  const preservedDays = await fixture.query(
    "SELECT COUNT(*) AS n FROM usage_counters WHERE scope=? AND window_type='day'",
    [MODEL_KEYS[0]],
  );
  assert.equal(preservedDays[0]?.n, 2);
  // Actual owner auth and safe same-value persistence on the real application
  // tables. This leaves kill=true, every provider off and quotas unchanged.
  const origin = env.CLOUD_AI_ORIGIN ?? "https://hidden-data.ouahad.space";
  const login = await handleAdminSession(
    new Request(origin + "/api/admin/ai/session", {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        "x-admin-action": "session-v1",
      },
      body: JSON.stringify({ secret: env.CLOUD_AI_ADMIN_SECRET }),
    }),
    env,
    real,
  );
  assert.equal(login.status, 200, "Verification failed: remote owner session.");
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const snapshot = await handleAdmin(
    new Request(origin + "/api/admin/ai", { headers: { cookie } }),
    env,
    real,
  );
  assert.equal(snapshot.status, 200);
  const state = await snapshot.json();
  const save = await handleAdmin(
    new Request(origin + "/api/admin/ai", {
      method: "POST",
      headers: {
        origin,
        cookie,
        "content-type": "application/json",
        "x-admin-csrf": state.csrf,
      },
      body: JSON.stringify({
        action: "global",
        revision: state.settings.revision,
        config: state.settings.config,
      }),
    }),
    env,
    real,
  );
  assert.equal(
    save.status,
    200,
    "Verification failed: persisted owner settings.",
  );
  const after = await real.settings();
  assert.deepEqual(after.config, before.config);
  assert.equal(after.revision, before.revision + 1);
  const audited = await real.query(
    "SELECT COUNT(*) AS n FROM admin_audit WHERE actor='owner' AND setting='global'",
    [],
  );
  assert(Number(audited[0]?.n) >= 1);
  const logout = await handleAdminSession(
    new Request(origin + "/api/admin/ai/session", {
      method: "POST",
      headers: {
        origin,
        cookie,
        "content-type": "application/json",
        "x-admin-action": "session-v1",
        "x-admin-csrf": state.csrf,
      },
      body: JSON.stringify({ action: "logout" }),
    }),
    env,
    real,
  );
  assert.equal(logout.status, 200);
  const productionAttempts = await real.query(
    "SELECT COUNT(*) AS n FROM request_logs",
    [],
  );
  assert.equal(productionAttempts[0]?.n, attemptsBefore[0]?.n);
  const evidence = {
    at: new Date().toISOString(),
    database: "Cloudflare D1",
    remote: true,
    isolatedNamespace: prefix,
    concurrentReservations: 8,
    admitted: 1,
    counterPersisted: true,
    uncertainNotRefunded: true,
    secondaryAfterExhaustion: true,
    cooldownExpiry: true,
    pacificDayReset: true,
    resetClock: "controlled fixture SQL clock; not waiting for actual midnight",
    ownerSessionPersisted: true,
    ownerConfigPersistedAndAudited: true,
    productionPolicyUnchanged: true,
    productionInferenceAttempts: productionAttempts[0]?.n,
    productionAttemptsUnchanged: true,
    providerCalls: 0,
    tablesDropped: 0,
  };
  const path = "docs/phase-03/evidence/cloud-vision.json";
  const prior = JSON.parse(await readFile(path, "utf8"));
  prior.remoteD1VerificationRuns = [
    ...(prior.remoteD1VerificationRuns ?? []),
    evidence,
  ];
  await writeFile(path, JSON.stringify(prior, null, 2) + "\n");
  console.log(JSON.stringify(evidence));
}
