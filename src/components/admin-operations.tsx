"use client";
import { useState } from "react";
import type { Snapshot } from "./admin-ai";
const names: Record<string, string> = {
  gemini: "Google Gemini",
  cloudflare: "Cloudflare Workers AI",
  nvidia: "NVIDIA",
};
const stamp = (v: unknown) =>
  v
    ? new Date(Number(v)).toISOString().replace("T", " ").slice(0, 19) + " UTC"
    : "Not recorded";
const number = (v: unknown) => Number(v ?? 0);
export function OperationsVisuals({
  data,
  onFilter,
}: {
  data: Snapshot;
  onFilter: (query: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("gemini"),
    [metric, setMetric] = useState("requests"),
    [interval, setInterval] = useState("hourly"),
    [point, setPoint] = useState<string | null>(null);
  const metrics = data.analytics;
  const journal = [
    ...metrics.events,
    ...data.audit
      .filter(
        (e) =>
          Number(e.created) >= metrics.from &&
          Number(e.created) <= metrics.to &&
          (!metrics.provider ||
            data.models.some(
              (m) =>
                m.model_key === e.setting && m.provider === metrics.provider,
            )),
      )
      .map((e) => ({
        created: e.created,
        provider: null,
        model: e.setting,
        kind: "administration",
        reason:
          e.setting === "global"
            ? "Global policy updated (emergency stop, public admission, fallback or limits); see audit values below."
            : "Model controls updated: " + String(e.setting),
      })),
  ]
    .sort((a, b) => Number(b.created) - Number(a.created))
    .slice(0, 100);
  const processing = data.logs.filter(
    (l) => l.outcome === "reserved" && Number(l.started) + 120000 > data.now,
  );
  const preferred = data.models.find((m) => m.effectiveEnabled);
  const remaining = Math.max(
    0,
    data.settings.config.dailyActions - number(data.overview.accepted_actions),
  );
  const rows = interval === "hourly" ? metrics.hourly : metrics.daily;
  const buckets = new Map<number, number>();
  for (const row of rows) {
    if (metric === "reported" && row.reported == null) continue;
    const t = number(row.time);
    const value =
      metric === "success"
        ? number(row.completed)
        : metric === "uncertain"
          ? number(row.uncertain)
          : metric === "reported"
            ? number(row.reported)
            : metric === "reserved"
              ? number(row.reserved)
              : metric === "fallbacks"
                ? number(row.fallbacks)
                : metric === "failed"
                  ? number(row.failed)
                  : number(row.requests);
    buckets.set(t, (buckets.get(t) ?? 0) + value);
  }
  const bars = [...buckets.entries()],
    max = Math.max(1, ...bars.map((b) => b[1]));
  return (
    <>
      <section className="ops-summary" aria-label="Live operations snapshot">
        <div>
          <span className="eyebrow">CAPACITY & ROUTING</span>
          <h2>
            {data.settings.config.kill || !data.settings.config.publicEnabled
              ? "Public AI paused"
              : "Public admission open"}
          </h2>
          <p>
            {processing.length
              ? `Processing: ${processing.map((p) => names[String(p.provider)]).join(", ")}`
              : `Idle · preferred: ${preferred ? names[preferred.provider] : "No eligible provider"}`}
          </p>
          <p>
            {preferred?.model_key ?? "No enabled model with verified capacity"}
          </p>
        </div>
        <div className="ops-capacity">
          <strong>
            {remaining}
            <small> / {data.settings.config.dailyActions}</small>
          </strong>
          <span>configured analyses remaining today</span>
          <progress
            aria-label="Global daily utilization"
            value={number(data.overview.accepted_actions)}
            max={data.settings.config.dailyActions}
          />
          <p>
            Concurrency {number(data.overview.active_actions)} /{" "}
            {data.settings.config.concurrency} · Stop{" "}
            {data.settings.config.kill ? "ON" : "OFF"}
          </p>
        </div>
      </section>
      <section className="ops-architecture" aria-labelledby="routing-title">
        <div className="ops-section-title">
          <div>
            <span className="eyebrow">ONE SYSTEM · THREE PROVIDERS</span>
            <h2 id="routing-title">The route to an observation.</h2>
          </div>
          <span className="ops-badge">Snapshot {stamp(data.now)}</span>
        </div>
        <div className="ops-ingress">
          <div>
            <strong>VISITORS</strong>
            <span>Anonymous · consent required</span>
          </div>
          <span aria-hidden="true">↓</span>
          <div className="ops-router">
            <strong>CENTRAL AI ROUTER</strong>
            <span>Atomic admission · eligible capacity · bounded fallback</span>
          </div>
          <span aria-hidden="true">↔</span>
          <div className="ops-d1">
            <strong>CLOUDFLARE D1</strong>
            <span>{data.database.status} · quotas, leases, policy & audit</span>
          </div>
        </div>
        <div className="ops-route" aria-label="Provider priority diagram">
          {["gemini", "cloudflare", "nvidia"].map((provider, index) => {
            const models = data.models.filter((m) => m.provider === provider),
              best =
                models.find((m) => m.effectiveEnabled) ??
                models.find((m) => m.enabled === 1) ??
                models[0];
            const active = processing.some((p) => p.provider === provider),
              isPreferred = preferred?.provider === provider;
            const status = active
              ? "Active"
              : best?.effectiveEnabled
                ? "Available"
                : (best?.status ?? "Configuration error");
            const used = models.reduce((a, m) => a + m.used, 0),
              cap = Math.min(
                models.reduce((a, m) => a + m.daily_cap, 0),
                provider === "gemini"
                  ? data.settings.config.projectDaily
                  : Infinity,
              );
            return (
              <div className="ops-route-step" key={provider}>
                {index > 0 && (
                  <span className="ops-fallback" aria-hidden="true">
                    ↓ safe fallback
                  </span>
                )}
                <button
                  className={`ops-node ${active ? "is-active" : isPreferred ? "is-preferred" : ""}`}
                  aria-expanded={selected === provider}
                  aria-controls="provider-detail"
                  onClick={() => setSelected(provider)}
                >
                  <span className="eyebrow">
                    {index === 0 ? "PRIMARY" : `BACKUP ${index}`}
                  </span>
                  <div className="ops-node-heading">
                    <strong>{names[provider]}</strong>
                    <span
                      className={`ops-badge ${best?.effectiveEnabled ? "is-available" : ""}`}
                    >
                      {status}
                    </span>
                  </div>
                  <span className="ops-model">{best?.model_key}</span>
                  <progress
                    value={used}
                    max={Math.max(1, cap)}
                    aria-label={`${names[provider]} configured daily utilization`}
                  />
                  <span>
                    {used} / {cap} configured attempts · priority{" "}
                    {models.map((m) => m.priority).join(", ")}
                  </span>
                  <span>
                    {active
                      ? "Processing a recorded active reservation"
                      : isPreferred
                        ? "Preferred for future eligible requests"
                        : "Not selected for future requests"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div id="provider-detail" className="ops-details">
          <h3>{names[selected]} · operational detail</h3>
          {data.models
            .filter((m) => m.provider === selected)
            .map((m) => {
              const stat = metrics.providerStats.find(
                (s) => s.model_key === m.model_key,
              );
              return (
                <div key={m.model_key}>
                  <p>
                    <strong>{m.model_key}</strong> · {m.status}
                  </p>
                  <p>
                    {m.reason} {m.statusReason}
                  </p>
                  <dl className="ops-detail-grid">
                    {Object.entries({
                      "Completed attempts": stat?.completed ?? 0,
                      "Failed / uncertain": stat?.failed ?? 0,
                      "Rate limit events": stat?.rate_limits ?? 0,
                      "Last selected": stamp(stat?.last_selected),
                      "Last failure": stamp(stat?.last_failure),
                      "Latest error": m.lastError ?? "None recorded",
                      "Internal daily remaining": m.remainingInternal,
                      "Next quota reset": stamp(m.nextReset),
                      Cooldown:
                        m.cooldownUntil === null
                          ? "Operator review required"
                          : m.cooldownUntil
                            ? stamp(m.cooldownUntil)
                            : "None recorded",
                      Metering:
                        selected === "cloudflare"
                          ? `Neurons reported: ${stat?.neurons ?? "Unknown"}; allocation unqualified`
                          : selected === "nvidia"
                            ? "Production metering unqualified"
                            : `${m.actualTokens} reported tokens / ${m.reservedTokens} reserved tokens`,
                    }).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          <p className="result-footnote">
            Provider enablement, priority and safe limits can be changed in
            Provider management below. Quotas are internal allocations, never an
            authoritative provider balance.
          </p>
        </div>
      </section>
      <section className="ops-analytics" aria-labelledby="analytics-title">
        <div className="ops-section-title">
          <div>
            <span className="eyebrow">RECORDED ACTIVITY</span>
            <h2 id="analytics-title">Usage, with evidence.</h2>
          </div>
        </div>
        <form
          className="ops-filters"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              q = new URLSearchParams();
            for (const [k, v] of f) if (v) q.set(k, String(v));
            void onFilter("?" + q.toString());
          }}
        >
          <label>
            From
            <input
              name="from"
              type="date"
              defaultValue={new Date(metrics.from).toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Through
            <input
              name="to"
              type="date"
              defaultValue={new Date(metrics.to).toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Provider
            <select name="provider" defaultValue={metrics.provider}>
              <option value="">All providers</option>
              {Object.entries(names).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button>Apply filters</button>
        </form>
        <div className="ops-filters">
          <label>
            Chart measurement
            <select
              value={metric}
              onChange={(e) => {
                setMetric(e.target.value);
                setPoint(null);
              }}
            >
              {Object.entries({
                requests: "Provider requests",
                success: "Successful attempts",
                failed: "Failed attempts",
                uncertain: "Uncertain attempts",
                reserved: "Reserved tokens",
                reported: "Reported tokens",
                fallbacks: "Fallback attempts",
              }).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time buckets
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </label>
        </div>
        {bars.length ? (
          <>
            <div
              className="ops-chart"
              role="group"
              aria-label={`${interval} ${metric} chart`}
            >
              {bars.map(([time, value]) => (
                <button
                  key={time}
                  aria-label={`${stamp(time)}: ${value}`}
                  title={`${stamp(time)}: ${value}`}
                  onClick={() =>
                    setPoint(`${stamp(time)} · ${value} ${metric}`)
                  }
                  style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                />
              ))}
            </div>
            <p role="status">
              {point ?? "Select a bar for its recorded time and value."}
            </p>
            <p className="result-footnote">
              {stamp(bars[0][0])} — {stamp(bars[bars.length - 1][0])}. Missing
              token measurements are not treated as provider balances.
              Cloudflare Neurons are shown separately in its detail panel.
            </p>
          </>
        ) : (
          <p className="ops-empty">
            No provider attempts in this interval. No simulated activity is
            shown.
          </p>
        )}
        <div className="ops-provider-breakdown">
          {Object.entries(names).map(([k, v]) => {
            const r = metrics.daily.filter((x) => x.provider === k),
              attempts = r.reduce((a, x) => a + number(x.requests), 0),
              done = r.reduce((a, x) => a + number(x.completed), 0);
            return (
              <div key={k}>
                <strong>{v}</strong>
                <span>
                  {attempts} attempts ·{" "}
                  {attempts
                    ? Math.round((done / attempts) * 100) + "% completed"
                    : "No success-rate sample"}
                </span>
                <progress
                  aria-label={`${v} completion rate`}
                  value={done}
                  max={Math.max(1, attempts)}
                />
              </div>
            );
          })}
        </div>
        <p className="result-footnote">
          Quota utilization over past days can be inspected with daily request
          buckets; historical configuration changes are in the audit log. The
          current quota is not retroactively applied to earlier usage.
        </p>
      </section>
      <section>
        <span className="eyebrow">ROUTING JOURNAL</span>
        <h2>Decisions & recovery.</h2>
        <p>
          Only recorded events appear here. Earlier attempts predate
          routing-event instrumentation and remain in Attempt history.
        </p>
        {journal.length ? (
          <ol className="ops-timeline">
            {journal.map((event, i) => (
              <li key={i}>
                <time>{stamp(event.created)}</time>
                <div>
                  <strong>
                    {String(
                      event.provider
                        ? names[String(event.provider)]
                        : "Admission",
                    )}{" "}
                    · {String(event.kind)}
                  </strong>
                  <p>{String(event.reason)}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="ops-empty">
            No routing events recorded for this interval.
          </p>
        )}
        <p>
          {metrics.events.filter((x) => x.kind === "cooldown").length} cooldown
          events in the latest {metrics.events.length} events. Timeline shows at
          most 100 events.
        </p>
      </section>
      <section>
        <span className="eyebrow">TRAFFIC COVERAGE</span>
        <h2>What is measured.</h2>
        <div className="ops-detail-grid">
          {[
            "Website page views",
            "Unique website visitors",
            "Local image analyses",
          ].map((x) => (
            <div key={x}>
              <strong>{x}</strong>
              <p>Unavailable · no visitor tracking installed</p>
            </div>
          ))}
          <div>
            <strong>Cloud AI</strong>
            <p>
              {data.overview.accepted_actions} admitted actions today;{" "}
              {data.overview.completed} completed provider attempts;{" "}
              {metrics.rejected} rejected admissions in the filtered event
              sample.
            </p>
          </div>
        </div>
        <p className="result-footnote">
          Anonymous network groups are fair-use buckets, not unique people.
          Images, filenames and raw IP addresses are not included in operations
          telemetry.
        </p>
      </section>
    </>
  );
}
