import { verifiedUntil, type Environment } from "./config";
import { SharedLedger, d1Query } from "./ledger";
// Accept the owner's provider-prefixed names and the original application names.
// Conflicting pairs must fail closed rather than quietly selecting another DB.
export function d1Credentials(env: Environment) {
  function alias(providerName: string, legacyName: string) {
    const provider = env[providerName];
    const legacy = env[legacyName];
    if (provider && legacy && provider !== legacy)
      throw Error("Conflicting D1 configuration");
    return provider || legacy;
  }
  const database = alias(
    "CLOUDFLARE_D1_DATABASE_ID",
    "CLOUD_AI_D1_DATABASE_ID",
  );
  const token = alias("CLOUDFLARE_D1_API_TOKEN", "CLOUD_AI_D1_API_TOKEN");
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  if (!database || !token || !account)
    throw Error("D1 credentials are required");
  return { account, database, token };
}
export function configuredLedger(env: Environment, signal: AbortSignal) {
  if (!verifiedUntil(env.CLOUD_AI_D1_FREE_UNTIL))
    throw Error("Verified D1 connection is required");
  const { account, database, token } = d1Credentials(env);
  return new SharedLedger(d1Query(account, database, token, signal));
}
