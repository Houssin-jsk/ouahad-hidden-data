import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import {
  MAX_IMAGE_BYTES,
  GEMINI_TIMEOUT_MS,
  CLOUD_API_TIMEOUT_MS,
  validateObservations,
  validateCloudResult,
} from "../src/cloud-vision/contract";
import { authorize, sameOrigin } from "../src/cloud-vision/server/access";
import { providers } from "../src/cloud-vision/server/config";
import { validateCloudImage } from "../src/cloud-vision/server/image";
import {
  SharedLedger,
  LEDGER_SCHEMA,
  d1Query,
} from "../src/cloud-vision/server/ledger";
import { handleVision } from "../src/cloud-vision/server/handler";
import { routeVision } from "../src/cloud-vision/server/router";
import {
  ProviderFailure,
  type ProviderAdapter,
  type RoutingControls,
  type VisionImage,
} from "../src/cloud-vision/server/types";
import {
  boundedJson,
  classifyHttp,
  providerJson,
  retryAt,
} from "../src/cloud-vision/server/http";
import { geminiAdapter } from "../src/cloud-vision/server/providers/gemini";
import {
  classifyCloudflare,
  cloudflareAdapter,
} from "../src/cloud-vision/server/providers/cloudflare";
import { nvidiaAdapter } from "../src/cloud-vision/server/providers/nvidia";
import { DEFAULT_POLICY } from "../src/cloud-vision/server/policy";

const observations = {
  description: "A red rectangle is visible.",
  observations: ["The background is white."],
  limitations: ["AI interpretation may contain mistakes."],
};
const image: VisionImage = {
  bytes: new Uint8Array([1]),
  mime: "image/jpeg",
  width: 10,
  height: 10,
};
function adapter(
  id: ProviderAdapter["id"],
  run: ProviderAdapter["run"] = async () => ({ observations }),
  model = id === "gemini"
    ? "gemini-3.5-flash-lite"
    : id === "cloudflare"
      ? "@cf/meta/llama-3.2-11b-vision-instruct"
      : "meta/llama-3.2-11b-vision-instruct",
): ProviderAdapter {
  return {
    id,
    model,
    priority:
      model === "gemini-3.1-flash-lite"
        ? 2
        : id === "gemini"
          ? 1
          : id === "cloudflare"
            ? 3
            : 4,
    eligibility: { enabled: true, reason: "mock only" },
    constraints: {
      mime: "image/jpeg",
      maxBytes: MAX_IMAGE_BYTES,
      maxSide: 1024,
      outputTokens: 480,
    },
    run,
  };
}
function cooldowns() {
  const values = new Map<string, number | "suspended">();
  const label = (id: string) =>
    id === "gemini-3.5-flash-lite"
      ? "gemini"
      : id === "gemini-3.1-flash-lite"
        ? "gemini31"
        : id.startsWith("@cf/")
          ? "cloudflare"
          : "nvidia";
  return {
    values,
    now: async () => Date.now(),
    get: async (id: string) => values.get(label(id)),
    set: async (id: string, until: number | "suspended") => {
      values.set(label(id), until);
    },
    reserve: async () => randomUUID(),
    settle: async () => {},
  } satisfies RoutingControls & { values: typeof values };
}
const signal = () => new AbortController().signal;
function ledger() {
  const db = new DatabaseSync(":memory:");
  LEDGER_SCHEMA.forEach((sql) => db.exec(sql));
  db.prepare("UPDATE ai_settings SET config=?").run(
    JSON.stringify({
      ...DEFAULT_POLICY,
      kill: false,
      dailyActions: 10,
      concurrency: 1,
    }),
  );
  db.exec(
    "UPDATE providers SET enabled=1,eligibility='eligible' WHERE model_key='gemini-3.5-flash-lite'",
  );
  return {
    db,
    store: new SharedLedger(
      async (sql, params) =>
        db.prepare(sql).all(...params) as Record<string, unknown>[],
    ),
  };
}
const code = "A".repeat(43);
function environment() {
  return {
    CLOUD_AI_ORIGIN: "http://127.0.0.1:3001",
    CLOUD_AI_RELEASE_READY_UNTIL: new Date(Date.now() + 86400000).toISOString(),
    CLOUD_AI_INVITES: JSON.stringify({
      [createHash("sha256").update(code).digest("hex")]: {
        country: "MA",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    }),
  };
}
function request(
  body: Uint8Array = new Uint8Array([0]),
  overrides: Record<string, string> = {},
  method = "POST",
) {
  return new Request("http://127.0.0.1:3001/api/cloud-vision", {
    method,
    headers: {
      origin: "http://127.0.0.1:3001",
      "sec-fetch-site": "same-origin",
      authorization: `Bearer ${code}`,
      "content-type": "image/jpeg",
      "x-cloud-consent": "external-v1",
      "x-cloud-request-id": randomUUID(),
      "x-cloud-eligibility": "adult-ma-professional-nonsensitive-v1",
      ...overrides,
    },
    ...(method === "POST" ? { body: Buffer.from(body) } : {}),
  });
}

test("router prioritizes Gemini and skips NVIDIA regardless of adapter order", async () => {
  const used: string[] = [];
  const adapters = ["cloudflare", "nvidia", "gemini"].map((id) =>
    adapter(id as ProviderAdapter["id"], async () => {
      used.push(id);
      return { observations };
    }),
  );
  const result = await routeVision(adapters, image, cooldowns(), signal());
  assert.deepEqual(used, ["gemini"]);
  assert.equal(result.provider, "gemini");
  assert.equal(result.processing?.attempts, 1);
});
test("documented quota cooldown persists and fallback is serial and bounded", async () => {
  const used: string[] = [];
  const state = cooldowns();
  const time = Date.now() + 60000;
  const adapters = [
    adapter("gemini", async () => {
      used.push("gemini");
      throw new ProviderFailure("quota_exhausted", time);
    }),
    adapter(
      "gemini",
      async () => {
        used.push("gemini31");
        throw new ProviderFailure("rate_limited");
      },
      "gemini-3.1-flash-lite",
    ),
    adapter("cloudflare", async () => {
      used.push("cloudflare");
      return { observations };
    }),
  ];
  assert.equal(
    (await routeVision(adapters, image, state, signal())).provider,
    "cloudflare",
  );
  assert.deepEqual(used, ["gemini", "gemini31", "cloudflare"]);
  assert.equal(state.values.get("gemini"), time);
  assert.equal(typeof state.values.get("gemini31"), "number");
  used.length = 0;
  await routeVision(adapters, image, state, signal());
  assert.deepEqual(used, ["cloudflare"]);
  state.values.set("gemini", Date.now() - 1);
  used.length = 0;
  await routeVision(adapters, image, state, signal());
  assert.deepEqual(used, ["gemini", "cloudflare"]);
});
test("router returns unavailable without calls when adapters disabled or suspended", async () => {
  let calls = 0;
  const a = adapter("gemini", async () => {
    calls++;
    return { observations };
  });
  a.eligibility.enabled = false;
  assert.equal(
    (await routeVision([a], image, cooldowns(), signal())).status,
    "unavailable",
  );
  a.eligibility.enabled = true;
  const state = cooldowns();
  state.values.set("gemini", "suspended");
  assert.equal(
    (await routeVision([a], image, state, signal())).error,
    "rate_limited",
  );
  assert.equal(calls, 0);
});
for (const kind of [
  "invalid_credentials",
  "model_unavailable",
  "billing_required",
] as const) {
  test(`router classifies ${kind} and can use an eligible fallback`, async () => {
    const result = await routeVision(
      [
        adapter("gemini", async () => {
          throw new ProviderFailure(kind);
        }),
        adapter("cloudflare"),
      ],
      image,
      cooldowns(),
      signal(),
    );
    assert.equal(result.provider, "cloudflare");
    assert.equal(result.processing?.attempts, 2);
  });
}
for (const kind of [
  "safety_refusal",
  "invalid_output",
  "invalid_image",
  "cancelled",
  "timeout",
  "outage",
] as const) {
  test(`${kind} does not send image to another provider`, async () => {
    let called = false;
    const result = await routeVision(
      [
        adapter("gemini", async () => {
          throw new ProviderFailure(kind);
        }),
        adapter("cloudflare", async () => {
          called = true;
          return { observations };
        }),
      ],
      image,
      cooldowns(),
      signal(),
    );
    assert.equal(result.error, kind);
    assert.equal(called, false);
  });
}
test("caller cancellation rejects a late provider success", async () => {
  const controller = new AbortController();
  const result = await routeVision(
    [
      adapter("gemini", async () => {
        controller.abort();
        return { observations };
      }),
    ],
    image,
    cooldowns(),
    controller.signal,
  );
  assert.equal(result.error, "cancelled");
  assert.equal(result.interpretation, undefined);
});

test("cancellation during reservation never starts an external request", async () => {
  const controller = new AbortController();
  const state = cooldowns();
  let calls = 0;
  let recorded: string | undefined;
  state.reserve = async () => {
    controller.abort();
    return randomUUID();
  };
  const result = await routeVision(
    [
      adapter("gemini", async () => {
        calls++;
        return { observations };
      }),
    ],
    image,
    {
      ...state,
      settle: async (_id, _response, error) => {
        recorded = error?.kind;
      },
    },
    controller.signal,
  );
  assert.equal(result.error, "cancelled");
  assert.equal(calls, 0);
  assert.equal(recorded, "cancelled");
});

test("D1 deadline cancels a stalled response body, not just response headers", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(AbortSignal, "timeout", (delay: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), delay);
    return controller.signal;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(new ReadableStream()),
  );
  const query = d1Query("a".repeat(32), "0".repeat(36), "mock-only", signal());
  const rejected = assert.rejects(query("SELECT 1", []), {
    name: "AbortError",
  });
  await Promise.resolve();
  await Promise.resolve();
  t.mock.timers.tick(4000);
  await rejected;
});
test("Retry-After date/seconds and Gemini RetryInfo are parsed, unknown reset is never fabricated", () => {
  assert.equal(retryAt(new Headers({ "retry-after": "2" }), {}, 10000), 12000);
  assert.equal(
    retryAt(
      new Headers({ "retry-after": new Date(20000).toUTCString() }),
      {},
      10000,
    ),
    20000,
  );
  assert.equal(
    retryAt(
      new Headers(),
      {
        error: {
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.RetryInfo",
              retryDelay: "1.5s",
            },
          ],
        },
      },
      10000,
    ),
    11500,
  );
  assert.equal(retryAt(new Headers(), {}, 10000), undefined);
  assert.equal(
    classifyHttp(new Response(null, { status: 429 }), {}).kind,
    "rate_limited",
  );
  assert.equal(
    classifyHttp(new Response(null, { status: 429 }), {
      error: "quota exhausted",
    }).kind,
    "quota_exhausted",
  );
  assert.equal(
    classifyHttp(new Response(null, { status: 401 }), {}).kind,
    "invalid_credentials",
  );
  assert.equal(
    classifyHttp(new Response(null, { status: 402 }), {}).kind,
    "billing_required",
  );
});
test("external output schema rejects extras, confidence, oversized, missing and malformed fields", () => {
  assert.deepEqual(validateObservations(observations), observations);
  for (const value of [
    null,
    {},
    { ...observations, confidence: 0.99 },
    { ...observations, description: "x".repeat(601) },
    { ...observations, observations: Array(5).fill("item") },
    { ...observations, limitations: [] },
    { ...observations, observations: [1] },
  ])
    assert.throws(() => validateObservations(value));
});

test("browser response normalization accepts only known errors and drops untrusted fields", () => {
  const payload = {
    schema: "cloud-vision/1",
    status: "available",
    provider: "gemini",
    model: "test-only",
    interpretation: observations,
    debug: "private",
  };
  assert.deepEqual(validateCloudResult(payload), {
    schema: "cloud-vision/1",
    status: "available",
    provider: "gemini",
    model: "test-only",
    interpretation: observations,
  });
  assert.throws(() =>
    validateCloudResult({
      schema: "cloud-vision/1",
      status: "unavailable",
      error: "unknown",
      message: "Unexpected",
    }),
  );
  assert.throws(() => validateCloudResult([]));
  for (const processing of [{ attempts: "fake" }, { elapsedMs: 1, attempts: 4, width: 10, height: 10 }, { elapsedMs: 1, attempts: 1, width: 10, height: 10, usage: { inputTokens: -1 } }])
    assert.throws(() => validateCloudResult({ ...payload, processing }));
  const processing = { elapsedMs: 12, attempts: 1, width: 10, height: 10, usage: { inputTokens: 100, outputTokens: 20 } };
  assert.deepEqual(validateCloudResult({ ...payload, processing }).processing, processing);
});
test("provider response size and invalid JSON are bounded", async () => {
  await assert.rejects(
    boundedJson(new Response("x".repeat(200)), 100),
    /invalid_output/,
  );
  await assert.rejects(
    boundedJson(new Response("<html>bad</html>")),
    /invalid_output/,
  );
});
test("Gemini adapter sends bounded image prompt server-side and normalizes real response shape", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      assert.equal(body.generationConfig.maxOutputTokens, 480);
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/jpeg");
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(observations) }] },
          },
        ],
        usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 20 },
      });
    },
  );
  const a = geminiAdapter(
    "test-key-never-logged",
    { enabled: true, reason: "mock" },
    adapter("gemini").constraints,
  );
  const result = await a.run(image, signal());
  assert.deepEqual(result.observations, observations);
  assert.equal(result.usage?.outputTokens, 20);
});
test("Gemini safety and truncated output never become invented observations", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ candidates: [{ finishReason: "SAFETY" }] }),
  );
  const a = geminiAdapter(
    "test",
    { enabled: true, reason: "mock" },
    adapter("gemini").constraints,
  );
  await assert.rejects(a.run(image, signal()), /safety_refusal/);
  mock.mock.mockImplementation(async () =>
    Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
  );
  await assert.rejects(a.run(image, signal()), /invalid_output/);
});
test("provider timeout and cancellation propagate without raw error leakage", async (t) => {
  const original = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", () => original(5));
  t.mock.method(
    globalThis,
    "fetch",
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => reject(Error("secret provider body")),
          { once: true },
        );
      }),
  );
  const keepAlive = setTimeout(() => {}, 50);
  try {
    await assert.rejects(
      providerJson("https://example.invalid", {}, {}, signal()),
      /timeout/,
    );
    const c = new AbortController();
    setTimeout(() => c.abort(), 1);
    await assert.rejects(
      providerJson("https://example.invalid", {}, {}, c.signal),
      /cancelled/,
    );
  } finally {
    clearTimeout(keepAlive);
  }
});

test("Gemini accepts a response after the old 12s cutoff within its 45s allowance", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const deadlines: number[] = [];
  t.mock.method(AbortSignal, "timeout", (delay: number) => {
    deadlines.push(delay);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), delay);
    return controller.signal;
  });
  t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        setTimeout(
          () =>
            resolve(
              Response.json({
                candidates: [
                  {
                    finishReason: "STOP",
                    content: {
                      parts: [{ text: JSON.stringify(observations) }],
                    },
                  },
                ],
              }),
            ),
          13000,
        );
      }),
  );
  const a = geminiAdapter(
    "mock-only",
    { enabled: true, reason: "test" },
    adapter("gemini").constraints,
  );
  let completed = false;
  const pending = a.run(image, signal()).then((value) => {
    completed = true;
    return value;
  });
  t.mock.timers.tick(12001);
  await Promise.resolve();
  assert.equal(completed, false);
  t.mock.timers.tick(1000);
  assert.deepEqual((await pending).observations, observations);
  assert.deepEqual(deadlines, [GEMINI_TIMEOUT_MS]);
});

test("Gemini deadline covers a stalled response body and caller cancellation remains immediate", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(AbortSignal, "timeout", (delay: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), delay);
    return controller.signal;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(new ReadableStream()),
  );
  const a = geminiAdapter(
    "mock-only",
    { enabled: true, reason: "test" },
    adapter("gemini").constraints,
  );
  const pending = a.run(image, signal());
  const timedOut = assert.rejects(pending, /timeout/);
  await Promise.resolve();
  await Promise.resolve();
  t.mock.timers.tick(GEMINI_TIMEOUT_MS);
  await timedOut;
  const caller = new AbortController();
  const cancelled = assert.rejects(a.run(image, caller.signal), /cancelled/);
  await Promise.resolve();
  await Promise.resolve();
  caller.abort();
  await cancelled;
});
test("credentials do not enable providers: billing verification expires and NVIDIA remains disabled", () => {
  const env = {
    GEMINI_API_KEY: "test",
    NVIDIA_API_KEY: "test",
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
    CLOUDFLARE_API_TOKEN: "test",
  };
  assert(providers(env, "MA").every((a) => !a.eligibility.enabled));
  const next = {
    ...env,
    CLOUD_AI_GEMINI_FREE_UNTIL: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.equal(providers(next, "MA")[0].eligibility.enabled, true);
  assert.equal(providers(next, "FR")[0].eligibility.enabled, false);
  assert.equal(providers(next, "MA")[1].eligibility.enabled, false);
});
test("access ignores spoofed identity and requires unexpired owner-issued MA capability", () => {
  const env = environment();
  assert(authorize(request(), env));
  assert.equal(
    authorize(
      request(undefined, {
        authorization: "",
        "x-forwarded-for": "owner",
        "x-client-id": "owner",
      }),
      env,
    ),
    null,
  );
  assert.equal(authorize(request(), { ...env, CLOUD_AI_INVITES: "{}" }), null);
  assert.equal(
    sameOrigin(request(undefined, { origin: "https://evil.invalid" }), env),
    false,
  );
  assert.equal(
    sameOrigin(request(undefined, { "sec-fetch-site": "cross-site" }), env),
    false,
  );
  assert.equal(sameOrigin(request(), { ...env, VERCEL: "1" }), false);
});
test("atomic shared admission enforces concurrency, per-client minute/day, global day and lease expiry", async () => {
  const { db, store } = ledger();
  const now = Math.floor(Date.now() / 86400000) * 86400000 + 300000;
  try {
    const races = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        store.admit(`client${i}`, `race${i}`, now),
      ),
    );
    assert.equal(races.filter(Boolean).length, 1);
    await store.release("race0");
    assert.equal(await store.admit("client0", "too-fast", now + 1000), false);
    assert.equal(await store.admit("client0", "second", now + 61000), true);
    await store.release("second");
    assert.equal(await store.admit("client0", "third", now + 122000), true);
    await store.release("third");
    assert.equal(await store.admit("client0", "fourth", now + 183000), false);
    for (let i = 0; i < 7; i++) {
      assert.equal(
        await store.admit(`other${i}`, `global${i}`, now + 200000 + i * 61000),
        true,
      );
      await store.release(`global${i}`);
    }
    assert.equal(await store.admit("last", "over-global", now + 700000), false);
    assert.equal(await store.admit("last", "next-day", now + 86400000), true);
    assert.equal(
      await store.admit("new", "over-lease", now + 86400000 + 119999),
      false,
    );
    assert.equal(
      await store.admit("new", "after-lease", now + 86400000 + 120001),
      true,
    );
  } finally {
    db.close();
  }
});
test("cooldown persistence is shared and cannot shorten or unsuspend an unknown reset", async () => {
  const { db, store } = ledger();
  try {
    await store.set("gemini", 20000);
    await store.set("gemini", 10000);
    assert.equal(await store.get("gemini"), 20000);
    await store.set("gemini", "suspended");
    await store.set("gemini", 30000);
    assert.equal(await store.get("gemini"), "suspended");
  } finally {
    db.close();
  }
});
test("JPEG signature, MIME, dimensions, metadata and truncation are enforced server-side", async () => {
  const original = new Uint8Array(
    await readFile("tests/fixtures/phase01/orientation-6.jpg"),
  );
  const image = validateCloudImage(original, "image/jpeg");
  assert(image.width > 0);
  assert(image.bytes.length < original.length);
  assert.equal(Buffer.from(image.bytes).includes(Buffer.from("Exif")), false);
  assert.equal(
    Buffer.from(image.bytes).includes(Buffer.from("OUAHAD TEST")),
    false,
  );
  for (const bytes of [
    new Uint8Array([1, 2, 3]),
    original.subarray(0, original.length - 1),
    new Uint8Array(MAX_IMAGE_BYTES + 1),
  ])
    assert.throws(
      () => validateCloudImage(bytes, "image/jpeg"),
      /invalid_image/,
    );
  assert.throws(
    () => validateCloudImage(original, "image/png"),
    /invalid_image/,
  );
  const oversized = original.slice();
  for (let i = 0; i < oversized.length - 9; i++)
    if (oversized[i] === 255 && [0xc0, 0xc1, 0xc2].includes(oversized[i + 1])) {
      oversized[i + 7] = 0x10;
      oversized[i + 8] = 0;
      break;
    }
  assert.throws(
    () => validateCloudImage(oversized, "image/jpeg"),
    /invalid_image/,
  );
});
test("endpoint rejects missing consent, cross-origin, uninvited and missing durable/cost configuration without provider calls", async () => {
  const env = environment();
  assert.equal(
    (await handleVision(request(undefined, {}, "GET"), env)).status,
    405,
  );
  assert.equal(
    (
      await handleVision(
        request(undefined, { origin: "https://evil.invalid" }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (await handleVision(request(undefined, { "x-cloud-consent": "" }), env))
      .status,
    400,
  );
  assert.equal(
    (await handleVision(request(undefined, { authorization: "" }), env)).status,
    403,
  );
  assert.equal((await handleVision(request(), env)).status, 503);
  assert.equal(
    (await handleVision(request(), env, { adapters: [adapter("gemini")] }))
      .status,
    503,
  );
});
test("endpoint rejects declared and streamed oversized images and wrong content-type", async () => {
  const { db, store } = ledger();
  const deps = { ledger: store, adapters: [adapter("gemini")] };
  try {
    assert.equal(
      (
        await handleVision(
          request(undefined, { "content-length": String(MAX_IMAGE_BYTES + 1) }),
          environment(),
          deps,
        )
      ).status,
      413,
    );
    assert.equal(
      (
        await handleVision(
          request(undefined, { "content-type": "image/png" }),
          environment(),
          deps,
        )
      ).status,
      415,
    );
    const response = await handleVision(
      request(new Uint8Array(MAX_IMAGE_BYTES + 1)),
      environment(),
      deps,
    );
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_image");
  } finally {
    db.close();
  }
});
test("complete endpoint path returns validated interpretation and never persists image or prompt", async () => {
  const { db, store } = ledger();
  try {
    const jpeg = new Uint8Array(
      await readFile("tests/fixtures/phase01/quadrants.jpg"),
    );
    const response = await handleVision(request(jpeg), environment(), {
      ledger: store,
      adapters: [adapter("gemini")],
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, private");
    const result = await response.json();
    assert.equal(result.status, "available");
    assert.deepEqual(result.interpretation, observations);
    const columns = db
      .prepare("PRAGMA table_info(cloud_jobs)")
      .all()
      .map((c) => c.name);
    assert.deepEqual(columns, [
      "id",
      "client",
      "created",
      "lease_until",
      "released",
      "request_key",
    ]);
    assert.equal(
      db.prepare("SELECT released FROM cloud_jobs").get()?.released,
      1,
    );
  } finally {
    db.close();
  }
});
for (const mode of ["deadline", "cancellation"] as const) {
  test(`API ${mode} stops an in-flight provider, preserves its reservation and releases its action`, async (t) => {
    const { db, store } = ledger();
    const controller = new AbortController();
    let deadline!: AbortController;
    t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
      assert.equal(milliseconds, CLOUD_API_TIMEOUT_MS);
      deadline = new AbortController();
      return deadline.signal;
    });
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    let calls = 0;
    const provider = adapter("gemini", async (_image, signal) => {
      calls++;
      started();
      await new Promise<void>((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
      return { observations };
    });
    try {
      const jpeg = new Uint8Array(
        await readFile("tests/fixtures/phase01/quadrants.jpg"),
      );
      const pending = handleVision(
        new Request(request(jpeg), { signal: controller.signal }),
        environment(),
        { ledger: store, adapters: [provider] },
      );
      await entered;
      if (mode === "deadline")
        deadline.abort(
          new DOMException("Processing deadline reached", "TimeoutError"),
        );
      else controller.abort();
      const response = await pending;
      assert.equal(
        (await response.json()).error,
        mode === "deadline" ? "timeout" : "cancelled",
      );
      assert.equal(calls, 1);
      assert.equal(
        db.prepare("SELECT outcome FROM request_logs").get()?.outcome,
        "uncertain",
      );
      assert.equal(
        db.prepare("SELECT released FROM cloud_jobs").get()?.released,
        1,
      );
      for (const row of db
        .prepare(
          "SELECT reserved_requests,reserved_tokens FROM usage_counters WHERE window_type='day'",
        )
        .all()) {
        assert.equal(row.reserved_requests, 1);
        assert.equal(row.reserved_tokens, 4096);
      }
    } finally {
      db.close();
    }
  });
}
test("Cloudflare daily quota, transient capacity, paid-only model and model errors stay distinct", () => {
  const error = (code: number) => ({ errors: [{ code }] });
  const response = new Response(null, { status: 429 });
  const quota = classifyCloudflare(response, error(3036));
  assert.equal(quota.kind, "quota_exhausted");
  assert.equal(
    quota.retryAt,
    (Math.floor(Date.now() / 86400000) + 1) * 86400000,
  );
  assert.equal(classifyCloudflare(response, error(3040)).kind, "outage");
  assert.equal(
    classifyCloudflare(new Response(null, { status: 403 }), error(5035)).kind,
    "billing_required",
  );
  assert.equal(
    classifyCloudflare(new Response(null, { status: 400 }), error(5007)).kind,
    "model_unavailable",
  );
  assert.equal(
    classifyHttp(new Response(null, { status: 400 }), {
      error: { status: "API_KEY_INVALID" },
    }).kind,
    "invalid_credentials",
  );
});
test("disabled fallback adapters normalize their own wire shapes in mocks only", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      success: true,
      result: { response: JSON.stringify(observations) },
    }),
  );
  const cf = cloudflareAdapter(
    "a".repeat(32),
    "test",
    { enabled: false, reason: "unqualified" },
    adapter("cloudflare").constraints,
  );
  assert.deepEqual((await cf.run(image, signal())).observations, observations);
  fetch.mock.mockImplementation(async () =>
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify(observations) },
        },
      ],
    }),
  );
  const nv = nvidiaAdapter("test", adapter("nvidia").constraints);
  assert.equal(nv.eligibility.enabled, false);
  assert.deepEqual((await nv.run(image, signal())).observations, observations);
});
