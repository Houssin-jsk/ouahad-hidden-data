import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LEDGER_SCHEMA, SharedLedger } from "../src/cloud-vision/server/ledger";
import {
  DEFAULT_POLICY,
  MODEL_KEYS,
  TOKEN_RESERVATION,
  quotaDay,
  validateGlobalPolicy,
  validateProviderChange,
} from "../src/cloud-vision/server/policy";
import {
  handleAdmin,
  handleAdminSession,
  adminSnapshot,
} from "../src/cloud-vision/server/admin";
import { routeVision } from "../src/cloud-vision/server/router";
import {
  ProviderFailure,
  type ProviderAdapter,
} from "../src/cloud-vision/server/types";
import { classifyHttp } from "../src/cloud-vision/server/http";
import {
  d1Credentials,
  configuredLedger,
} from "../src/cloud-vision/server/database";
test("D1 owner aliases work, conflicting credentials reject, and inference still requires free verification", () => {
  const legacy = {
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
    CLOUD_AI_D1_DATABASE_ID: "00000000-0000-0000-0000-000000000000",
    CLOUD_AI_D1_API_TOKEN: "legacy-test-token",
  };
  const owner = {
    CLOUDFLARE_ACCOUNT_ID: legacy.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_D1_DATABASE_ID: legacy.CLOUD_AI_D1_DATABASE_ID,
    CLOUDFLARE_D1_API_TOKEN: legacy.CLOUD_AI_D1_API_TOKEN,
  };
  assert.deepEqual(d1Credentials(owner), d1Credentials(legacy));
  assert.deepEqual(
    d1Credentials({ ...legacy, ...owner }),
    d1Credentials(owner),
  );
  assert.throws(
    () =>
      d1Credentials({
        ...legacy,
        ...owner,
        CLOUD_AI_D1_API_TOKEN: "another-test-token",
      }),
    /Conflicting/,
  );
  assert.throws(
    () =>
      d1Credentials({
        ...legacy,
        ...owner,
        CLOUD_AI_D1_DATABASE_ID: "10000000-0000-0000-0000-000000000000",
      }),
    /Conflicting/,
  );
  assert.throws(
    () => d1Credentials({ CLOUDFLARE_API_TOKEN: "not-a-d1-credential" }),
    /required/,
  );
  assert.throws(
    () => configuredLedger(owner, new AbortController().signal),
    /Verified D1/,
  );
});
const output = {
  description: "A colored shape.",
  observations: [],
  limitations: ["AI interpretation may contain mistakes."],
};
const image = {
  bytes: new Uint8Array([1]),
  mime: "image/jpeg" as const,
  width: 10,
  height: 10,
};
function adapter(
  model: string = MODEL_KEYS[0],
  calls: string[] = [],
): ProviderAdapter {
  const id = model.startsWith("gemini")
    ? "gemini"
    : model.startsWith("@cf")
      ? "cloudflare"
      : "nvidia";
  return {
    id,
    model,
    priority: MODEL_KEYS.indexOf(model as (typeof MODEL_KEYS)[number]) + 1,
    eligibility: { enabled: true, reason: "mock test" },
    constraints: {
      mime: "image/jpeg",
      maxBytes: 786432,
      maxSide: 1024,
      outputTokens: 480,
    },
    run: async () => {
      calls.push(model);
      return {
        observations: output,
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      };
    },
  };
}
function fixture(file = ":memory:") {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON");
  if (file !== ":memory:") db.exec("PRAGMA journal_mode=WAL");
  LEDGER_SCHEMA.forEach((sql) => db.exec(sql));
  let clock = Date.now();
  db.function("strftime", { varargs: true }, () =>
    String(Math.floor(clock / 1000)),
  );
  db.prepare("UPDATE ai_settings SET config=?").run(
    JSON.stringify({ ...DEFAULT_POLICY, kill: false }),
  );
  db.exec(
    "UPDATE providers SET enabled=1,eligibility='eligible' WHERE provider='gemini'",
  );
  const store = new SharedLedger(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
  );
  return {
    db,
    store,
    setTime: (value: number) => {
      clock = value;
    },
    action: async (client: string = randomUUID()) => {
      const id = randomUUID();
      assert.equal(await store.admit(client, id), true);
      return id;
    },
  };
}
test("two visitors share one model quota and primary exhaustion routes to Gemini 3.1", async () => {
  const f = fixture();
  try {
    f.db
      .prepare("UPDATE providers SET daily_cap=1 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    const calls: string[] = [];
    const models = [
      adapter(MODEL_KEYS[0], calls),
      adapter(MODEL_KEYS[1], calls),
      adapter(MODEL_KEYS[3], calls),
    ];
    const a = await f.action("A"),
      b = await f.action("B");
    assert.equal(
      (
        await routeVision(
          models,
          image,
          f.store.routing(a),
          new AbortController().signal,
        )
      ).model,
      MODEL_KEYS[0],
    );
    assert.equal(
      (
        await routeVision(
          models,
          image,
          f.store.routing(b),
          new AbortController().signal,
        )
      ).model,
      MODEL_KEYS[1],
    );
    assert.deepEqual(calls, [MODEL_KEYS[0], MODEL_KEYS[1]]);
    await f.store.release(a);
    const snapshot = await adminSnapshot(f.store, adminEnv());
    assert.equal(snapshot.primary, MODEL_KEYS[1]);
    assert.equal(snapshot.models[0].effectiveEnabled, false);
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM request_logs").get()?.n,
      2,
    );
  } finally {
    f.db.close();
  }
});
test("both Gemini quotas exhausted never spend disabled Cloudflare or NVIDIA allocation", async () => {
  const f = fixture();
  try {
    f.db.exec("UPDATE providers SET daily_cap=1 WHERE provider='gemini'");
    const calls: string[] = [];
    const models = MODEL_KEYS.map((key) => adapter(key, calls));
    const a = await f.action("A");
    assert.equal(
      (
        await routeVision(
          models,
          image,
          f.store.routing(a),
          new AbortController().signal,
        )
      ).status,
      "available",
    );
    await f.store.release(a);
    const b = await f.action("B");
    assert.equal(
      (
        await routeVision(
          models,
          image,
          f.store.routing(b),
          new AbortController().signal,
        )
      ).model,
      MODEL_KEYS[1],
    );
    await f.store.release(b);
    const c = await f.action("C");
    assert.equal(
      (
        await routeVision(
          models,
          image,
          f.store.routing(c),
          new AbortController().signal,
        )
      ).status,
      "unavailable",
    );
    assert.deepEqual(calls, [MODEL_KEYS[0], MODEL_KEYS[1]]);
  } finally {
    f.db.close();
  }
});
for (const setting of ["projectDaily", "projectRpm"] as const)
  test(`shared ${setting} prevents treating Gemini models as independent project pools`, async () => {
    const f = fixture();
    try {
      const policy = { ...DEFAULT_POLICY, kill: false, [setting]: 1 };
      f.db
        .prepare("UPDATE ai_settings SET config=?")
        .run(JSON.stringify(policy));
      const a = await f.action("A"),
        b = await f.action("B");
      const reservation = await f.store.reserve(a, adapter());
      assert(reservation);
      await f.store.settle(reservation, { observations: output });
      assert.equal(await f.store.reserve(b, adapter(MODEL_KEYS[1])), null);
    } finally {
      f.db.close();
    }
  });
test("rolling TPM includes conservative reservations even after failures; no token refund", async () => {
  const f = fixture();
  try {
    f.db
      .prepare("UPDATE providers SET tpm_cap=? WHERE model_key=?")
      .run(TOKEN_RESERVATION, MODEL_KEYS[0]);
    const a = await f.action("A"),
      b = await f.action("B");
    const reservation = await f.store.reserve(a, adapter());
    assert(reservation);
    await f.store.settle(
      reservation,
      undefined,
      new ProviderFailure("timeout"),
    );
    assert.equal(await f.store.reserve(b, adapter()), null);
    const row = f.db
      .prepare(
        "SELECT * FROM usage_counters WHERE scope=? AND window_type='day'",
      )
      .get(MODEL_KEYS[0])!;
    assert.equal(row.reserved_requests, 1);
    assert.equal(row.failed_attempts, 1);
    assert.equal(row.reserved_tokens, TOKEN_RESERVATION);
    assert.equal(
      f.db.prepare("SELECT outcome FROM request_logs").get()?.outcome,
      "uncertain",
    );
  } finally {
    f.db.close();
  }
});
test("project TPM is shared across models and tokens above reservation force an audited global stop", async () => {
  const f = fixture();
  try {
    f.db.prepare("UPDATE ai_settings SET config=?").run(
      JSON.stringify({
        ...DEFAULT_POLICY,
        kill: false,
        projectTpm: TOKEN_RESERVATION,
      }),
    );
    const a = await f.action("A"),
      b = await f.action("B");
    const reservation = await f.store.reserve(a, adapter());
    assert(reservation);
    assert.equal(await f.store.reserve(b, adapter(MODEL_KEYS[1])), null);
    await f.store.settle(reservation, {
      observations: output,
      usage: { totalTokens: TOKEN_RESERVATION + 1 },
    });
    assert.equal((await f.store.settings()).config.kill, true);
    assert.equal(
      f.db
        .prepare(
          "SELECT COUNT(*) AS n FROM admin_audit WHERE actor='safety-bound'",
        )
        .get()?.n,
      1,
    );
    assert.equal(await f.store.reserve(b, adapter(MODEL_KEYS[1])), null);
  } finally {
    f.db.close();
  }
});
test("duplicate submissions, duplicate model attempts and a fourth attempt are denied atomically", async () => {
  const f = fixture();
  try {
    const key = randomUUID(),
      a = randomUUID();
    assert(await f.store.admit("A", a, undefined, key));
    assert.equal(await f.store.admit("A", randomUUID(), undefined, key), false);
    const r = await f.store.reserve(a, adapter());
    assert(r);
    assert.equal(await f.store.reserve(a, adapter()), null);
    await f.store.settle(r, { observations: output });
    // Three-attempt defense remains in SQL even if a future router is buggy.
    f.db
      .prepare(
        "INSERT INTO request_logs(id,action_id,model_key,provider,started,lease_until,reserved_tokens,fallback,minute_start,day_start,day_end) SELECT ?,action_id,?,provider,started,lease_until,reserved_tokens,1,minute_start,day_start,day_end FROM request_logs WHERE id=?",
      )
      .run(randomUUID(), MODEL_KEYS[2], r);
    f.db
      .prepare(
        "INSERT INTO request_logs(id,action_id,model_key,provider,started,lease_until,reserved_tokens,fallback,minute_start,day_start,day_end) SELECT ?,action_id,?,provider,started,lease_until,reserved_tokens,1,minute_start,day_start,day_end FROM request_logs WHERE id=?",
      )
      .run(randomUUID(), MODEL_KEYS[3], r);
    assert.equal(await f.store.reserve(a, adapter(MODEL_KEYS[1])), null);
  } finally {
    f.db.close();
  }
});
test("Cloudflare Neurons cannot become invented image-request capacity or paid allocation", async () => {
  const f = fixture();
  try {
    f.db
      .prepare(
        "UPDATE providers SET enabled=1,eligibility='eligible',daily_cap=100,rpm_cap=10,tpm_cap=200000,neuron_cap=10000 WHERE model_key=?",
      )
      .run(MODEL_KEYS[2]);
    assert.equal(
      await f.store.reserve(await f.action(), adapter(MODEL_KEYS[2])),
      null,
    );
    assert.throws(() =>
      validateProviderChange({
        model: MODEL_KEYS[2],
        enabled: true,
        priority: 3,
        daily: 1,
        rpm: 1,
        tpm: 4096,
        revision: 0,
      }),
    );
  } finally {
    f.db.close();
  }
});
test("Pacific day windows handle DST, quota restoration and UTC visitor days independently", async () => {
  const spring = quotaDay(Date.parse("2026-03-08T18:00:00Z"), "pacific");
  assert.equal(spring.end - spring.start, 23 * 3600000);
  const fall = quotaDay(Date.parse("2026-11-01T18:00:00Z"), "pacific");
  assert.equal(fall.end - fall.start, 25 * 3600000);
  const f = fixture();
  try {
    const before = Date.parse("2026-10-23T06:59:59Z");
    f.setTime(before);
    f.db
      .prepare("UPDATE providers SET daily_cap=1 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    const a = await f.action("A");
    const r = await f.store.reserve(a, adapter());
    assert(r);
    await f.store.settle(r, { observations: output });
    await f.store.release(a);
    f.setTime(before + 61000);
    const b = await f.action("B");
    assert(await f.store.reserve(b, adapter()));
  } finally {
    f.db.close();
  }
});
test("daily exhaustion versus minute throttling sets documented reset versus operational backoff", async () => {
  assert.equal(
    classifyHttp(new Response(null, { status: 429 }), {
      error: { message: "GenerateRequestsPerDayPerProjectPerModel quota" },
    }).quotaWindow,
    "day",
  );
  assert.equal(
    classifyHttp(new Response(null, { status: 429 }), {
      error: { message: "GenerateRequestsPerMinutePerProjectPerModel quota" },
    }).quotaWindow,
    "minute",
  );
  const f = fixture();
  try {
    const a = await f.action();
    const fail = adapter();
    fail.run = async () => {
      throw new ProviderFailure("quota_exhausted", undefined, "day");
    };
    await routeVision(
      [fail],
      image,
      f.store.routing(a),
      new AbortController().signal,
    );
    assert.equal(
      await f.store.get(MODEL_KEYS[0]),
      quotaDay(await f.store.now(), "pacific").end,
    );
  } finally {
    f.db.close();
  }
});
test("database failure prevents any provider call", async () => {
  const store = new SharedLedger(async () => {
    throw Error("database down");
  });
  let calls = 0;
  const a = adapter();
  a.run = async () => {
    calls++;
    return { observations: output };
  };
  await assert.rejects(
    routeVision(
      [a],
      image,
      store.routing("test"),
      new AbortController().signal,
    ),
  );
  assert.equal(calls, 0);
});
test("concurrent reservations through separate worker connections cannot overshoot model or global concurrency caps", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "hidden-data-central-"));
  const database = path.join(directory, "quota.sqlite");
  const f = fixture(database);
  try {
    f.db
      .prepare("UPDATE providers SET daily_cap=1 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    const now = Date.now();
    const actions = Array.from({ length: 8 }, () => randomUUID());
    for (const action of actions)
      f.db
        .prepare(
          "INSERT INTO cloud_jobs(id,client,created,lease_until,request_key) VALUES(?,?,?,?,?)",
        )
        .run(action, action, now, now + 120000, action);
    const source = `const {parentPort,workerData}=require('node:worker_threads');require('tsx/cjs');const {DatabaseSync}=require('node:sqlite');const {SharedLedger}=require(workerData.module);const db=new DatabaseSync(workerData.database);db.exec('PRAGMA busy_timeout=5000');const ledger=new SharedLedger(async(sql,params)=>db.prepare(sql).all(...params));ledger.reserve(workerData.action,workerData.adapter).then(id=>{db.close();parentPort.postMessage({id});}).catch(()=>{db.close();parentPort.postMessage({error:true});});`;
    const run = () =>
      Promise.all(
        actions.map(
          (action) =>
            new Promise<{ id?: string; error?: boolean }>((resolve, reject) => {
              const worker = new Worker(source, {
                eval: true,
                workerData: {
                  database,
                  module: path.resolve("src/cloud-vision/server/ledger.ts"),
                  action,
                  adapter: { ...adapter(), run: undefined },
                },
              });
              worker.once("message", resolve);
              worker.once("error", reject);
            }),
        ),
      );
    const first = await run();
    assert.equal(first.filter((r) => r.error).length, 0);
    assert.equal(first.filter((r) => r.id).length, 1);
    // Raise the model cap; existing reservation still consumes one of two slots.
    f.db
      .prepare("UPDATE providers SET daily_cap=300 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    const second = await run();
    assert.equal(second.filter((r) => r.error).length, 0);
    assert.equal(second.filter((r) => r.id).length, 1);
    assert.equal(
      f.db
        .prepare(
          "SELECT COUNT(*) AS n FROM request_logs WHERE outcome='reserved'",
        )
        .get()?.n,
      2,
    );
  } finally {
    f.db.close();
    if (
      !path
        .resolve(directory)
        .startsWith(path.resolve(tmpdir()) + path.sep + "hidden-data-central-")
    )
      throw Error("Unsafe test cleanup");
    await rm(directory, { recursive: true, force: true });
  }
});
const adminSecret = "S".repeat(43);
const adminEnv = () => ({
  CLOUD_AI_ADMIN_SECRET: adminSecret,
  CLOUD_AI_ORIGIN: "http://127.0.0.1:3001",
  GEMINI_API_KEY: "test-only",
  CLOUD_AI_GEMINI_FREE_UNTIL: new Date(Date.now() + 86400000).toISOString(),
  CLOUD_AI_GEMINI_31_VISION_UNTIL: new Date(
    Date.now() + 86400000,
  ).toISOString(),
});
function adminRequest(
  body: unknown,
  cookie = "",
  csrf = "",
  url = "/api/admin/ai",
  method = "POST",
) {
  return new Request("http://127.0.0.1:3001" + url, {
    method,
    headers: {
      origin: "http://127.0.0.1:3001",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      "x-admin-action": "session-v1",
      cookie,
      "x-admin-csrf": csrf,
    },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
}
async function signIn(store: SharedLedger) {
  const response = await handleAdminSession(
    adminRequest({ secret: adminSecret }, "", "", "/api/admin/ai/session"),
    adminEnv(),
    store,
  );
  assert.equal(response.status, 200);
  const value = await response.json();
  return {
    cookie: response.headers.get("set-cookie")!.split(";")[0],
    csrf: value.csrf as string,
  };
}
test("owner authentication uses a short-lived HttpOnly session; unauthorized and CSRF writes are rejected", async () => {
  const f = fixture();
  try {
    const deniedLedger = new SharedLedger(async () => {
      throw Error("Forged cookies must not query D1");
    });
    assert.equal(
      (
        await handleAdmin(
          adminRequest(
            null,
            `hd_admin_dev=${"A".repeat(43)}.${"B".repeat(43)}`,
            "",
            "/api/admin/ai",
            "GET",
          ),
          adminEnv(),
          deniedLedger,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await handleAdmin(
          adminRequest(null, "", "", "/api/admin/ai", "GET"),
          adminEnv(),
          f.store,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await handleAdminSession(
          adminRequest({ secret: "wrong" }),
          adminEnv(),
          f.store,
        )
      ).status,
      401,
    );
    const login = await handleAdminSession(
      adminRequest({ secret: adminSecret }),
      adminEnv(),
      f.store,
    );
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie")!, /HttpOnly; SameSite=Strict/);
    const auth = await signIn(f.store);
    assert.equal(
      (
        await handleAdmin(
          adminRequest(
            {
              action: "global",
              config: { ...DEFAULT_POLICY, kill: true },
              revision: 0,
            },
            auth.cookie,
            "wrong",
          ),
          adminEnv(),
          f.store,
        )
      ).status,
      401,
    );
    const view = await handleAdmin(
      adminRequest(null, auth.cookie, "", "/api/admin/ai", "GET"),
      adminEnv(),
      f.store,
    );
    assert.equal(view.status, 200);
    assert(!(await view.text()).includes(adminSecret));
    f.setTime(Date.now() + 3601000);
    assert.equal(
      (
        await handleAdmin(
          adminRequest(null, auth.cookie, "", "/api/admin/ai", "GET"),
          adminEnv(),
          f.store,
        )
      ).status,
      401,
    );
  } finally {
    f.db.close();
  }
});
test("admin limits/priority persist with atomic audit, stale revisions reject, and emergency stop blocks inference", async () => {
  const f = fixture();
  try {
    const auth = await signIn(f.store),
      env = adminEnv();
    const change = {
      model: MODEL_KEYS[0],
      enabled: true,
      priority: 2,
      daily: 25,
      rpm: 5,
      tpm: 100000,
      revision: 0,
    };
    assert.equal(
      (
        await handleAdmin(
          adminRequest({ action: "provider", change }, auth.cookie, auth.csrf),
          env,
          f.store,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleAdmin(
          adminRequest({ action: "provider", change }, auth.cookie, auth.csrf),
          env,
          f.store,
        )
      ).status,
      409,
    );
    const model = (await f.store.models()).find(
      (m) => m.model_key === MODEL_KEYS[0],
    )!;
    assert.equal(model.priority, 2);
    assert.equal(model.daily_cap, 25);
    assert.equal(
      f.db
        .prepare(
          "SELECT COUNT(*) AS n FROM admin_audit WHERE actor='owner' AND action='update' AND setting=?",
        )
        .get(MODEL_KEYS[0])?.n,
      1,
    );
    assert.equal(
      (
        await handleAdmin(
          adminRequest(
            {
              action: "provider",
              change: { ...change, revision: 1, daily: 501 },
            },
            auth.cookie,
            auth.csrf,
          ),
          env,
          f.store,
        )
      ).status,
      400,
    );
    const settings = await f.store.settings();
    assert.equal(
      (
        await handleAdmin(
          adminRequest(
            {
              action: "global",
              config: { ...settings.config, kill: true },
              revision: settings.revision,
            },
            auth.cookie,
            auth.csrf,
          ),
          env,
          f.store,
        )
      ).status,
      200,
    );
    assert.equal(await f.store.admit("new", randomUUID()), false);
    assert.equal((await adminSnapshot(f.store, env)).primary, null);
  } finally {
    f.db.close();
  }
});
test("admin cannot enable unverified or non-free models and secret rotation revokes sessions", async () => {
  const f = fixture();
  try {
    const auth = await signIn(f.store);
    const env = adminEnv();
    const change = {
      model: MODEL_KEYS[1],
      enabled: true,
      priority: 2,
      daily: 300,
      rpm: 10,
      tpm: 200000,
      revision: 0,
    };
    assert.equal(
      (
        await handleAdmin(
          adminRequest({ action: "provider", change }, auth.cookie, auth.csrf),
          { ...env, CLOUD_AI_GEMINI_FREE_UNTIL: undefined },
          f.store,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await handleAdmin(
          adminRequest(
            { action: "provider", change: { ...change, model: MODEL_KEYS[3] } },
            auth.cookie,
            auth.csrf,
          ),
          env,
          f.store,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await handleAdmin(
          adminRequest(null, auth.cookie, "", "/api/admin/ai", "GET"),
          { ...env, CLOUD_AI_ADMIN_SECRET: "T".repeat(43) },
          f.store,
        )
      ).status,
      401,
    );
    assert.throws(() =>
      validateGlobalPolicy({ ...DEFAULT_POLICY, projectRpm: 16 }),
    );
  } finally {
    f.db.close();
  }
});
test("dashboard distinguishes operational states and exposes a verified database timestamp", async () => {
  const f = fixture();
  const state = async () =>
    (await adminSnapshot(f.store, adminEnv())).models[0];
  try {
    assert.equal((await state()).status, "Active");
    f.db
      .prepare("UPDATE providers SET enabled=0 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    assert.equal((await state()).status, "Disabled");
    f.db
      .prepare("UPDATE providers SET enabled=1 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    f.db
      .prepare("UPDATE ai_settings SET config=?")
      .run(JSON.stringify(DEFAULT_POLICY));
    assert.equal((await state()).status, "Paused by owner");
    f.db
      .prepare("UPDATE ai_settings SET config=?")
      .run(JSON.stringify({ ...DEFAULT_POLICY, kill: false }));
    await f.store.set(MODEL_KEYS[0], Date.now() + 60000);
    assert.equal((await state()).status, "Temporarily unavailable");
    f.db.exec("DELETE FROM cloud_cooldowns");
    f.db
      .prepare("UPDATE providers SET daily_cap=0 WHERE model_key=?")
      .run(MODEL_KEYS[0]);
    assert.equal((await state()).status, "Quota exhausted");
    const snapshot = await adminSnapshot(f.store, adminEnv());
    assert.equal(snapshot.database.status, "Connected");
    assert.equal(snapshot.database.checkedAt, snapshot.now);
    assert.equal(snapshot.models[2].status, "Unqualified");
    assert.match(snapshot.providerBalance, /Unknown/);
  } finally {
    f.db.close();
  }
});
test("dashboard explains the preceding error for a fallback attempt", async () => {
  const f = fixture();
  try {
    const action = await f.action();
    const primary = adapter();
    primary.run = async () => {
      throw new ProviderFailure("quota_exhausted", Date.now() + 60000);
    };
    const result = await routeVision(
      [primary, adapter(MODEL_KEYS[1])],
      image,
      f.store.routing(action),
      new AbortController().signal,
    );
    assert.equal(result.status, "available");
    const snapshot = await adminSnapshot(f.store, adminEnv());
    assert.equal(
      snapshot.logs.find((row) => row.fallback === 1)?.fallback_reason,
      "quota_exhausted",
    );
  } finally {
    f.db.close();
  }
});
test("retention removes expired logs and sessions without refunding current quota or storing image content", async () => {
  const f = fixture();
  try {
    const a = await f.action();
    const r = await f.store.reserve(a, adapter());
    assert(r);
    await f.store.settle(r, undefined, new ProviderFailure("outage"));
    const names = f.db
      .prepare("PRAGMA table_info(request_logs)")
      .all()
      .map((r) => String(r.name));
    assert(
      !names.some((v) => /image|prompt|exif|secret|authorization/i.test(v)),
    );
    f.setTime(Date.now() + 9 * 86400000);
    await f.store.prune();
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM request_logs").get()?.n,
      0,
    );
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM cloud_jobs").get()?.n,
      0,
    );
  } finally {
    f.db.close();
  }
});
