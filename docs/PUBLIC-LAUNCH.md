# Public AI launch

This release removes public invitation dependencies and keeps the original warm light design. `/admin/ai` is the private owner control center. Local analysis continues when Cloud AI is paused, exhausted or unavailable.

## Public admission

No code, account, subscription or provider selector is required. The visitor explicitly confirms adult professional/business use, a non-personal/non-sensitive image, and external processing consent. Gemini unpaid services prohibit consumer use and require paid services for EEA/Switzerland/UK clients. Unsupported or unknown regions fail closed. The supported-region allowlist is sourced from Google's official available-region list and terms, checked 2026-10-25. This release cannot promise free inference to every worldwide audience under those restrictions.

On Vercel, the server derives a daily HMAC from the platform-overwritten client IP. IPv6 uses a /64 network bucket. D1 stores only the HMAC, not the address, country, original filename, image, EXIF or observations. Browser IDs, cookies and invitation headers cannot reset a quota. This measures network groups, not unique people; shared networks share the limit. Global limits remain essential against distributed abuse. Off Vercel, public AI fails closed; isolated tests inject platform-style headers.

The existing caps remain 60 admitted actions per UTC day, 6/minute, concurrency 2, and 3/day and 1/minute per anonymous network group. The two Gemini models share a project pool: 300 attempts/Pacific day, 10 RPM, 200,000 reserved TPM and 1,000,000 daily reserved tokens. The default routing threshold is 80% of each configured model daily allowance. Every request still passes atomic D1 admission and reservation; failed or uncertain work is not refunded. No live inference or production test reservation is authorized for release verification.

## Routing and qualification

Default model priorities are Gemini 3.5 Flash Lite (1), internally qualified Gemini 3.1 Flash Lite (2), Cloudflare `@cf/meta/llama-3.2-11b-vision-instruct` (3), NVIDIA `meta/llama-3.2-11b-vision-instruct` (4). These are three providers. Only Gemini 3.5 is currently qualified. The owner's existing free-tier confirmation and October 30, 2026 22:10 UTC safeguard expiry are preserved; no billing state is inferred or renewed.

Cloudflare remains disabled: account model-license acceptance and a qualified bounded Neuron allocation have not been demonstrated. Workers Free has a documented 10,000-Neuron daily allocation, separate from D1. The hard inference allocation remains zero, and Neurons are not converted to Gemini tokens. NVIDIA remains disabled: its hosted API trial excludes production. An API key alone cannot enable either backup. Gemini 3.1 requires its own current exact-model qualification.

Routing is serial, respects D1 priority, stops at three model attempts, and never revisits a model. Capacity checks, cooldowns and administrator changes are rechecked at reservation time. Explicit rate/quota/credential/model/billing rejections permit eligible fallback; timeout, outage, cancellation, invalid output and safety refusal stop the request. Unknown credential/billing/model reset requires operator review; daily quota resets use provider quota days, transient throttling uses documented retry time or conservative minute backoff. Future requests re-evaluate capacity without sending probe inference. No safe candidate means graceful pause.

## Owner controls and monitoring

Sign in at `https://hidden-data.ouahad.space/admin/ai` using the existing `CLOUD_AI_ADMIN_SECRET` from your private environment configuration. Never paste it into chat or commit it. The signed HttpOnly Secure SameSite=Strict cookie expires after one hour; exact-origin CSRF checks, optimistic revisions and SQL audit triggers protect mutations. Rotating the owner credential invalidates sessions. The dashboard cannot execute SQL or edit secrets.

Controls persist in D1: public enable/pause, emergency stop, automatic fallback, daily threshold, safe internal limits, model eligibility enable/disable and priority. Browser confirmation precedes changes. Server validation rejects unqualified models, stale revisions and limits above hard ceilings. A new public release cannot open while its release safeguard is expired. The emergency stop does not refund or recall already-sent provider work.

The routing visualization shows real recorded processing reservations or the preferred currently eligible model while idle. Click nodes for quota, metering, outcome, failure and reset details. Date/provider-filtered hourly and daily charts use actual attempts, successful/failed/uncertain outcomes, fallback attempts and token reservations/reported values. Unknown actual usage remains unknown in attempt history. Provider totals are recorded service attempts, not provider billing balances. Current caps are not retroactively applied as historical quota limits; historical quota snapshots are unavailable.

Routing events start with migration 3 and record actual selection, skips, capacity denial, failures and cooldowns. The timeline displays the latest 100 matching events and never fabricates older transitions. Administrative changes remain in their separate audit history. Rejected admissions are counted across the selected interval. Earlier records predate rejection instrumentation. Page views, unique visitors and local analysis counts are explicitly unavailable because Vercel Web Analytics and local-action telemetry are not installed. No additional tracking was added.

## Migration and verification

Migration 3 is additive: routing-events table/index and public/fallback/threshold policy fields. It does not reset historical jobs, attempts, reservations, counters, sessions or audit logs. Inference is paused during migration/deployment, then enabled only through authenticated administrative controls after non-inference preconditions. Legacy invitation variables can remain for audit context and grant no access.

Focused tests cover anonymous discovery and consent, metadata-free resized previews, lifecycle cancellation, concurrent SQLite connections, duplicate protection, shared-model/project quota, cooldowns, uncertain debit preservation, public/fallback pause, thresholds, owner-only controls, priority persistence, mobile layout and accessibility. Tests use isolated SQLite and mocked inference. Production release checks use HTTPS GETs and authenticated admin controls only. Actual free-tier balances and new end-to-end inference are not claimed.

Sources: [Gemini terms](https://ai.google.dev/gemini-api/terms), [available regions](https://ai.google.dev/gemini-api/docs/available-regions), [Cloudflare model/license](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/), [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [NVIDIA trial terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf).
