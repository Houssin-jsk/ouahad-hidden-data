// Explicit owner setup only. Never run by build/start or imported by a route.
import { loadEnvConfig } from "@next/env";
import { d1Credentials } from "../src/cloud-vision/server/database";
import {
  LEDGER_SCHEMA,
  SharedLedger,
  d1Query,
} from "../src/cloud-vision/server/ledger";
import { V2_SCHEMA, V3_SCHEMA } from "../src/cloud-vision/server/schema";
import { boundedJson } from "../src/cloud-vision/server/http";
import { verifyRemoteD1 } from "./cloud-d1-verification";
loadEnvConfig(process.cwd());
async function main() {
  const command = process.argv[2];
  if (!["connect", "check", "migrate", "verify"].includes(command))
    throw Error("Use connect, check, migrate or verify.");
  // Explicit owner maintenance is independent of runtime inference eligibility.
  // This never writes a free-tier attestation or enables a model/public access.
  const { account, database, token } = d1Credentials(process.env);
  const ledger = new SharedLedger(
    d1Query(account, database, token, AbortSignal.timeout(180000)),
  );
  await ledger.query("SELECT 1 AS connected", []);
  if (command === "connect") {
    console.log(
      JSON.stringify({ connected: true, inferenceEligibilityChanged: false }),
    );
    return;
  }
  if (command === "migrate") {
    await ledger.query(
      "CREATE TABLE IF NOT EXISTS cloud_schema_migrations(version INTEGER PRIMARY KEY,applied INTEGER NOT NULL)",
      [],
    );
    const applied = await ledger.query(
      "SELECT version FROM cloud_schema_migrations",
      [],
    );
    const base = LEDGER_SCHEMA.slice(
      0,
      LEDGER_SCHEMA.length - V2_SCHEMA.length - V3_SCHEMA.length,
    );
    for (const [version, statements] of [
      [1, base],
      [2, V2_SCHEMA],
      [3, V3_SCHEMA],
    ] as const) {
      if (applied.some((row) => row.version === version)) continue;
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            batch: [
              ...statements.map((sql) => ({ sql, params: [] })),
              {
                sql: "INSERT INTO cloud_schema_migrations(version,applied) VALUES(?,CAST(strftime('%s','now') AS INTEGER)*1000)",
                params: [version],
              },
            ],
          }),
          signal: AbortSignal.timeout(30000),
          redirect: "error",
        },
      );
      const value = (await boundedJson(response, 262144)) as {
        success?: boolean;
        result?: { success?: boolean }[];
      };
      if (
        !response.ok ||
        value.success !== true ||
        !value.result?.length ||
        value.result.some((r) => r.success !== true)
      )
        throw Error(
          "Migration failed. Keep inference disabled and inspect the D1 migration status before retrying.",
        );
      console.log(`Applied schema migration ${version}.`);
    }
  }
  if (command === "verify") await verifyRemoteD1(ledger, process.env);
  const state = await ledger.settings();
  const models = await ledger.models();
  console.log(
    JSON.stringify({
      connected: true,
      models: models.length,
      emergencyStop: state.config.kill,
      changesInferenceSettings: false,
      note: "This check does not enable inference or prove model billing eligibility.",
    }),
  );
}
void main().catch((error) => {
  console.error(
    "D1 setup/check blocked. Verify Workers Free, D1 token permissions, database ID and migrations. No credentials were printed.",
  );
  if (
    error instanceof Error &&
    error.message.startsWith("Verification failed:")
  )
    console.error(error.message);
  process.exitCode = 1;
});
