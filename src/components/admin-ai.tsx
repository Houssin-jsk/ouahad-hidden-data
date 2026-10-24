"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  GlobalPolicy,
  ProviderPolicy,
} from "@/cloud-vision/server/policy";
interface Model extends ProviderPolicy {
  eligible: boolean;
  status: string;
  statusReason: string;
  effectiveEnabled: boolean;
  minuteAttempts: number;
  minuteReservedTokens: number;
  reason: string;
  used: number;
  remainingInternal: number;
  reservedTokens: number;
  actualTokens: number;
  actualNeurons: number;
  nextReset: number;
  cooldownUntil?: number | null;
  lastError: string | null;
  ceiling: { daily: number; rpm: number; tpm: number };
}
interface Snapshot {
  csrf: string;
  settings: { config: GlobalPolicy; revision: number };
  models: Model[];
  overview: Record<string, number>;
  logs: Record<string, unknown>[];
  audit: Record<string, unknown>[];
  now: number;
  primary: string | null;
  publicReleaseVerified: boolean;
  providerBalance: string;
  database: { status: string; checkedAt: number };
}
const utc = (time: number) =>
  new Date(time).toISOString().replace("T", " ").slice(0, 19) + " UTC";
export function AdminConsole({ initial }: { initial: Snapshot | null }) {
  const [data, setData] = useState(initial);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch("/api/admin/ai", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) {
      setData(null);
      throw Error("Owner session unavailable. Sign in again.");
    }
    setData(await response.json());
  }
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ai/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-action": "session-v1",
        },
        body: JSON.stringify({ secret }),
        credentials: "same-origin",
        cache: "no-store",
      });
      setSecret("");
      const value = await response.json();
      if (!response.ok) throw Error(value.message);
      await refresh();
      setMessage("Owner session opened for one hour.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Owner access unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function change(body: unknown) {
    if (!data) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-csrf": data.csrf,
        },
        body: JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
      });
      const value = await response.json();
      if (!response.ok) throw Error(value.message);
      await refresh();
      setMessage("Change saved and audited.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Change unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (!data) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/ai/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-action": "session-v1",
          "x-admin-csrf": data.csrf,
        },
        body: JSON.stringify({ action: "logout" }),
        credentials: "same-origin",
      });
      if (!response.ok) throw Error();
      setData(null);
      setMessage("Signed out.");
    } catch {
      setMessage(
        "Sign-out could not be confirmed. The session expires after one hour.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-ai">
      <header>
        <Link href="/">HIDDEN DATA.</Link>
        <span className="eyebrow">OWNER CONTROL CENTER</span>
      </header>
      <h1>AI operations.</h1>
      <p className="admin-lead">
        One shared capacity pool for AI Visual Observations.
      </p>
      {message && (
        <p role="status" className="cloud-status">
          {message}
        </p>
      )}
      {!data ? (
        <section>
          <h2>Owner access</h2>
          <p>
            This protected dashboard requires the owner credential and a
            verified shared database. Public image measurements remain
            available.
          </p>
          <form onSubmit={(e) => void login(e)}>
            <label htmlFor="admin-secret">Owner access key</label>
            <input
              id="admin-secret"
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              maxLength={43}
              required
            />
            <button disabled={busy || secret.length !== 43}>Sign in</button>
          </form>
        </section>
      ) : (
        <>
          <div className="admin-actions">
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void refresh()
                  .catch((e) => setMessage(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              Refresh
            </button>
            <button disabled={busy} onClick={() => void logout()}>
              Sign out
            </button>
            <button
              className="admin-stop"
              disabled={busy}
              onClick={() =>
                void change({
                  action: "global",
                  config: { ...data.settings.config, kill: true },
                  revision: data.settings.revision,
                })
              }
            >
              Emergency stop
            </button>
          </div>
          <section>
            <h2>Service overview</h2>
            <p>
              Shared database: {data.database.status} · checked{" "}
              {utc(data.database.checkedAt)}
            </p>
            <p>
              <strong>
                {data.settings.config.kill
                  ? "PAUSED"
                  : data.publicReleaseVerified
                    ? "Restricted pilot enabled"
                    : "Owner testing only · public release blocked"}
              </strong>
            </p>
            <p>Primary eligible model: {data.primary ?? "None"}</p>
            <p className="result-footnote">
              Snapshot: {utc(data.now)}. Totals below use UTC today; Gemini
              quota days reset at midnight Pacific. {data.providerBalance}
            </p>
            <dl className="admin-metrics">
              {Object.entries({
                "Accepted analyses": data.overview.accepted_actions,
                "Distinct invited participants": data.overview.participants,
                "Provider attempts": data.overview.provider_attempts,
                "Successful attempts": data.overview.completed,
                "Failed / uncertain attempts": data.overview.failed,
                "Uncertain / expired reservations": data.overview.uncertain,
                "Reserved tokens": data.overview.reserved_tokens,
                "Reported tokens": data.overview.reported_tokens,
                "Fallback attempts": data.overview.fallbacks,
                "Active reservations": data.overview.active,
              }).map(([title, value]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2>Shared policy</h2>
            <form
              key={data.settings.revision}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const config = {
                  ...data.settings.config,
                  kill: values.get("kill") === "on",
                };
                for (const key of Object.keys(config) as (keyof GlobalPolicy)[])
                  if (key !== "kill") config[key] = Number(values.get(key));
                void change({
                  action: "global",
                  config,
                  revision: data.settings.revision,
                });
              }}
            >
              <label className="cloud-check">
                <input
                  type="checkbox"
                  name="kill"
                  defaultChecked={data.settings.config.kill}
                />{" "}
                Pause new inference
              </label>
              <div className="admin-fields">
                {Object.entries({
                  dailyActions: ["Global analyses / UTC day", 60],
                  minuteActions: ["Global analyses / rolling minute", 6],
                  concurrency: ["Global concurrency", 2],
                  visitorDaily: ["Per participant / UTC day", 3],
                  visitorMinute: ["Per participant / rolling minute", 1],
                  projectDaily: ["Gemini project attempts / Pacific day", 300],
                  projectRpm: ["Gemini project attempts / rolling minute", 10],
                  projectTpm: [
                    "Gemini project reserved tokens / minute",
                    200000,
                  ],
                  projectDailyTokens: [
                    "Gemini project reserved tokens / Pacific day",
                    1000000,
                  ],
                }).map(([key, [label, max]]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      type="number"
                      min={1}
                      max={Number(max)}
                      defaultValue={Number(
                        data.settings.config[key as keyof GlobalPolicy],
                      )}
                      required
                    />
                  </label>
                ))}
              </div>
              <button disabled={busy}>Save shared policy</button>
            </form>
          </section>
          <section>
            <h2>Provider management</h2>
            <p>
              Remaining counts are conservative internal estimates. Failed and
              uncertain attempts keep their reservations. External account usage
              is not included.
            </p>
            <div className="admin-models">
              {data.models.map((model) => (
                <article key={model.model_key}>
                  <h3>{model.model_key}</h3>
                  <p>
                    <strong>{model.status}</strong> · {model.provider}
                  </p>
                  <p>{model.statusReason}</p>
                  <p className="result-footnote">{model.reason}</p>
                  <p>
                    Daily attempts: {model.used} / {model.daily_cap} · Internal
                    remaining: {model.remainingInternal}
                  </p>
                  <p>
                    Tokens: {model.actualTokens} reported /{" "}
                    {model.reservedTokens} conservatively charged.{" "}
                    {model.provider === "cloudflare"
                      ? "Neurons not qualified; allocation is zero."
                      : ""}
                  </p>
                  <p>
                    Rolling minute: {model.minuteAttempts} attempts /{" "}
                    {model.rpm_cap} · {model.minuteReservedTokens} charged
                    tokens / {model.tpm_cap}.
                  </p>
                  <p>Next quota-day reset: {utc(model.nextReset)}</p>
                  {model.cooldownUntil !== undefined && (
                    <p>
                      Cooldown:{" "}
                      {model.cooldownUntil === null
                        ? "Operator verification required"
                        : utc(model.cooldownUntil)}
                    </p>
                  )}
                  {model.lastError && <p>Last error: {model.lastError}</p>}
                  <form
                    key={model.revision}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const values = new FormData(event.currentTarget);
                      void change({
                        action: "provider",
                        change: {
                          model: model.model_key,
                          enabled: values.get("enabled") === "on",
                          priority: Number(values.get("priority")),
                          daily: Number(values.get("daily")),
                          rpm: Number(values.get("rpm")),
                          tpm: Number(values.get("tpm")),
                          revision: model.revision,
                        },
                      });
                    }}
                  >
                    <label className="cloud-check">
                      <input
                        name="enabled"
                        type="checkbox"
                        defaultChecked={model.enabled === 1}
                        disabled={!model.eligible && model.enabled !== 1}
                      />{" "}
                      Enable eligible model
                    </label>
                    <div className="admin-fields">
                      {(
                        [
                          ["priority", "Priority", 4, 1],
                          [
                            "daily",
                            "Daily attempt cap",
                            model.ceiling.daily,
                            0,
                          ],
                          ["rpm", "Rolling RPM cap", model.ceiling.rpm, 0],
                          [
                            "tpm",
                            "Rolling reserved TPM cap",
                            model.ceiling.tpm,
                            0,
                          ],
                        ] as const
                      ).map(([key, label, max, min]) => (
                        <label key={key}>
                          {label}
                          <input
                            name={key}
                            type="number"
                            min={min}
                            max={max}
                            defaultValue={
                              key === "priority"
                                ? model.priority
                                : key === "daily"
                                  ? model.daily_cap
                                  : key === "rpm"
                                    ? model.rpm_cap
                                    : model.tpm_cap
                            }
                            required
                          />
                        </label>
                      ))}
                    </div>
                    <p className="result-footnote">
                      Last verified configuration:{" "}
                      {model.verified_at
                        ? utc(model.verified_at)
                        : "Unverified"}
                    </p>
                    <button disabled={busy}>Save model settings</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2>Recent provider events</h2>
            {data.logs.length ? (
              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time (UTC)</th>
                      <th>Model</th>
                      <th>Outcome</th>
                      <th>Error</th>
                      <th>Duration</th>
                      <th>Reserved tokens</th>
                      <th>Reported tokens</th>
                      <th>Fallback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((row) => (
                      <tr key={String(row.id)}>
                        <td>{utc(Number(row.started))}</td>
                        <td>{String(row.model_key)}</td>
                        <td>{String(row.outcome)}</td>
                        <td>{String(row.error_category ?? "—")}</td>
                        <td>
                          {row.duration_ms === null
                            ? "Pending"
                            : `${row.duration_ms} ms`}
                        </td>
                        <td>{String(row.reserved_tokens)}</td>
                        <td>
                          {row.actual_tokens === null
                            ? "Unknown"
                            : String(row.actual_tokens)}
                        </td>
                        <td>
                          {row.fallback
                            ? `Yes · ${String(row.fallback_reason ?? "Prior provider attempt")}`
                            : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No provider attempts recorded.</p>
            )}
          </section>
          <section>
            <h2>Administrative history</h2>
            {data.audit.length ? (
              <ul className="admin-audit">
                {data.audit.map((row, i) => (
                  <li key={i}>
                    <strong>
                      {utc(Number(row.created))} · {String(row.action)} ·{" "}
                      {String(row.setting)}
                    </strong>
                    <p>{String(row.outcome)}</p>
                    {Boolean(row.old_value) && (
                      <code>Before: {String(row.old_value)}</code>
                    )}
                    {Boolean(row.new_value) && (
                      <code>After: {String(row.new_value)}</code>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No administrative changes recorded.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
