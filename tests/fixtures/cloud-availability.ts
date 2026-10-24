import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import {
  LEDGER_SCHEMA,
  SharedLedger,
} from "../../src/cloud-vision/server/ledger";
import { DEFAULT_POLICY } from "../../src/cloud-vision/server/policy";
import type { Environment } from "../../src/cloud-vision/server/config";
import type { ProviderAdapter } from "../../src/cloud-vision/server/types";

export function availabilityFixture() {
  const db = new DatabaseSync(":memory:");
  LEDGER_SCHEMA.forEach((sql) => db.exec(sql));
  db.prepare("UPDATE ai_settings SET config=?").run(
    JSON.stringify({ ...DEFAULT_POLICY, kill: false }),
  );
  db.exec(
    "UPDATE providers SET enabled=1,eligibility='eligible' WHERE model_key='gemini-3.5-flash-lite'",
  );
  const queries: string[] = [];
  const ledger = new SharedLedger(async (sql, params) => {
    queries.push(sql);
    return db.prepare(sql).all(...params) as Record<string, unknown>[];
  });
  const code = "A".repeat(43),
    hash = createHash("sha256").update(code).digest("hex");
  const until = new Date(Date.now() + 86400000).toISOString();
  const env: Environment = {
    CLOUD_AI_ORIGIN: "http://127.0.0.1:3001",
    CLOUD_AI_RELEASE_READY_UNTIL: until,
    CLOUD_AI_INVITES: JSON.stringify({
      [hash]: { country: "MA", expiresAt: until },
    }),
  };
  let calls = 0;
  const adapter: ProviderAdapter = {
    id: "gemini",
    model: "gemini-3.5-flash-lite",
    eligibility: { enabled: true, reason: "test-only" },
    constraints: {
      mime: "image/jpeg",
      maxBytes: 768 * 1024,
      maxSide: 1024,
      outputTokens: 480,
    },
    run: async () => {
      calls++;
      throw Error("Availability must never call a provider");
    },
  };
  const snapshot = () =>
    JSON.stringify(
      (
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
          )
          .all() as { name: string }[]
      ).map(({ name }) => ({
        name,
        rows: db.prepare(`SELECT * FROM "${name}"`).all(),
      })),
    );
  const request = (invite?: string) =>
    new Request("http://127.0.0.1:3001/api/cloud-vision/status", {
      headers: {
        "sec-fetch-site": "same-origin",
        ...(invite ? { authorization: `Bearer ${invite}` } : {}),
      },
    });
  return {
    db,
    ledger,
    env,
    code,
    hash,
    adapter,
    queries,
    snapshot,
    request,
    providerCalls: () => calls,
  };
}
