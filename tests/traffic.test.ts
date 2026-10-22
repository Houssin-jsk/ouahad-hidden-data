import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { handleVision } from "../src/cloud-vision/server/handler";
import { SharedLedger, LEDGER_SCHEMA } from "../src/cloud-vision/server/ledger";
import {
  DEFAULT_POLICY,
  MODEL_KEYS,
  TOKEN_RESERVATION,
} from "../src/cloud-vision/server/policy";
import type { ProviderAdapter } from "../src/cloud-vision/server/types";

// Real handlers and persistent SQL; only the external model transport is mocked.
async function fixture(count: number) {
  const directory = await mkdtemp(path.join(tmpdir(), "hidden-data-traffic-"));
  const file = path.join(directory, "shared.sqlite");
  const seed = new DatabaseSync(file);
  seed.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000");
  LEDGER_SCHEMA.forEach((sql) => seed.exec(sql));
  seed
    .prepare("UPDATE ai_settings SET config=?")
    .run(JSON.stringify({ ...DEFAULT_POLICY, kill: false }));
  seed
    .prepare(
      "UPDATE providers SET enabled=1,eligibility='eligible' WHERE model_key=?",
    )
    .run(MODEL_KEYS[0]);
  let clock = Date.now();
  const codes = Array.from(
    { length: count },
    () => randomUUID().replaceAll("-", "") + "A".repeat(11),
  );
  const expiry = new Date(clock + 86400000).toISOString();
  const env = {
    CLOUD_AI_ORIGIN: "http://127.0.0.1:3001",
    CLOUD_AI_RELEASE_READY_UNTIL: expiry,
    CLOUD_AI_INVITES: JSON.stringify(
      Object.fromEntries(
        codes.map((code) => [
          createHash("sha256").update(code).digest("hex"),
          { country: "MA", expiresAt: expiry },
        ]),
      ),
    ),
  };
  const connections = codes.map(() => {
    const db = new DatabaseSync(file);
    db.exec("PRAGMA busy_timeout=5000");
    db.function("strftime", { varargs: true }, () =>
      String(Math.floor(clock / 1000)),
    );
    return db;
  });
  const stores = connections.map(
    (db) =>
      new SharedLedger(async (sql, params) => {
        await delay(1); // Interleave independent connections, including admission.
        return db.prepare(sql).all(...params) as Record<string, unknown>[];
      }),
  );
  const jpeg = await readFile("tests/fixtures/phase01/quadrants.jpg");
  return {
    seed,
    stores,
    env,
    advance(ms: number) {
      clock += ms;
    },
    request(i: number) {
      return new Request(env.CLOUD_AI_ORIGIN + "/api/cloud-vision", {
        method: "POST",
        headers: {
          origin: env.CLOUD_AI_ORIGIN,
          "sec-fetch-site": "same-origin",
          authorization: `Bearer ${codes[i]}`,
          "content-type": "image/jpeg",
          "x-cloud-consent": "external-v1",
          "x-cloud-request-id": randomUUID(),
          "x-cloud-eligibility": "adult-ma-professional-nonsensitive-v1",
        },
        body: Buffer.from(jpeg),
      });
    },
    async close() {
      connections.forEach((db) => db.close());
      seed.close();
      assert(
        path
          .resolve(directory)
          .startsWith(
            path.resolve(tmpdir()) + path.sep + "hidden-data-traffic-",
          ),
      );
      await rm(directory, { recursive: true });
    },
  };
}
function adapter(run: ProviderAdapter["run"]): ProviderAdapter {
  return {
    id: "gemini",
    model: MODEL_KEYS[0],
    priority: 1,
    eligibility: { enabled: true, reason: "Mock transport only" },
    constraints: {
      mime: "image/jpeg",
      maxBytes: 786432,
      maxSide: 1024,
      outputTokens: 480,
    },
    run,
  };
}
const result = {
  observations: {
    description: "Colored rectangles.",
    observations: [],
    limitations: ["Mocked transport; no quality claim."],
  },
  usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
};
for (const arrivals of [10, 40, 100]) {
  test(`${arrivals} simultaneous handlers share persistent SQL admission without overspend`, async () => {
    const f = await fixture(arrivals);
    let calls = 0,
      active = 0,
      maxActive = 0,
      rejected = 0;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = adapter(async () => {
      calls++;
      active++;
      maxActive = Math.max(maxActive, active);
      await held;
      active--;
      return result;
    });
    const start = performance.now();
    try {
      const tasks = f.stores.map((ledger, i) =>
        handleVision(f.request(i), f.env, {
          ledger,
          adapters: [provider],
        }).then((response) => {
          if (response.status === 429) rejected++;
          return response;
        }),
      );
      // Hold admitted providers until every other handler has hit shared admission.
      for (let n = 0; n < 2000 && (rejected < arrivals - 2 || calls < 2); n++)
        await delay(5);
      release();
      const responses = await Promise.all(tasks);
      assert.equal(calls, 2);
      assert.equal(maxActive, 2);
      assert.equal(rejected, arrivals - 2);
      assert.equal(responses.filter((r) => r.status === 200).length, 2);
      assert.equal(
        f.seed.prepare("SELECT COUNT(*) AS n FROM cloud_jobs").get()?.n,
        2,
      );
      assert.equal(
        f.seed
          .prepare("SELECT COUNT(*) AS n FROM cloud_jobs WHERE released=0")
          .get()?.n,
        0,
      );
      assert.equal(
        f.seed
          .prepare(
            "SELECT COUNT(*) AS n FROM request_logs WHERE outcome='completed'",
          )
          .get()?.n,
        2,
      );
      const counters = f.seed
        .prepare(
          "SELECT scope,reserved_requests,reserved_tokens FROM usage_counters WHERE window_type='day'",
        )
        .all();
      assert.equal(counters.length, 2);
      for (const c of counters) {
        assert.equal(c.reserved_requests, 2);
        assert.equal(c.reserved_tokens, 2 * TOKEN_RESERVATION);
      }
      console.log(
        JSON.stringify({
          trafficAudit: true,
          arrivals,
          admitted: calls,
          denied: rejected,
          maxConcurrentProviderCalls: maxActive,
          durationMs: Math.round(performance.now() - start),
          sqlDelayPerQueryMs: 1,
          externalCalls: 0,
        }),
      );
    } finally {
      release();
      await f.close();
    }
  });
}
test("ten visitors each make three spaced analyses; the fourth visitor action is denied", async () => {
  const f = await fixture(10);
  let calls = 0;
  const provider = adapter(async () => {
    calls++;
    return result;
  });
  try {
    for (let n = 0; n < 30; n++) {
      const i = n % 10;
      const response = await handleVision(f.request(i), f.env, {
        ledger: f.stores[i],
        adapters: [provider],
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, "available");
      f.advance(20001);
    }
    assert.equal(
      (
        await handleVision(f.request(0), f.env, {
          ledger: f.stores[0],
          adapters: [provider],
        })
      ).status,
      429,
    );
    assert.equal(calls, 30);
    console.log(
      JSON.stringify({
        trafficAudit: true,
        visitors: 10,
        analysesPerVisitor: 3,
        admitted: calls,
        fourthActionDenied: true,
        simulatedSpacingMs: 20001,
        externalCalls: 0,
      }),
    );
  } finally {
    await f.close();
  }
});
