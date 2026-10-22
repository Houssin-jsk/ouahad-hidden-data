import { DEFAULT_POLICY, MODEL_CEILINGS, MODEL_KEYS } from "./policy";
export const V2_SCHEMA = [
  "ALTER TABLE cloud_jobs ADD COLUMN request_key TEXT",
  "CREATE UNIQUE INDEX cloud_jobs_idempotency ON cloud_jobs(client, request_key) WHERE request_key IS NOT NULL",
  `CREATE TABLE ai_settings (id INTEGER PRIMARY KEY CHECK(id=1), config TEXT NOT NULL CHECK(json_valid(config)), revision INTEGER NOT NULL DEFAULT 0, actor TEXT NOT NULL DEFAULT 'migration', updated_at INTEGER NOT NULL DEFAULT 0)`,
  `INSERT INTO ai_settings(id,config) VALUES(1,'${JSON.stringify(DEFAULT_POLICY)}')`,
  `CREATE TABLE providers (model_key TEXT PRIMARY KEY, provider TEXT NOT NULL CHECK(provider IN ('gemini','cloudflare','nvidia')), priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 4), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)), eligibility TEXT NOT NULL DEFAULT 'unverified', daily_cap INTEGER NOT NULL CHECK(daily_cap BETWEEN 0 AND 300), rpm_cap INTEGER NOT NULL CHECK(rpm_cap BETWEEN 0 AND 10), tpm_cap INTEGER NOT NULL CHECK(tpm_cap BETWEEN 0 AND 200000), neuron_cap REAL NOT NULL DEFAULT 0 CHECK(neuron_cap>=0), reset_policy TEXT NOT NULL CHECK(reset_policy IN ('pacific','utc')), verified_at INTEGER, updated_at INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0, actor TEXT NOT NULL DEFAULT 'migration')`,
  ...MODEL_KEYS.map((key, i) => {
    const caps = MODEL_CEILINGS[key];
    return `INSERT INTO providers(model_key,provider,priority,daily_cap,rpm_cap,tpm_cap,reset_policy) VALUES('${key}','${i < 2 ? "gemini" : i === 2 ? "cloudflare" : "nvidia"}',${i + 1},${caps.daily},${caps.rpm},${caps.tpm},'${i < 2 ? "pacific" : "utc"}')`;
  }),
  `CREATE TABLE usage_counters (scope TEXT NOT NULL, window_type TEXT NOT NULL CHECK(window_type IN ('minute','day')), window_start INTEGER NOT NULL, window_end INTEGER NOT NULL, reserved_requests INTEGER NOT NULL DEFAULT 0, completed_requests INTEGER NOT NULL DEFAULT 0, failed_attempts INTEGER NOT NULL DEFAULT 0, reserved_tokens INTEGER NOT NULL DEFAULT 0, actual_tokens INTEGER NOT NULL DEFAULT 0, reserved_neurons REAL NOT NULL DEFAULT 0, actual_neurons REAL NOT NULL DEFAULT 0, PRIMARY KEY(scope,window_type,window_start))`,
  `CREATE TABLE request_logs (id TEXT PRIMARY KEY, action_id TEXT NOT NULL REFERENCES cloud_jobs(id), model_key TEXT NOT NULL REFERENCES providers(model_key), provider TEXT NOT NULL, started INTEGER NOT NULL, lease_until INTEGER NOT NULL, outcome TEXT NOT NULL DEFAULT 'reserved' CHECK(outcome IN ('reserved','completed','failed','uncertain')), error_category TEXT, duration_ms INTEGER, reserved_tokens INTEGER NOT NULL CHECK(reserved_tokens>0), input_tokens INTEGER, output_tokens INTEGER, actual_tokens INTEGER, reserved_neurons REAL NOT NULL DEFAULT 0, actual_neurons REAL, fallback INTEGER NOT NULL CHECK(fallback IN (0,1)), minute_start INTEGER NOT NULL, day_start INTEGER NOT NULL, day_end INTEGER NOT NULL, UNIQUE(action_id,model_key))`,
  "CREATE INDEX request_logs_model_time ON request_logs(model_key,started)",
  "CREATE INDEX request_logs_provider_time ON request_logs(provider,started)",
  "CREATE INDEX request_logs_action ON request_logs(action_id)",
  "CREATE INDEX request_logs_retention ON request_logs(started)",
  `CREATE TABLE admin_audit (id INTEGER PRIMARY KEY, created INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, setting TEXT NOT NULL, old_value TEXT, new_value TEXT, outcome TEXT NOT NULL)`,
  "CREATE INDEX admin_audit_created ON admin_audit(created)",
  `CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, csrf_hash TEXT NOT NULL, credential_hash TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`,
  "CREATE INDEX admin_sessions_expiry ON admin_sessions(expires)",
  `CREATE TABLE admin_login_attempts (id TEXT PRIMARY KEY, created INTEGER NOT NULL)`,
  "CREATE INDEX admin_login_time ON admin_login_attempts(created)",
  `CREATE TRIGGER settings_audit AFTER UPDATE OF config ON ai_settings BEGIN INSERT INTO admin_audit(created,actor,action,setting,old_value,new_value,outcome) VALUES(NEW.updated_at,NEW.actor,'update','global',OLD.config,NEW.config,'applied'); END`,
  `CREATE TRIGGER provider_audit AFTER UPDATE OF enabled,priority,daily_cap,rpm_cap,tpm_cap ON providers BEGIN INSERT INTO admin_audit(created,actor,action,setting,old_value,new_value,outcome) VALUES(NEW.updated_at,NEW.actor,'update',NEW.model_key,json_object('enabled',OLD.enabled,'priority',OLD.priority,'daily',OLD.daily_cap,'rpm',OLD.rpm_cap,'tpm',OLD.tpm_cap),json_object('enabled',NEW.enabled,'priority',NEW.priority,'daily',NEW.daily_cap,'rpm',NEW.rpm_cap,'tpm',NEW.tpm_cap),'applied'); END`,
  // Accounting is in the INSERT transaction itself, not a subsequent HTTP call.
  `CREATE TRIGGER request_reserve AFTER INSERT ON request_logs BEGIN
    INSERT INTO usage_counters(scope,window_type,window_start,window_end,reserved_requests,reserved_tokens,reserved_neurons)
    SELECT NEW.model_key,'minute',NEW.minute_start,NEW.minute_start+60000,1,NEW.reserved_tokens,NEW.reserved_neurons
    UNION ALL SELECT NEW.model_key,'day',NEW.day_start,NEW.day_end,1,NEW.reserved_tokens,NEW.reserved_neurons
    UNION ALL SELECT 'project:'||NEW.provider,'minute',NEW.minute_start,NEW.minute_start+60000,1,NEW.reserved_tokens,NEW.reserved_neurons
    UNION ALL SELECT 'project:'||NEW.provider,'day',NEW.day_start,NEW.day_end,1,NEW.reserved_tokens,NEW.reserved_neurons
    WHERE true ON CONFLICT(scope,window_type,window_start) DO UPDATE SET reserved_requests=reserved_requests+1,reserved_tokens=reserved_tokens+excluded.reserved_tokens,reserved_neurons=reserved_neurons+excluded.reserved_neurons;
  END`,
  `CREATE TRIGGER request_settle AFTER UPDATE OF outcome ON request_logs WHEN OLD.outcome='reserved' AND NEW.outcome!='reserved' BEGIN
    UPDATE usage_counters SET completed_requests=completed_requests+CASE WHEN NEW.outcome='completed' THEN 1 ELSE 0 END,failed_attempts=failed_attempts+CASE WHEN NEW.outcome!='completed' THEN 1 ELSE 0 END,actual_tokens=actual_tokens+COALESCE(NEW.actual_tokens,0),actual_neurons=actual_neurons+COALESCE(NEW.actual_neurons,0),reserved_tokens=reserved_tokens+MAX(0,COALESCE(NEW.actual_tokens,0)-NEW.reserved_tokens)
    WHERE scope IN (NEW.model_key,'project:'||NEW.provider) AND ((window_type='minute' AND window_start=NEW.minute_start) OR (window_type='day' AND window_start=NEW.day_start));
    UPDATE ai_settings SET config=json_set(config,'$.kill',json('true')),revision=revision+1,actor='safety-bound',updated_at=NEW.started WHERE COALESCE(NEW.actual_tokens,0)>NEW.reserved_tokens OR COALESCE(NEW.actual_neurons,0)>NEW.reserved_neurons;
  END`,
];
