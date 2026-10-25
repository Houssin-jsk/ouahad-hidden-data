import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilityFixture } from "./fixtures/cloud-availability";
import { handleAvailability } from "../src/cloud-vision/server/availability";
import { publicIdentity } from "../src/cloud-vision/server/access";
import { providers } from "../src/cloud-vision/server/config";
import { validateAvailability } from "../src/cloud-vision/availability";
import { DEFAULT_POLICY } from "../src/cloud-vision/server/policy";
import { handleVision } from "../src/cloud-vision/server/handler";

test("anonymous availability requires no invitation and performs no writes or inference", async () => {
  const f = availabilityFixture();
  try {
    f.env.CLOUD_AI_INVITES = "{}";
    const before = f.snapshot();
    for (const code of [undefined, "invalid"]) {
      const r = await handleAvailability(f.request(code), f.env, {
        ledger: f.ledger,
        adapters: [f.adapter],
      });
      assert.equal(validateAvailability(await r.json()), "eligible");
      assert.equal(r.headers.get("cache-control"), "no-store, private");
    }
    assert.equal(f.snapshot(), before);
    assert.ok(f.queries.every((q) => q.startsWith("SELECT")));
    assert.equal(f.providerCalls(), 0);
  } finally {
    f.db.close();
  }
});
for (const state of [
  "stop",
  "public paused",
  "release expired",
  "ineligible",
  "disabled",
  "cooldown",
  "suspended",
  "missing database",
]) {
  test(`public availability fails closed: ${state}`, async () => {
    const f = availabilityFixture();
    try {
      if (state === "stop" || state === "public paused")
        f.db.prepare("UPDATE ai_settings SET config=?").run(
          JSON.stringify({
            ...DEFAULT_POLICY,
            kill: state === "stop",
            publicEnabled: state !== "public paused",
          }),
        );
      if (state === "release expired")
        delete f.env.CLOUD_AI_RELEASE_READY_UNTIL;
      if (state === "ineligible") f.adapter.eligibility.enabled = false;
      if (state === "disabled") f.db.exec("UPDATE providers SET enabled=0");
      if (state === "cooldown" || state === "suspended")
        f.db
          .prepare("INSERT INTO cloud_cooldowns VALUES(?,?)")
          .run(
            f.adapter.model,
            state === "cooldown" ? Date.now() + 60000 : null,
          );
      const before = f.snapshot(),
        r = await handleAvailability(f.request(), f.env, {
          ...(state !== "missing database" ? { ledger: f.ledger } : {}),
          adapters: [f.adapter],
        });
      assert.equal(validateAvailability(await r.json()), "unavailable");
      assert.equal(f.snapshot(), before);
      assert.equal(f.providerCalls(), 0);
    } finally {
      f.db.close();
    }
  });
}
test("daily fair-use identity ignores browser identities, groups IPv6 /64, rotates daily and fails off trusted hosting", () => {
  const env = { VERCEL: "1", CLOUD_AI_ADMIN_SECRET: "S".repeat(43) };
  const req = (ip: string) =>
    new Request("https://example.com", {
      headers: {
        "x-vercel-forwarded-for": ip,
        "x-vercel-ip-country": "MA",
        authorization: "invented",
        cookie: "visitor=reset",
      },
    });
  const day = 86400000 * 20000;
  const a = publicIdentity(req("2001:db8:abcd:1::1"), env, day)!,
    b = publicIdentity(req("2001:db8:abcd:1::2"), env, day)!;
  assert.equal(a.client, b.client);
  assert.notEqual(
    a.client,
    publicIdentity(req("2001:db8:abcd:1::1"), env, day + 86400000)!.client,
  );
  assert.match(a.client, /^[a-f0-9]{64}$/);
  assert.equal(
    publicIdentity(req("203.0.113.5"), { ...env, VERCEL: undefined }),
    null,
  );
  assert.equal(publicIdentity(req("untrusted"), env), null);
});
test("Gemini free routing respects available-region and unpaid-service restrictions", () => {
  const env = {
    GEMINI_API_KEY: "mock",
    CLOUD_AI_GEMINI_FREE_UNTIL: new Date(Date.now() + 86400000).toISOString(),
  };
  for (const country of ["MA", "US", "CA", "JP"])
    assert.equal(providers(env, country)[0].eligibility.enabled, true);
  for (const country of ["GB", "CH", "FR", "DE", "ZZ", ""])
    assert.equal(providers(env, country)[0].eligibility.enabled, false);
  assert.equal(providers(env, "MA")[3].eligibility.enabled, false);
});
test("availability never authorizes inference without consent or trusted network; cross-site calls reject", async () => {
  const f = availabilityFixture();
  try {
    const before = f.snapshot();
    const r = await handleVision(
      new Request("http://127.0.0.1:3001/api/cloud-vision", {
        method: "POST",
        headers: {
          origin: f.env.CLOUD_AI_ORIGIN!,
          "x-vercel-forwarded-for": "203.0.113.5",
        },
        body: "x",
      }),
      f.env,
      { ledger: f.ledger, adapters: [f.adapter] },
    );
    assert.equal(r.status, 400);
    const cross = await handleAvailability(
      new Request(f.request(), { headers: { origin: "https://evil.invalid" } }),
      f.env,
      { ledger: f.ledger },
    );
    assert.equal(cross.status, 403);
    assert.equal(f.snapshot(), before);
    assert.equal(f.providerCalls(), 0);
    assert.throws(() =>
      validateAvailability({
        schema: "cloud-availability/1",
        status: "eligible",
        model: "private",
      }),
    );
  } finally {
    f.db.close();
  }
});

test("anonymous discovery reports exhausted visitor capacity without a test inference or another reservation", async () => {
  const f = availabilityFixture();
  try {
    const identity = publicIdentity(f.request(), f.env)!;
    const now = Date.now();
    for (let i = 0; i < 3; i++)
      f.db
        .prepare(
          "INSERT INTO cloud_jobs(id,client,created,lease_until,released) VALUES(?,?,?,?,1)",
        )
        .run("fixture" + i, identity.client, now - i * 61000, now - 1000);
    const before = f.snapshot();
    const r = await handleAvailability(f.request(), f.env, {
      ledger: f.ledger,
      adapters: [f.adapter],
    });
    assert.equal(validateAvailability(await r.json()), "unavailable");
    assert.equal(f.snapshot(), before);
    assert.equal(f.providerCalls(), 0);
  } finally {
    f.db.close();
  }
});
