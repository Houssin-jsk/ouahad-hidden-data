# Production Cloud AI integration — verified

**2026-10-23: real owner-only production integration PASS.** The prepared Phase 04 frontend is deployed at https://hidden-data.ouahad.space. One actual Chrome → API → remote D1 → Gemini 3.5 Flash Lite → validated browser-result request succeeded. Safety cleanup is complete: emergency stop ON, all models OFF, temporary invitation revoked, owner session closed. The public panel therefore correctly shows unavailable again.

## What was fixed and published

The original production alias served commit `465a451` and lacked the new availability route (404). Its Production origin was an invalid URL referring to localhost; legitimate owner sign-in failed at origin validation (403). Provider credentials were present, but invitations/release authorization were absent and the shared policy was deliberately stopped with every model disabled. This was configuration/publication state, not a demonstrated provider-key or D1 outage.

The canonical Production origin was saved and deployed. The original Preview value remains unchanged. The owner then explicitly authorized deployment of the prepared working tree without committing/pushing, a fresh owner-only invitation, one temporary test and restoration of the disabled state.

Published **115 source files / 3,314,631 bytes**. Contents equal the previously tested independent checkout with .vercelignore exclusions physically applied, allowing only UTF-8 CRLF/LF conversion. The new status route is included. Research, companion runtime, private environment files, .cloud-ai and model weights were excluded; configured-credential scan found zero matches in the uploaded source. Application source, dependencies, models, deadlines and quota policy were not changed during this integration task. Source remains an **uncommitted working tree based on 465a451**, not a new Git commit.

| Deployment | Purpose | Result |
| --- | --- | --- |
| `dpl_DRtySwqi1ticNuLKCgYxY8uSWcuG` | Initial publication and controlled owner test | READY; approximately 22.1 s build |
| `dpl_9trcmXYecJoRyUWWu5ZNN3U1XRS4` | Same source, live invitation revocation | READY; approximately 18.8 s build; current custom-domain target |

No commit, push, paid billing change or anonymous AI opening occurred. The second deployment was the required safety cleanup: stored environment changes alone do not revoke an invitation in an already running deployment. See [Vercel environment management](https://vercel.com/docs/environment-variables/managing-environment-variables).

## Production configuration after cleanup

Names and status only; no keys, codes, hashes or identifier values are included.

| Name | Production status |
| --- | --- |
| `GEMINI_API_KEY` | Present; successfully used for the one real image request |
| `CLOUDFLARE_ACCOUNT_ID` | Present; valid |
| `CLOUDFLARE_D1_DATABASE_ID` | Present; existing hidden-data database verified |
| `CLOUDFLARE_D1_API_TOKEN` | Present; real deployed reads, admission and settlement succeeded; separate from AI token; full token permission scope not independently inspected |
| `CLOUD_AI_ADMIN_SECRET` | Present; actual owner login, authenticated dashboard and logout succeeded |
| `CLOUD_AI_ORIGIN` | Canonical HTTPS production origin; deployed |
| `CLOUD_AI_D1_FREE_UNTIL` | Current at execution; expires 2026-10-23 20:11 UTC |
| `CLOUD_AI_GEMINI_FREE_UNTIL` | Current at execution; expires 2026-10-23 20:11 UTC |
| `CLOUD_AI_INVITES` | Present but empty; temporary invitation revoked |
| `CLOUD_AI_OWNER_TEST_INVITE_HASH` | Present but empty; temporary exception cleared |
| `CLOUD_AI_RELEASE_READY_UNTIL` | Absent; general release remains closed; not invented or bypassed |
| `CLOUD_AI_GEMINI_31_VISION_UNTIL` | Absent; Gemini 3.1 remains disabled |
| `CLOUDFLARE_API_TOKEN` | Present; Cloudflare inference remains disabled |
| `CLOUD_AI_CF_FREE_UNTIL` | Absent; Cloudflare inference remains unqualified |
| `CLOUD_AI_CF_LICENSE_ACCEPTED` | Absent; Cloudflare inference remains unqualified |
| `NVIDIA_API_KEY` | Present; NVIDIA remains hard-disabled |
| `CLOUD_AI_D1_DATABASE_ID`, `CLOUD_AI_D1_API_TOKEN` | Legacy aliases absent; provider-prefixed pair is configured |

The two free-tier attestations were re-read from Production and confirmed current before activation. They derive from the owner's earlier manual billing-page verification; this is not a new independent billing audit. Cloudflare subscription inspection returns 403/10000, and Gemini model metadata cannot establish paid billing status. The owner must repeat billing checks before renewing expired attestations or after a plan change. No attestation was extended.

## Real deployed flow and accounting

The deployed status endpoint returned HTTP 200. Correct owner login then returned **200 in 1,858 ms**, and the real dashboard reported **Connected**, emergency stop on, every model disabled and public release unverified. Only Gemini 3.5 Flash Lite was then enabled using the existing CSRF-protected administrative API, with unchanged limits. Emergency stop was deliberately released for the single owner test.

The existing owner-test exception and a fresh 20-minute invitation were used; the general release-ready flag stayed absent. A synthetic **320×240** PNG was processed through the actual website's Overview flow. Access-code verification succeeded. Start remained disabled before consent; both existing eligibility and external-processing consent checks were explicitly selected. The browser transmitted a newly encoded **5,001-byte JPEG**. No image bytes, image contents, prompt or generated observation text are retained in this report.

| Boundary | Verified result |
| --- | --- |
| Browser → production API | Exactly one inference POST; HTTP 200; **5,225 ms** response wait |
| API → D1 → Gemini | Real shared admission, provider reservation, exact Gemini 3.5 request; one attempt, no fallback/retry |
| API processing | **3,527 ms**; existing 45 s provider / 50 s API / 60 s route / 65 s browser deadlines unchanged |
| Response → browser | Schema validated; result visible; rendered description matched response; **3 observations / 2 limitations** |
| Provider usage | **1,202 input + 126 output = 1,328 tokens** |
| D1 request log | Completed; no error; **4,096 reserved tokens**; 1,328 actual; 3,000 ms DB-clock duration; fallback 0 |
| Owner dashboard | Real rendered Connected state; UTC overview shows one accepted/completed attempt, no active work or fallback; model counters match D1 |

The request log was matched through the browser's request key to its admitted job, rather than inferred from aggregate totals. Historical totals changed exactly **3 → 4 jobs/attempts**, **2 → 3 completed**, **1 → 1 uncertain**, **12,288 → 16,384 reserved tokens**, **2,743 → 4,071 reported tokens**. Both Gemini model and shared-project Pacific-day counters reconcile to **4 reservations / 3 completed / 1 failed-or-uncertain / 16,384 reserved / 4,071 reported**. The original 13-second uncertain request remains charged at 4,096 tokens with unknown actual usage. These internal counters are not a provider account balance; the dashboard's UTC-today overview and Gemini's Pacific quota day have different boundaries.

## Final safety verification

After the successful request, emergency stop was restored first, Gemini 3.5 was disabled, and the owner logged out (HTTP 200). The temporary invitation allowlist and owner-test hash were cleared in Production. The cleanup deployment applied that revocation to the live custom domain.

Fresh production Chrome and remote D1 checks at **02:03 UTC** verify:

- Status without a code: **200 / unavailable**, private and no-store.
- Status with the temporary code: **403 / invalid_invitation**, while its original expiry was still in the future. This proves actual live revocation, not just natural expiry.
- Anonymous owner API: **401**; inference GET: **405**.
- Emergency stop **ON**, every model **OFF**, **0 owner sessions**, **0 active jobs**.
- Global settings exactly equal the pre-test configuration; only audit/revision metadata changed.
- Global **60/day, 6/minute, 2 concurrent**; invitation **3/day, 1/minute**; Gemini project **300/day, 10 RPM, 200,000 TPM, 1,000,000 charged tokens/day** remain unchanged. Optional provider allocations and qualifications remain unchanged.
- Owner audit records show login, model activation, stop release, stop restoration, model deactivation and logout.

The former test deployment is no longer the custom-domain target and retains the project's existing Vercel protection for generated deployment URLs. Its original invitation also has a short fixed expiry. No public inference remains enabled.

## Regression and evidence limits

The pre-publication checks cover the exact application source published here: **64/64 focused unit tests**, full-project strict TypeScript, production strict TypeScript/import graph (**57 local files**), ESLint and release isolation (**132 local build/trace files**) passed. Unit provider transports are mocked; the single deployed request above is real. No additional live inference or stress test was run. Deployment file inspection returned the status route and no research/private path matches in the returned tree; that API response was marked truncated, so the verified upload manifest remains the complete source inventory.

Final bounded credential scan at 02:11 UTC checked six source-payload/evidence/report files against the configured credentials and temporary invitation code/hash: zero matches. Git HEAD remains 465a451 and the index remains empty; no commit or push occurred.

Both remote deployments report READY and the real production story succeeds. Vercel build-log and runtime-error inspection return **403 scope access denied**; the available CLI account also lacks that scope. No claim of an error-free runtime-log scan is made. Actual D1 request and owner audit logs, real dashboard metrics and browser/API results were verified instead. No new provider, redesign, quota refund, migration or Phase 04 feature work was introduced.

**Readiness:** the existing production integration is verified for an authorized owner-only test. It is intentionally inactive now. Leaving a restricted pilot active requires a separate owner decision, fresh/current invitations and the real release-ready authorization for participants beyond the owner-test exception. No manual credential repair remains indicated by the successful test. Renew free-tier attestations only after the owner's required billing checks.

Sanitized machine evidence, including the historical diagnosis: [verification.json](verification.json). The upload manifest and diagnostic scripts remain under ignored .cloud-ai; the temporary code remains private and is marked consumed/revoked.
