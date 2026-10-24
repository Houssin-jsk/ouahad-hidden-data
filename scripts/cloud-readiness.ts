// Read-only production inspection. No login, inference, migration or renewal.
import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import { d1Credentials } from "../src/cloud-vision/server/database";
import { verifiedUntil } from "../src/cloud-vision/server/config";
import {
  DB_NOW,
  SharedLedger,
  d1Query,
} from "../src/cloud-vision/server/ledger";

loadEnvConfig(process.cwd());
async function main() {
  const names = [
    "GEMINI_API_KEY",
    "NVIDIA_API_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_D1_DATABASE_ID",
    "CLOUDFLARE_D1_API_TOKEN",
    "CLOUD_AI_D1_DATABASE_ID",
    "CLOUD_AI_D1_API_TOKEN",
    "CLOUD_AI_ADMIN_SECRET",
    "CLOUD_AI_ORIGIN",
    "CLOUD_AI_INVITES",
    "CLOUD_AI_OWNER_TEST_INVITE_HASH",
  ];
  const attestations = [
    "CLOUD_AI_D1_FREE_UNTIL",
    "CLOUD_AI_GEMINI_FREE_UNTIL",
    "CLOUD_AI_GEMINI_31_VISION_UNTIL",
    "CLOUD_AI_CF_FREE_UNTIL",
    "CLOUD_AI_RELEASE_READY_UNTIL",
  ];
  const { account, database, token } = d1Credentials(process.env);
  const query = d1Query(account, database, token, AbortSignal.timeout(30000));
  const ledger = new SharedLedger((sql, params) => {
    if (!/^SELECT\b/.test(sql.trim()))
      throw Error("Read-only inspection required");
    return query(sql, params);
  });
  const remoteDatabase = await (async () => {
    const [settings, models, operations, accounting, migrations] =
      await Promise.all([
        ledger.settings(),
        ledger.models(),
        ledger.query(
          `SELECT
      (SELECT COUNT(*) FROM admin_sessions WHERE expires>${DB_NOW}) AS activeOwnerSessions,
      (SELECT COUNT(*) FROM cloud_jobs WHERE released=0 AND lease_until>${DB_NOW}) AS activeJobs,
      (SELECT COUNT(*) FROM request_logs WHERE outcome='uncertain' OR (outcome='reserved' AND lease_until<=${DB_NOW})) AS uncertainReservations`,
          [],
        ),
        ledger.query(
          "SELECT outcome,COUNT(*) AS attempts,SUM(reserved_tokens) AS reservedTokens,SUM(actual_tokens) AS reportedTokens FROM request_logs GROUP BY outcome",
          [],
        ),
        ledger.query(
          "SELECT version FROM cloud_schema_migrations ORDER BY version",
          [],
        ),
      ]);
    return {
      emergencyStop: settings.config.kill,
      policy: settings.config,
      models: models.map((m) => ({
        model: m.model_key,
        enabled: m.enabled === 1,
        eligibility: m.eligibility,
        daily: m.daily_cap,
        rpm: m.rpm_cap,
        tpm: m.tpm_cap,
      })),
      ...operations[0],
      accounting,
      schemaVersions: migrations.map((m) => m.version),
    };
  })().catch((error: unknown) => ({
    unavailable: true,
    error: error instanceof Error ? error.name : "UnknownError",
    code: (error as { cause?: { code?: string } })?.cause?.code,
  }));
  const origin = "https://hidden-data.ouahad.space";
  const http = await Promise.all(
    ["/", "/api/cloud-vision/status", "/api/admin/ai", "/api/cloud-vision"].map(
      async (path) => {
        try {
          const response = await fetch(origin + path, {
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
          });
          const status = path.endsWith("/status")
            ? (await response.json()).status
            : undefined;
          await response.body?.cancel().catch(() => {});
          return {
            path,
            httpStatus: response.status,
            availability: status,
            cacheControl: response.headers.get("cache-control"),
          };
        } catch (error: unknown) {
          return {
            path,
            unavailable: true,
            error: error instanceof Error ? error.name : "UnknownError",
            code: (error as { cause?: { code?: string } })?.cause?.code,
          };
        }
      },
    ),
  );
  const result = {
    checkedAt: new Date().toISOString(),
    environmentSource:
      "Local runtime configuration; not proof of deployed environment values",
    localEnvironment: Object.fromEntries(
      names.map((name) => [name, Boolean(process.env[name])]),
    ),
    localAttestations: Object.fromEntries(
      attestations.map((name) => [
        name,
        !process.env[name]
          ? "absent"
          : verifiedUntil(process.env[name])
            ? "current"
            : "expired or invalid",
      ]),
    ),
    remoteDatabase,
    productionHttp: http,
    mutations: 0,
    inferenceRequests: 0,
  };
  if (process.argv[2])
    await writeFile(process.argv[2], JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
  if (
    "unavailable" in remoteDatabase ||
    http.some(
      (entry, index) => entry.httpStatus !== [200, 200, 401, 405][index],
    )
  )
    process.exitCode = 1;
}
void main().catch((error: unknown) => {
  if (
    error instanceof Error &&
    /^Ledger unavailable \(HTTP \d{3}\)$/.test(error.message)
  )
    console.error(error.message);
  console.error(
    "Read-only inspection failed. Verify D1 credentials, network access and migrations. No credentials were printed; no settings were changed.",
  );
  process.exitCode = 1;
});
