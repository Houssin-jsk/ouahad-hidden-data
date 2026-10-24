import { boundedJson } from "./http";
import type { Cooldowns } from "./types";
import { randomUUID } from "node:crypto";
import { V2_SCHEMA } from "./schema";
import {
  MODEL_CEILINGS,
  MODEL_KEYS,
  TOKEN_RESERVATION,
  quotaDay,
  validateGlobalPolicy,
  type ProviderPolicy,
  type ModelKey,
} from "./policy";
import type {
  ProviderAdapter,
  ProviderResponse,
  ProviderFailure,
  RoutingControls,
} from "./types";
export const DB_NOW = "(CAST(strftime('%s','now') AS INTEGER)*1000)";
export const LEDGER_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS cloud_jobs (id TEXT PRIMARY KEY, client TEXT NOT NULL, created INTEGER NOT NULL, lease_until INTEGER NOT NULL, released INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS cloud_jobs_time ON cloud_jobs(created)",
  "CREATE INDEX IF NOT EXISTS cloud_jobs_client ON cloud_jobs(client, created)",
  "CREATE TABLE IF NOT EXISTS cloud_cooldowns (provider TEXT PRIMARY KEY, until_time INTEGER)",
  ...V2_SCHEMA,
];
// SQLite/D1 serializes each INSERT ... SELECT. Limits and admission happen in one
// statement across all serverless instances, rather than read-then-write counters.
export type SqlQuery = (
  sql: string,
  params: (string | number | null)[],
) => Promise<Record<string, unknown>[]>;
export class SharedLedger implements Cooldowns {
  constructor(readonly query: SqlQuery) {}
  async now() {
    const rows = await this.query(`SELECT ${DB_NOW} AS now`, []);
    if (typeof rows[0]?.now !== "number" || !Number.isSafeInteger(rows[0].now))
      throw Error("Database clock unavailable");
    return rows[0].now;
  }
  async settings() {
    const rows = await this.query(
      "SELECT config,revision FROM ai_settings WHERE id=1",
      [],
    );
    if (
      typeof rows[0]?.config !== "string" ||
      typeof rows[0]?.revision !== "number"
    )
      throw Error("Shared settings missing");
    return {
      config: validateGlobalPolicy(JSON.parse(rows[0].config)),
      revision: rows[0].revision,
    };
  }
  async models() {
    return (await this.query(
      "SELECT * FROM providers ORDER BY priority,model_key",
      [],
    )) as unknown as ProviderPolicy[];
  }
  async admit(client: string, id: string, time?: number, requestKey = id) {
    const now = time ?? (await this.now());
    const { config, revision } = await this.settings();
    if (config.kill) return false;
    const day = Math.floor(now / 86400000) * 86400000;
    const rows = await this.query(
      `INSERT INTO cloud_jobs(id,client,created,lease_until,request_key)
      SELECT ?,?,?,?,? WHERE (SELECT revision FROM ai_settings WHERE id=1)=? AND
      (SELECT COUNT(*) FROM cloud_jobs WHERE created>=?) < ? AND
      (SELECT COUNT(*) FROM cloud_jobs WHERE created>?) < ? AND
      (SELECT COUNT(*) FROM cloud_jobs WHERE client=? AND created>=?) < ? AND
      (SELECT COUNT(*) FROM cloud_jobs WHERE client=? AND created>?) < ? AND
      (SELECT COUNT(*) FROM cloud_jobs WHERE released=0 AND lease_until>?) < ?
      ON CONFLICT DO NOTHING RETURNING id`,
      [
        id,
        client,
        now,
        now + 120000,
        requestKey,
        revision,
        day,
        config.dailyActions,
        now - 60000,
        config.minuteActions,
        client,
        day,
        config.visitorDaily,
        client,
        now - 60000,
        config.visitorMinute,
        now,
        config.concurrency,
      ],
    );
    return rows.length === 1;
  }
  async release(id: string) {
    await this.query("UPDATE cloud_jobs SET released = 1 WHERE id = ?", [id]);
  }
  async get(provider: string): Promise<number | "suspended" | undefined> {
    const rows = await this.query(
      "SELECT until_time FROM cloud_cooldowns WHERE provider = ?",
      [provider],
    );
    if (!rows.length) return undefined;
    const until = rows[0].until_time;
    if (until === null) return "suspended";
    if (typeof until !== "number" || !Number.isSafeInteger(until))
      throw Error("Invalid ledger response");
    return until;
  }
  async set(provider: string, until: number | "suspended") {
    await this.query(
      "INSERT INTO cloud_cooldowns(provider, until_time) VALUES (?, ?) ON CONFLICT(provider) DO UPDATE SET until_time = CASE WHEN cloud_cooldowns.until_time IS NULL OR excluded.until_time IS NULL THEN NULL ELSE MAX(cloud_cooldowns.until_time, excluded.until_time) END",
      [provider, until === "suspended" ? null : until],
    );
  }
  async reserve(action: string, adapter: ProviderAdapter) {
    if (
      !adapter.eligibility.enabled ||
      adapter.id === "nvidia" ||
      !MODEL_KEYS.includes(adapter.model as ModelKey)
    )
      return null;
    const ceiling = MODEL_CEILINGS[adapter.model as ModelKey];
    if (!ceiling.daily) return null; // No measured, free Cloudflare Neurons envelope yet.
    const now = await this.now();
    const { config, revision } = await this.settings();
    if (config.kill) return null;
    const day = quotaDay(now, adapter.id === "gemini" ? "pacific" : "utc");
    const minute = Math.floor(now / 60000) * 60000;
    const id = randomUUID();
    const rows = await this.query(
      `INSERT INTO request_logs(id,action_id,model_key,provider,started,lease_until,reserved_tokens,fallback,minute_start,day_start,day_end)
      SELECT ?,j.id,p.model_key,p.provider,?,?,?,CASE WHEN (SELECT COUNT(*) FROM request_logs WHERE action_id=j.id)>0 THEN 1 ELSE 0 END,?,?,?
      FROM providers p JOIN cloud_jobs j ON j.id=? JOIN ai_settings s ON s.id=1
      WHERE p.model_key=? AND p.provider=? AND p.enabled=1 AND p.eligibility='eligible' AND s.revision=? AND json_extract(s.config,'$.kill')=0
      AND j.released=0 AND j.lease_until>? AND ${DB_NOW}>=? AND ${DB_NOW}<?
      AND p.daily_cap BETWEEN 1 AND ? AND p.rpm_cap BETWEEN 1 AND ? AND p.tpm_cap BETWEEN ? AND ?
      AND NOT EXISTS(SELECT 1 FROM cloud_cooldowns WHERE provider IN (p.model_key,p.provider) AND (until_time IS NULL OR until_time>?))
      AND (SELECT COUNT(*) FROM request_logs WHERE action_id=j.id)<3
      AND (SELECT COUNT(*) FROM request_logs WHERE outcome='reserved' AND lease_until>?)<?
      AND COALESCE((SELECT reserved_requests FROM usage_counters WHERE scope=p.model_key AND window_type='day' AND window_start=?),0)<p.daily_cap
      AND COALESCE((SELECT reserved_requests FROM usage_counters WHERE scope='project:'||p.provider AND window_type='day' AND window_start=?),0)<?
      AND COALESCE((SELECT reserved_tokens FROM usage_counters WHERE scope='project:'||p.provider AND window_type='day' AND window_start=?),0)+?<=?
      AND (SELECT COUNT(*) FROM request_logs WHERE model_key=p.model_key AND started>?)<p.rpm_cap
      AND (SELECT COUNT(*) FROM request_logs WHERE provider=p.provider AND started>?)<?
      AND COALESCE((SELECT SUM(MAX(reserved_tokens,COALESCE(actual_tokens,0))) FROM request_logs WHERE model_key=p.model_key AND started>?),0)+?<=p.tpm_cap
      AND COALESCE((SELECT SUM(MAX(reserved_tokens,COALESCE(actual_tokens,0))) FROM request_logs WHERE provider=p.provider AND started>?),0)+?<=?
      ON CONFLICT DO NOTHING RETURNING id`,
      [
        id,
        now,
        now + 120000,
        TOKEN_RESERVATION,
        minute,
        day.start,
        day.end,
        action,
        adapter.model,
        adapter.id,
        revision,
        now,
        day.start,
        day.end,
        ceiling.daily,
        ceiling.rpm,
        TOKEN_RESERVATION,
        ceiling.tpm,
        now,
        now,
        config.concurrency,
        day.start,
        day.start,
        config.projectDaily,
        day.start,
        TOKEN_RESERVATION,
        config.projectDailyTokens,
        now - 60000,
        now - 60000,
        config.projectRpm,
        now - 60000,
        TOKEN_RESERVATION,
        now - 60000,
        TOKEN_RESERVATION,
        config.projectTpm,
      ],
    );
    return rows.length === 1 ? id : null;
  }
  async settle(
    id: string,
    response?: ProviderResponse,
    error?: ProviderFailure,
  ) {
    const usage = response?.usage;
    const number = (n: number | undefined) =>
      typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
    const total =
      number(usage?.totalTokens) ??
      (usage?.inputTokens !== undefined && usage?.outputTokens !== undefined
        ? number(usage.inputTokens + usage.outputTokens)
        : null);
    const outcome = response
      ? "completed"
      : error && ["timeout", "cancelled", "outage"].includes(error.kind)
        ? "uncertain"
        : "failed";
    await this.query(
      `UPDATE request_logs SET outcome=?,error_category=?,duration_ms=MAX(0,${DB_NOW}-started),input_tokens=?,output_tokens=?,actual_tokens=?,actual_neurons=? WHERE id=? AND outcome='reserved'`,
      [
        outcome,
        error?.kind ?? null,
        number(usage?.inputTokens),
        number(usage?.outputTokens),
        total,
        number(usage?.neurons),
        id,
      ],
    );
  }
  routing(action: string): RoutingControls {
    return {
      now: () => this.now(),
      get: (key) => this.get(key),
      set: (key, until) => this.set(key, until),
      reserve: (adapter) => this.reserve(action, adapter),
      settle: (id, response, error) => this.settle(id, response, error),
    };
  }
  async prune(time?: number) {
    const now = time ?? (await this.now());
    await this.query(
      `UPDATE request_logs SET outcome='uncertain',error_category='lease_expired',duration_ms=MAX(0,?-started) WHERE outcome='reserved' AND lease_until<=?`,
      [now, now],
    );
    await this.query("DELETE FROM request_logs WHERE started<?", [
      now - 7 * 86400000,
    ]);
    await Promise.all(
      (
        [
          ["usage_counters", "window_end", 8],
          ["cloud_jobs", "created", 8],
          ["admin_audit", "created", 30],
          ["admin_sessions", "expires", 0],
          ["admin_login_attempts", "created", 1],
        ] as const
      ).map(([table, column, age]) =>
        this.query(`DELETE FROM ${table} WHERE ${column}<?`, [
          now - age * 86400000,
        ]),
      ),
    );
  }
}
export function d1Query(
  account: string,
  database: string,
  token: string,
  signal: AbortSignal,
): SqlQuery {
  if (!/^[a-f0-9]{32}$/.test(account) || !/^[a-f0-9-]{36}$/.test(database))
    throw Error("Invalid ledger configuration");
  return async (sql, params) => {
    const combined = AbortSignal.any([signal, AbortSignal.timeout(4000)]);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ sql, params }),
        signal: combined,
        cache: "no-store",
        redirect: "error",
      },
    );
    const value = (await boundedJson(response, 262144, combined)) as {
      success?: boolean;
      result?: { success?: boolean; results?: Record<string, unknown>[] }[];
    };
    const first = value.result?.[0];
    if (
      !response.ok ||
      value.success !== true ||
      first?.success !== true ||
      !Array.isArray(first.results)
    )
      throw Error(`Ledger unavailable (HTTP ${response.status})`);
    return first.results;
  };
}
