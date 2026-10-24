import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilityFixture } from "./fixtures/cloud-availability";
import { handleAvailability } from "../src/cloud-vision/server/availability";
import { validateAvailability } from "../src/cloud-vision/availability";
import { DEFAULT_POLICY } from "../src/cloud-vision/server/policy";
import { handleVision } from "../src/cloud-vision/server/handler";

test("public discovery and a valid invitation reflect server policy without writes, reservations or inference", async () => {
  const f = availabilityFixture(),
    before = f.snapshot();
  try {
    for (const [code, expected] of [
      [undefined, "restricted"],
      [f.code, "eligible"],
    ] as const) {
      const response = await handleAvailability(f.request(code), f.env, {
        ledger: f.ledger,
        adapters: [f.adapter],
      });
      const value = await response.json();
      assert.equal(validateAvailability(value), expected);
      assert.deepEqual(Object.keys(value).sort(), ["schema", "status"]);
      assert.equal(response.headers.get("cache-control"), "no-store, private");
    }
    assert.equal(f.snapshot(), before);
    assert.ok(f.queries.every((sql) => sql.trim().startsWith("SELECT")));
    assert.equal(f.providerCalls(), 0);
  } finally {
    f.db.close();
  }
});

for (const state of [
  "globally disabled",
  "emergency stop",
  "missing release",
  "no qualified provider",
  "cooldown",
  "suspended",
  "missing database",
] as const) {
  test(`availability fails closed for ${state}`, async () => {
    const f = availabilityFixture();
    try {
      if (state === "globally disabled") f.adapter.eligibility.enabled = false;
      if (state === "emergency stop")
        f.db
          .prepare("UPDATE ai_settings SET config=?")
          .run(JSON.stringify(DEFAULT_POLICY));
      if (state === "missing release")
        delete f.env.CLOUD_AI_RELEASE_READY_UNTIL;
      if (state === "no qualified provider")
        f.db.exec("UPDATE providers SET enabled=0");
      if (state === "cooldown" || state === "suspended")
        f.db
          .prepare(
            "INSERT INTO cloud_cooldowns(provider,until_time) VALUES(?,?)",
          )
          .run(
            f.adapter.model,
            state === "cooldown" ? Date.now() + 60000 : null,
          );
      const before = f.snapshot();
      const response = await handleAvailability(f.request(f.code), f.env, {
        ...(state !== "missing database" ? { ledger: f.ledger } : {}),
        adapters: [f.adapter],
      });
      assert.equal(validateAvailability(await response.json()), "unavailable");
      assert.equal(f.snapshot(), before);
      assert.equal(f.providerCalls(), 0);
    } finally {
      f.db.close();
    }
  });
}

test("invalid, expired and revoked invitations cannot obtain eligibility or read shared policy", async () => {
  const f = availabilityFixture();
  try {
    const currentInvites = f.env.CLOUD_AI_INVITES;
    for (const invites of [
      f.env.CLOUD_AI_INVITES,
      JSON.stringify({
        [f.hash]: {
          country: "MA",
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      }),
      "{}",
    ]) {
      f.env.CLOUD_AI_INVITES = invites;
      const response = await handleAvailability(
        f.request(invites === currentInvites ? "B".repeat(43) : f.code),
        f.env,
        { ledger: f.ledger, adapters: [f.adapter] },
      );
      assert.equal(response.status, 403);
      assert.equal(
        validateAvailability(await response.json()),
        "invalid_invitation",
      );
    }
    assert.equal(f.queries.length, 0);
  } finally {
    f.db.close();
  }
});

test("existing owner-only admitted-test exception remains separate from public release authorization", async () => {
  const f = availabilityFixture();
  try {
    delete f.env.CLOUD_AI_RELEASE_READY_UNTIL;
    f.env.CLOUD_AI_OWNER_TEST_INVITE_HASH = f.hash;
    f.env.CLOUD_AI_ADMIN_SECRET = "S".repeat(43);
    assert.equal(
      validateAvailability(
        await (
          await handleAvailability(f.request(), f.env, {
            ledger: f.ledger,
            adapters: [f.adapter],
          })
        ).json(),
      ),
      "restricted",
    );
    assert.equal(
      validateAvailability(
        await (
          await handleAvailability(f.request(f.code), f.env, {
            ledger: f.ledger,
            adapters: [f.adapter],
          })
        ).json(),
      ),
      "eligible",
    );
    assert.equal(f.providerCalls(), 0);
  } finally {
    f.db.close();
  }
});

test("visible availability never authorizes image processing without invitation and explicit consent", async () => {
  const f = availabilityFixture();
  try {
    const before = f.snapshot();
    const cases: Record<string, string>[] = [
      {},
      { authorization: `Bearer ${f.code}` },
      {
        "x-cloud-consent": "external-v1",
        "x-cloud-eligibility": "adult-ma-professional-nonsensitive-v1",
      },
    ];
    for (const headers of cases) {
      const request = new Request("http://127.0.0.1:3001/api/cloud-vision", {
        method: "POST",
        headers: { origin: f.env.CLOUD_AI_ORIGIN!, ...headers },
        body: "not an image",
      });
      assert.ok(
        (
          await handleVision(request, f.env, {
            ledger: f.ledger,
            adapters: [f.adapter],
          })
        ).status >= 400,
      );
    }
    assert.equal(f.snapshot(), before);
    assert.equal(f.providerCalls(), 0);
  } finally {
    f.db.close();
  }
});

test("availability rejects cross-site requests and client schemas with operational details", async () => {
  const f = availabilityFixture();
  try {
    const response = await handleAvailability(
      new Request("http://127.0.0.1:3001/api/cloud-vision/status", {
        headers: { origin: "https://evil.invalid" },
      }),
      f.env,
      { ledger: f.ledger },
    );
    assert.equal(response.status, 403);
    assert.equal(f.queries.length, 0);
    const mismatch = await handleAvailability(
      f.request(f.code),
      { ...f.env, CLOUD_AI_ORIGIN: "https://different.invalid" },
      { ledger: f.ledger, adapters: [f.adapter] },
    );
    assert.equal(validateAvailability(await mismatch.json()), "unavailable");
    assert.equal(f.queries.length, 0);
    assert.throws(() =>
      validateAvailability({
        schema: "cloud-availability/1",
        status: "eligible",
        model: "private",
      }),
    );
    assert.throws(() =>
      validateAvailability({ schema: "other", status: "eligible" }),
    );
    assert.throws(() =>
      validateAvailability({
        schema: "cloud-availability/1",
        status: ["eligible"],
      }),
    );
  } finally {
    f.db.close();
  }
});
