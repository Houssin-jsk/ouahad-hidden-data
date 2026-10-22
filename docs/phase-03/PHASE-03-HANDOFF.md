# Hidden Data — Phase 03 handoff

**Final exit review, 2026-10-22: Phase 03 COMPLETED; Final Readiness Audit CONDITIONAL; Phase 04 READY as an engineering exit gate only; public deployment NOT YET AUTHORIZED.** AI grounding remains EXPERIMENTAL. Emergency stop is ON, all models are OFF, the owner session and temporary invitation are revoked, and previous debits are preserved. See **FINAL READINESS AUDIT — EXIT REVIEW** at the end. Every older status block below is historical.

**Latest timeout-fix verification, 2026-10-22:** Engineering **PASS**, Cost Safety **PASS** for the current owner-confirmed free configuration, Production Readiness **READY for the restricted pilot**, Phase 04 readiness **YES** as an exit gate only. One new real admitted request succeeded with validated observations visible and D1 accounting verified; the earlier uncertain debit remains. Stop restored, all models disabled, public release closed. **Gemini Timeout Alignment — Final Verification** supersedes earlier status/deadline statements; no deployment or Phase 04 work occurred.


**Current, 2026-10-22: Engineering Integration BLOCKED / AI Grounding EXPERIMENTAL / Phase 04 Readiness NO.** The cloud feature is implemented and real Gemini vision works, but free account billing and durable shared usage enforcement cannot be verified with current access. Production inference is disabled, not anonymously exposed. See **Cloud Vision API Integration — Final Product Architecture** at the end. All previous “latest” decisions below are historical and superseded for product architecture.

**Latest assignment: PHASE 03 BLOCKED on Qwen grounding quality.** The exact local Qwen GGUF/native runtime, companion, website pairing and actual HTTPS-to-loopback transport are implemented and tested. Observations remain disabled. See **Qwen Local Companion — Implementation and Verification** at the end. Prior attempt sections/counts remain history.

**PHASE 03: BLOCKED. No primary model selected, no production AI shipped.** The evaluation produced a concrete rejection, as required when candidates do not qualify. Do not advance to Phase04 or relabel research execution as a production-ready feature.

**Final status after the second and final focused attempt: BLOCKED. Investigation has stopped.** No candidate cleared task/licensing/delivery eligibility. The original first-attempt counts and recommendations below are preserved as history; the **Second Attempt — Focused Evaluation** section gives the final scope and supersedes any suggestion to start another model search automatically.

Verified regression counts: **82/82 unit tests**, final **50/50 production Chrome tests**, **2/2 new real-model research tests**. The initial production run's3 failures and unchanged successful diagnostic rechecks are preserved. Forty actual inference records plus successful manual retry are available. Final command/asset outcomes are recorded in `evidence/verification-summary.json`.

TypeScript, lint, research/production builds and the unchanged release scanner pass. Final release contains no models or research routes; baseline schema/math/privacy behavior is preserved.

## Delivered work

- Reproducible, attributed16-original Commons corpus with8 calibration/8 test originals and4 parent-preserving degradation challenges; frozen visual judgments, source responses, checksums and inspection screenshot.
- Actual Chrome/WASM inference on all three existing candidates:20 CLIP rankings,16 MobileNet predictions and2 YOLOS diagnostics, plus separate replay/lifecycle checks. Machine-readable scores, requests, timings, failures, memory proxies and quality decisions retained.
- Separate serializable `ai-result/1` contract, calibration/relevance/coverage helpers and unit tests; research copy corrected to state that normal release has no AI. Existing work and original manifests remain intact.
- Four required reports, frozen protocol, fixture README, asset verifier and collection/evaluation scripts. Full Phase01/02 regression and normal-release checks recorded in the verification report/evidence.

## Selection outcome

Closest task fit: `Xenova/clip-vit-base-patch32`, revision `d15189d7028b43f1d3e65039190477f6af591c2a`, q8 converted graph153,695,702 bytes. OpenAI's source repository is MIT; converted-export licensing is not independently certified. This is an **evaluated candidate, not a selected model**.

Raw covered test relevance: top-one6/7, top-four7/7. Calibration-only cosine+margin policy accepts1/7 covered test originals (14.3%), below >=50%. The single accepted result is correct and the single unsupported test image abstains; those tiny denominators do not justify a reliability claim. Calibration also exposes sitting-room/pet errors and accepts only2/5 covered originals. All4 transformations keep the leading class, but dimming changes an accepted scene to abstention. MobileNet predicts ImageNet objects rather than scenes and has content failures; YOLOS misses the elephant and yields overlapping detections. None is promoted.

Chrome155 one-thread WASM is actually exercised. CLIP inference median1,824.8ms, cold wall8.541s; MobileNet median45.5ms; YOLOS2.39–2.98s across two runs. Shared runtime26,914,834 bytes; CLIP model/support total155,926,112, before JS. Fresh-worker replay/memory observations and final test counts are in the verification report. GPU API exposure, viewport emulation and page heap size must not be represented as GPU execution, physical-mobile performance or model memory peak.

## Exact blockers and next evidence needed

1. **Useful safe coverage failed.** A future Phase03 attempt needs a justified better-fitting candidate or task definition, separate selection/calibration material and new held-out test images. Do not optimize on the existing test set and report it as independent.
2. **No production candidate or integrated feature exists.** Integration is explicitly conditional on passing evaluation; normal build intentionally remains non-AI. Production UX, immutable asset delivery, low-memory behavior and backend support need actual qualification for any later selected model.
3. **Derivative asset clearance is incomplete.** Retain upstream notices; resolve the exact converted-weight redistribution conditions before promotion. Do not treat model-card lineage as automatic export equivalence or legal certification.
4. **Actual Vercel model-hosting configuration is unverified.** Project exists in listing, but detail access403 and CLI scope failure prevent plan/config verification. Grant the connector access to the correct team or provide an authorized read-only project context when such inspection becomes necessary. Public source-upload limits alone do not certify a production delivery design.

The small, single-annotator corpus cannot certify36 classes or probability calibration. GPU/other browsers/physical mobile/constrained inference and native peak memory remain untested. Browser-regression first-run failures and unchanged rechecks are disclosed, rather than erased by the final rerun.

## Modified files attributable to Phase03

New `src/ai/result-contract.ts`, `src/experiments/vision/quality.ts`; `tests/phase03.test.ts`, `tests/research/phase03.spec.ts`, `tests/research/phase03-reproduction.spec.ts`; `tests/fixtures/phase03/`; `scripts/prepare-phase03-corpus.mjs`, `phase03-contact.mjs`, `prepare-phase03-annotations.mjs`, `audit-phase03-assets.mjs`, `evaluate-phase03.ts`; this documentation/evidence directory. Existing `src/experiments/vision/workspace.tsx` changes only the research phase label and inaccurate release-AI copy. `README.md` links this blocked handoff and distinguishes earlier prototype phase names. No package/dependency change was needed.

The repository already had extensive uncommitted Phase01/02/research work. It was preserved and is not attributed to this phase. Generated Next type references/build artifacts can be rewritten by builds. Do not bulk-stage the working tree or huge experimental weights; this task made no commit.

`scripts/record-phase03-evidence.mjs` additionally assembles and asserts the final machine-readable verification summary from retained test/build/asset evidence.

## Contracts for any later phase

Preserve Phase02 analytics schema1.0.0 and its optional missing-data fallback; native sample, alpha×source-cell-area weighting, inverse weighted-CDF quantiles and HSV rules; original numerical results; transferred bitmap/tensor/URL ownership; four tabs; six-second baseline presentation; local-only images/metadata and explicit GPS reveal. AI stays separate and opt-in, with raw-score semantics, qualified predictions and abstention. No new model may enter release by weakening the scanner or privacy tests. The existing release contains no approved model assets and requires no AI-hosting infrastructure.

No commit, push, merge, deployment, Vercel mutation or Phase04 work occurred. The live Vercel application was not changed.

## Second Attempt — Focused Evaluation

**PHASE 03: BLOCKED; final bounded attempt stopped.** The useful question investigated was broad visible-content classification with overlapping labels and explicit abstention, complementing deterministic measurements. Proposed concepts were scenery, built/indoor settings, animals, people and ordinary objects. No class was declared supported merely from a model name or relabeled ImageNet output.

Exactly two approaches were inspected:

1. Existing `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k`, revision `3ba07f12712fa58fd6b3d661f9909c9e332c5005`:42,071,292 bytes including existing runtime/config. Direct ImageNet labels do not establish this broad multi-label task; a selective object-family mapping was not invented to force success.
2. `Xenova/mobileclip_s0`, revision `757d59c9c6870a76a4b0306f05f5061bca15c39f`, from upstream `apple/MobileCLIP-S0` revision `71aa3e13dda93115871afbd017336535ba29886c`: documented ONNX/Transformers.js route, but standard q8 encoders/support plus existing runtime total83,786,485 bytes, before JS. Current upstream research-only model terms and converter software terms do not clear this exact export for product use/redistribution. No retroactive-license conclusion is asserted. A hypothetical smaller vision-only delivery was neither implemented nor used to waive clearance.

**Evidence boundary:** zero new weights downloaded, zero fresh held-out images, zero held-out passes, zero new inference backends, zero class thresholds or new quality metrics. This is a pre-evaluation eligibility stop permitted by the brief, not an insufficient-image-access claim or a measured quality failure for MobileCLIP. No old test image was tuned on or presented as independent. The original first attempt's failed safe coverage is diagnostic history only.

**Current verification:**82/82 unit tests,3/3 focused production Chrome tests, TypeScript, lint and the normal production build pass. Focused Chrome release tests and the78-file release scanner are recorded in `evidence/second-attempt/`; the complete50-test browser run and40 model records earlier in this handoff are historical and were not repeated. There is no new model latency, memory, GPU or physical-mobile claim. The exact current browser count/outcome is in `verification-summary.json` and the verification report.

Changed only: `scripts/audit-phase03-focused.mjs`, its small metadata/license evidence directory, sections in these four existing reports, and the README's final-status pointer. Existing application code, workers, analytic schema/math, tabs, branding, input validation, GPS reveal, presentation timing, dependency versions, release scanner and model assets are unchanged. Earlier uncommitted work is preserved. No production AI UI or model assets were added.

The Vercel access failure was not retried. Repository configuration and local checks confirm non-AI isolation, not a production model delivery arrangement. The remaining blockers are task/capability fit, exact weight-use clearance, validated fresh quality evidence and approved lightweight artifact delivery. No blocker is deferred as Phase04 work, and no further research cycle is initiated or automatically proposed. No commit, push, merge, deployment or live Vercel change occurred.

## Final Completion Assignment — Final Handoff

**PHASE 03: BLOCKED; no model promoted.** TinyCLIP revision `9463a9c508a344c837ffefe9d724f3827bf2dc79` (source `a2a8c6eaa2549ad66eb7c31b85022bf58273a26c`, MIT declarations/project license) and official Places365 ResNet18 (repository `8a953ed56438726dc98bdef3796d042e7f1f171e`, pretrained-model CC BY grant, locally exported SHA256 `41e578f4fa3bb8b7dfde16ebd3e066cab4a81575528342b74de3d8aff5effb91`) have actual Chrome/WASM evidence. Complete tested payloads including runtime/notices are54.84MB and72.37MB before JS. Places zero-input exported logits passed the PyTorch reference tolerance; this does not certify upstream natural-image benchmark equivalence.

36 new source originals were collected: TinyCLIP24 (21 photographic+3 non-natural challenges), Places12 disjoint test originals, plus reuse of TinyCLIP calibration12 as Places development. Single-annotator, sparse-class, convenience-sample limitations apply. Native labels/frozen prompts, provenance, licenses/attribution, checksums, policies, predictions and confusion records are retained in the two fixture directories and `evidence/final/`. TinyCLIP held-out supported relevance5/6 (83.3%); Places3/6 (50%). Each accepts0/6 supported examples after calibration-only policies; accepted precision is undefined, not100%. Both fail coverage and minimum4 correct accepted cases. Neither result was tuned or retested as independent.

Research-only workers/UI options, conversion/data scripts and3 integrity unit tests were added; no production UI, baseline calculation, schema, privacy/GPS behavior, dependency package or release scanner was changed. Five new real-model research tests,85 unit tests, TypeScript/lint/build and focused production checks are documented separately from historical50-case regression results. Timing/stability/memory proxies have explicit scope limits. New model asset delivery and live Vercel settings are unapproved/unverified; no production compatibility claim follows from local research routes.

Remaining decisive blocker: neither candidate meets frozen empirical product-quality gates. No further candidate search, threshold tuning, production integration or Phase04 work is initiated. Preserve Phase01/02 contracts and continue excluding all research assets from normal releases. No commit, push, merge, deployment or live Vercel change occurred.

## Qwen Local Companion — Implementation and Verification

**PHASE03: BLOCKED.** The approved local architecture is implemented and substantially verified, but the exact Qwen configuration failed its frozen grounded-observations quality gate. Production observations are disabled in companion/promotion.json. Browser-only deterministic functionality is intact and all current engineering checks pass. This is not a claim that Qwen fails every visual task: it correctly recognized the main subjects, but unqualified details and unstable relationships fail this product's conservative contract.

Reuse: exact Qwen3-VL2B Instruct Q4_K_M language weights (SHA bd2179e…fd99), existing vision projector (SHA4dc7bc58…7190), and installed native llama.cpp0.7.0-dev build1 commit620d2225c from OUAHAD AI. Exact full hashes, provenance limitations and licenses are in the final model-evaluation section and companion/artifacts.json. No model search, conversion, substitute or multi-GB download occurred.

Implemented files: companion/{app.py,service.py,contract.json,promotion.json,artifacts.json,licenses,README.md}; src/companion/{client.ts,contract.ts}; src/components/companion-observations.tsx plus Overview integration in results.tsx and matching CSS; packaging/verification/evidence scripts;20 API/security tests;2 new unit contract tests;5 browser UI tests;6 licensed fixtures with frozen annotations; stricter release scanner and .vercelignore. Existing dirty work from prior assignments is preserved. No Phase01/02 worker, math, analytics schema, GPS policy, tab count, source limits or presentation timing was changed in this assignment.

HTTPS: actual https://hidden-data.ouahad.space tested in Chrome155 with standard local-network-access permission, explicit pairing, no wildcard CORS/TLS bypass, image inference and cancellation. Production app/settings were unchanged. The controlled fixture harness enables evaluation only through process IPC outside the shipped app; normal companion rejects inference and the paired website disables Analyze because grounding approval is false. It is not a deployed end-to-end product demonstration.

Current checks:87 unit +20 security +50 existing production Chrome +5 companion UI tests pass; TypeScript/lint/build/isolation pass. Real reference inference,10 frozen structured Qwen outputs, HTTPS transport and cancellation, package imports/start/stop and Windows job ownership passed as engineering checks. Grounding failed; no independent human review. Native GUI launch/layout/exit were observed, but the complete final GUI import/start/stop interaction could not be verified safely with the computer-use surface. These are genuine limitations, not deferred Phase04 work.

CPU observations:16GB i5-10500H Windows11;4 generation threads, no GPU. Load4.375s; first structured request31.906s; warm22.281–56.782s (median38.766s); native peak3.55GB working set/2.87GB private committed. Cancellation/unload about1.14s and parent-crash child termination0.375s. No low-end-device guarantee. Full metrics and exact inference records remain in evidence/qwen/.

Distribution: unsigned portable Windows companion, approximately56MB uncompressed, with bundled local Python/Tk/Pillow; model package is separately imported and checked, never downloaded automatically. End-user install/import/start/pair/stop/privacy/troubleshooting/uninstall instructions are in companion/README.md. Reproducible builder uses installed Windows Python3.12/Pillow only, no remotely retrieved executable or new desktop framework. Deliverables stay under ignored companion-dist; no public installer/model distribution, code signing, macOS/Linux, physical-mobile or other-browser qualification. No GGUF or companion enters the Vercel build/deployment traces.

Decision evidence: evidence/qwen/{reference-smoke,quality,quality-review,https-loopback,ownership,verification-summary}.json plus current test/build logs and the frozen tests/fixtures/qwen/evaluation.json. Earlier browser-model history is preserved. Remaining acceptance blockers are grounded-output quality, independent human review and complete native GUI interaction qualification. No additional model research or automatically initiated next architecture/phase follows this blocked result. **No commit, push, merge, deployment, production-setting change or Phase04 work occurred.**


## Cloud Vision API Integration — Final Product Architecture

Date: 2026-10-22. This final product direction replaces companion installation in the normal UI and preserves all prior research files/evaluations.

### Completion decisions

- **A. Engineering Integration: BLOCKED.** Adapters, secure endpoint, privacy/consent UI, quota-aware router, shared SQL admission, failure/cancellation paths and release isolation are implemented. Real Gemini vision and final structured-adapter inference work. Account-level zero-cost eligibility remains unverified, and the configured Cloudflare token cannot access a durable free usage ledger. Inference therefore fails closed. Calling this a usable production AI release would waive the user's cost/security and end-to-end requirements.
- **B. AI Grounding Qualification: EXPERIMENTAL.** Two synthetic smoke successes are not independent broad-image qualification; no confidence calibration or scientific verification is asserted. Earlier Qwen/CLIP evaluations do not certify Gemini.
- **C. Phase 04 Readiness: NO.** Free-account verification, durable shared enforcement access and one genuinely admitted end-to-end flow are critical operational blockers. Phase 04 was not started.

### Routing and provider findings

Implemented priority: **Gemini `gemini-3.5-flash-lite` → NVIDIA `meta/llama-3.2-11b-vision-instruct` → Cloudflare `@cf/meta/llama-3.2-11b-vision-instruct`**. **Current enabled production providers: none.** Google is technically proven but billing-unverified. NVIDIA's hosted free developer program is not authorized for production end-users and is hard-disabled. Cloudflare's model is officially vision-capable, but subscription, license acceptance, real inference and cost eligibility are unverified, so it stays disabled. No OpenRouter or alternate accounts/keys were added.

Google discovery succeeded; old `gemini-2.5-flash-lite` inference returned 404 despite listing metadata. `gemini-3.5-flash-lite` correctly described the red probe and, through the final adapter/validator, black/white/gray/red quadrants. Final structured call: **6,863 ms, 1,213 input / 97 output tokens**. Two schema 400s were corrected before the successful adapter call. No genuine fallback/quota event was forced; deterministic fallback evidence is mocked and labeled. See `evidence/cloud-vision.json` and the final model-evaluation section for exact probes and primary sources.

Published Gemini/Workers AI/D1 free allowances do not prove these accounts are free. Gemini key scopes cannot establish billing tier; Cloudflare subscription inspection is 403 and D1 discovery is 401. No paid service, billing change, automatic upgrade or cost guarantee was made. Verification flags were deliberately left absent rather than falsely attested. No credentials were changed or deployed.

### Privacy and abuse outcome

Numerical analytics/metadata/GPS stay browser-local; no provider traffic occurs until an explicit opt-in action. The new Overview disclosure explains external processing and Google's possible product-improvement/human-review use, excludes personal/sensitive/confidential images, links provider terms, and separates experimental observations from measured facts. Browser re-encoding removes metadata, respects orientation, composites alpha on white and caps cloud JPEG to 1024 per side / 768 KiB. Server validation strips APP/COM metadata again. No image is stored by Hidden Data; cancellation cannot recall provider-received data.

Restricted owner invitations identify vetted adult MA professionals without trusting IP or client identity headers. Atomic shared D1 SQL limits 1/client/minute, 3/client/day, 10 actions globally/day, 1 concurrent action globally and <=3 serial provider attempts/action. Output 480 tokens; provider timeout 12 s; processing deadline 45 s; function maximum 60 s. Unknown quota reset suspends a provider instead of inventing a daily reset; Cloudflare's documented 3036 UTC reset is handled distinctly. Without an accessible, verified free shared ledger or verified free inference, requests are denied. There is no anonymous or process-counter-only production mode.

### Validation

Full unit suite **116/116**, including **29 new Cloud API/adapter/security/SQL tests**; TypeScript, lint, production build and release isolation PASS. Release scanner inspected **88 output/trace files**; no GGUF/ONNX/AI-WASM/native inference/model dataset or companion client is bundled. `.env.local` is ignored. Secret audit found zero configured-value/common-pattern matches in **54 history blobs / 741 inspected workspace and log files**; scope is limited, not forensic assurance. Browser final counts and recheck outcomes are recorded below after completion. First six-worker browser run had 46/54 passes; test mistakes and timing failures are disclosed in the verification report.

### Changed files in this assignment

- Added `src/cloud-vision/contract.ts`, `client.ts`, and server `access.ts`, `config.ts`, `handler.ts`, `http.ts`, `image.ts`, `ledger.ts`, `prompt.ts`, `router.ts`, `types.ts`, plus independent `providers/gemini.ts`, `nvidia.ts`, `cloudflare.ts`.
- Added `src/app/api/cloud-vision/route.ts`, `src/components/cloud-observations.tsx`, `tests/cloud-vision.test.ts`, `tests/browser/cloud-vision.spec.ts`.
- Updated `src/components/results.tsx` (cloud replaces companion import), `image-lab.tsx` and `src/app/layout.tsx` (accurate privacy copy), `src/app/globals.css` (cloud panel), `.gitignore`, `.vercelignore`, `README.md`, `scripts/verify-release.mjs`. Historical companion-only styles relocated to unimported `src/companion/historical.css`; companion implementation remains intact.
- Added safe read-only `scripts/check-cloud-eligibility.mjs`, bounded explicit `scripts/cloud-vision-smoke.ts`, offline `scripts/cloud-invite.mjs`, `scripts/audit-cloud-secrets.mjs`. The smoke/invitation tools do not configure Vercel or create provider credentials. No new dependency or package/lock change was required by this assignment.
- Updated all four required Phase 03 reports with this titled final section and current-status prefaces; prior evaluations remain intact. Added only **one consolidated evidence file**, `docs/phase-03/evidence/cloud-vision.json`.

Pre-existing uncommitted work was preserved. The repository already contained extensive Phase 01–03 edits and untracked research; the overall `git diff` is not an isolated list of this assignment's changes.

### Genuine blockers and next authorized boundary

1. **Cost safety:** verify Google project's current free billing and actual quota in AI Studio without enabling payment. Until verified, leave `CLOUD_AI_GEMINI_FREE_UNTIL` unset. A successful API request is insufficient evidence.
2. **Shared enforcement:** current Cloudflare credential is unauthorized for subscription/D1 reads. Establish verified Workers Free D1 access/schema and validate actual remote admission before enabling public pilot requests. This task did not create/upgrade services, rotate keys, change token permissions or accept model licenses.
3. **Real complete flow:** after those prerequisites, issue a short-lived restricted invitation, configure only server-side settings and perform one real browser → endpoint → shared admission → Gemini → rendered-result test. Current browser/handler/SQL mocks must not be relabeled as that evidence.

The architecture report gives exact variables/schema and setup order. Other residual limits are ordinary experimental quality, provider availability/term changes, capability sharing, owner participant vetting, possible D1 free-quota denial of service and browser/device coverage. They do not justify removing the critical gates.

**No commit, push, merge, deployment, Vercel settings change, billing activation or Phase 04 work was performed.**

Final browser results: **50/50 existing production Chrome cases passed** in the full one-worker run. That run was **55/56 overall** due to one new test-harness upload-capture race. After correcting that test-only wait, the full Cloud AI file passed **6/6 in 52.0 seconds**. Every baseline and new case therefore passed across the full and focused runs; no clean final single-run 56/56 is claimed. Final secret audit: **54 history blobs / 752 inspected files / zero findings**; diff whitespace check passes. Unit, TypeScript, lint, build and isolation results above remain valid. The failed runs and correction are retained in `evidence/cloud-vision.json`.

## Centralized AI Routing, Shared Quotas and Owner Control Center — Finalization

Date: 2026-10-22. This latest section supersedes earlier routing, quotas and setup instructions; all historical evaluations and test results remain intact.

### PHASE 03 FINAL STATUS

- **Engineering: BLOCKED.** Central routing, per-model/project reservations, accounting SQL, owner authorization/dashboard and local verification are implemented. Actual D1 execution and an admitted live browser inference remain unverified.
- **Cost Safety: BLOCKED.** Owner-reported rate limits are recorded, but actual project billing and Workers Free status cannot be established from current credentials or signed-out dashboards. No attestation was fabricated.
- **Production Readiness: BLOCKED.** No shared database is connected. Real admin persistence and atomic quotas on D1 cannot yet be demonstrated. Public inference remains disabled.
- **Phase 04 Readiness: NO.** No Phase 04 work began. Cloud grounding stays **EXPERIMENTAL**.

### Database

Selected: **Cloudflare D1, verified Workers Free only**. The existing Workers AI credential returns D1 401 and subscription 403. Runtime now requires separate server-only `CLOUD_AI_D1_API_TOKEN`; the AI credential was not repurposed. No database, token permission, subscription or account was changed.

One alternative, Upstash Free, was evaluated. Its account-free starter expires after three days unless claimed, so it does not avoid the owner setup needed for durable portfolio storage. It was not provisioned; D1 remains the only backend.

Versioned migrations extend the existing job/cooldown foundation with providers, aggregate usage, attempt logs, admin audit and persistent owner sessions. A conditional SQL insert and accounting triggers reserve capacity atomically before each model request. Eight concurrent independent SQLite connections proved a one-slot model cap; a second eight-worker round respected the two-request global concurrency ceiling. **Remote D1 atomic verification remains unperformed.** Its migration, connection and real concurrent-probe commands are ready.

### Model routing

Default server-controlled order:

1. `gemini-3.5-flash-lite`.
2. `gemini-3.1-flash-lite`.
3. `@cf/meta/llama-3.2-11b-vision-instruct`, only after independent qualification; current ceiling zero.
4. `meta/llama-3.2-11b-vision-instruct`, registered for development/future licensed use, hard skipped with zero allocation in production.

**Enabled production models now: none.** Both Gemini IDs have fresh authenticated model discovery and official image-input support. Only Gemini 3.5 has prior real vision evidence. A new Gemini 3.1 smoke, actual free-billing verification and admitted release flow are not claimed.

Internal model ceilings: **300 attempts/day, 10 rolling RPM, 200,000 reserved TPM** per Gemini entry. Both share **300 attempts/Pacific day, 10 attempts/rolling minute, 200,000 reserved TPM and 1,000,000 reserved tokens/Pacific day** at project level. These application limits are below the owner-reported 500 RPD / 15 RPM / 250,000 TPM, not guaranteed free balances or an assumption that model quotas are independent.

Accepted-analysis bounds default to **60 globally/UTC day, 6 globally/minute, concurrency 2, 3/invitation/UTC day and 1/invitation/minute**. Each attempt conservatively reserves 4,096 tokens; failed/uncertain attempts retain reservations. Unexpected excess is charged and triggers an audited global stop. No invented Neurons-to-image conversion exists. Owner controls cannot exceed compiled ceilings or enable paid/unqualified allocation.

Automatic fallback, primary preference, cooldown/reset behavior, no duplicate model visit and the three-attempt maximum pass deterministic provider mocks with real SQL. No genuine external fallback event is claimed. The public interface remains one **AI Visual Observations** feature, with no selector or model label; external-processing transparency and numerical separation remain intact.

### Admin dashboard

`/admin/ai` uses genuine server authorization: one-hour signed opaque sessions, hashed D1 session records, credential-rotation revocation, HttpOnly/SameSite=Strict/Secure host cookies on HTTPS, origin/CSRF checks and audited optimistic updates. Forged cookies reject before D1 lookup. Controls include eligible model enable/disable, priority, safe model/global quotas and emergency stop. Pausing prevents new admission; already-sent provider work can finish.

Overview separates accepted analyses, invited participants, provider attempts, successes/failures, fallbacks, active reservations and internal remaining estimates. Actual-reported and conservatively charged tokens are distinguished. Provider balances are explicitly unknown. Recent safe errors, reset/backoff times and administrative history are available. No images, EXIF, raw IPs, personal prompts or credentials are logged.

The random owner key is **already generated and installed locally**, with ignored backup `.cloud-ai/admin.env`. A **one-day owner-test invitation** is prepared in ignored `.cloud-ai/invite.json` and registered in ignored `.env.local` through `CLOUD_AI_INVITES` and `CLOUD_AI_OWNER_TEST_INVITE_HASH`. Values were not printed or deployed. Existing provider keys were untouched; no billing/D1/release flag was asserted. Actual owner sign-in still requires D1; functional Chrome checks used real authenticated handlers and SQLite through an explicitly intercepted transport.

### Verification

- **Full unit suite: 132/132 PASS**, zero failures/skips, including 16 new central-policy/admin cases and the prior 29 Cloud AI tests.
- **Final fresh full production Chrome suite: 58/58 PASS** with two workers, zero failures/skips, after correcting the dashboard's capacity-aware primary display. All 50 established, 6 Cloud AI and 2 admin cases passed in one run. The earlier one-worker run also passed 58/58 in 9.0 minutes; focused results were not substituted.
- TypeScript, lint, production build and release isolation **PASS**. Scanner inspected **124 output/trace files**; no model/companion/research bundle or client secret reference.
- Admin desktop/mobile controls, session handling, persisted edits, audit and stop/sign-out pass. Screenshots were visually inspected. The first focused admin origin-configuration failure and test corrections are preserved in the verification report.
- Previous two real Gemini 3.5 synthetic inferences remain historical evidence in `evidence/cloud-vision.json` (prior structured adapter: 6,863 ms, 1,213 input / 97 output tokens). **No new inference or real admitted D1/browser flow occurred during finalization**, because external cost/store prerequisites are absent.
- Final secret audit: **54 history blobs / 803 inspected files / zero findings**; formatting and diff whitespace checks pass. No mock, screenshot or SQLite result is relabeled as remote D1/provider evidence.

### Exact remaining owner setup

1. **D1:** confirm Workers Free in the existing Cloudflare account without adding payment or upgrading. Create one D1 database named `hidden-data-ai`. Create a separate account-scoped token with **Account → D1 → Edit** (API **D1 Write**, with read/query access) for that account. Keep the Workers AI token unchanged. Add `CLOUD_AI_D1_API_TOKEN`, database UUID `CLOUD_AI_D1_DATABASE_ID`, and a current ISO UTC `CLOUD_AI_D1_FREE_UNTIL` expiry no more than seven days away to ignored local configuration. Reuse existing `CLOUDFLARE_ACCOUNT_ID`. [Official query API/permissions](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/).
2. **Gemini free billing:** inspect the correct AI Studio project's tier/billing view and confirm Free use with no paid billing/credit path for these calls. Rate-limit values alone are insufficient. Only then set server-only `CLOUD_AI_GEMINI_FREE_UNTIL` to a fresh ISO UTC expiry within seven days. Do not enable payment to obtain access. The existing Gemini key stays unchanged.
3. **Apply and verify D1** using the prepared commands. Migration defaults leave emergency stop on and all models off. The probe creates an isolated random table, admits one of four concurrent inserts, then drops only that disposable probe; it does not clear application counters.

```powershell
npx tsx scripts/cloud-d1.ts migrate
npx tsx scripts/cloud-d1.ts check
npx tsx scripts/cloud-d1.ts verify
```

4. **Owner-only admitted flow:** set local `CLOUD_AI_ORIGIN=http://127.0.0.1:3001`. Retain the prepared owner key/invitation; if the invitation expires, issue a fresh owner invitation and update its local hash/allowlist. Start the local production server, sign in at `/admin/ai` with the local owner key, enable only the eligible primary and turn off the stop for owner testing. Public access remains blocked while `CLOUD_AI_RELEASE_READY_UNTIL` is absent. Then run the actual admitted check:

```powershell
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
# In a second terminal, after enabling the owner-only shared policy:
npx tsx scripts/cloud-admitted-smoke.ts --run
```

That script uses a synthetic local image, explicit consent, the actual Next endpoint, configured D1 reservation, real Gemini, server validation and the DOM result, then verifies the completed D1 record. It performs one bounded user action, not polling. Do not set release-ready if it fails. After success only, the owner may set `CLOUD_AI_RELEASE_READY_UNTIL` (fresh ISO UTC, <=7 days) and issue vetted adult MA professional pilot invitations under the retained provider terms.

5. **Optional Gemini 3.1:** after free billing is verified, run `npx tsx scripts/cloud-vision-smoke.ts --evaluation gemini-3.1-flash-lite` once. Only after success set `CLOUD_AI_GEMINI_31_VISION_UNTIL` (<=7 days) and enable it in the dashboard. Otherwise leave it disabled; one eligible primary suffices. Cloudflare/NVIDIA stay zero until independently qualified. No broader model research is needed.

For a later explicitly authorized deployment, configure variables **manually** server-side: existing provider/account credentials, `CLOUD_AI_D1_API_TOKEN`, `CLOUD_AI_D1_DATABASE_ID`, `CLOUD_AI_D1_FREE_UNTIL`, `CLOUD_AI_ADMIN_SECRET`, `CLOUD_AI_INVITES`, verified Gemini flags and the release-ready flag. Set production `CLOUD_AI_ORIGIN=https://hidden-data.ouahad.space`. Never upload `.env.local`, `.cloud-ai`, tests, research, models or setup/smoke tools, or expose secrets as `NEXT_PUBLIC_`. No Vercel variable was automatically updated.

Operator billing changes, credential revocation or verification expiry must disable the pilot and trigger rechecking. Published free tiers/internal counters are not an invoice guarantee. Minimal ledger retention cleanup is activity-triggered; interrupted or idle cleanup can retain rows longer until later admitted activity. No image content is stored.

### Modified scope

Added `src/cloud-vision/server/{policy,schema,database,admin}.ts`, the admin page/API/session routes, `src/components/admin-ai.tsx`, `scripts/cloud-d1.ts`, `cloud-admin-key.mjs`, `cloud-admitted-smoke.ts`, and central/admin browser tests. Extended existing router/config/ledger/handler/types/HTTP/Gemini adapter, Cloud AI component/tests, global styles, exact release scanner, secret scanner, `.vercelignore`, local-only Playwright origin and setup/smoke tools. Updated all four existing reports and README; evidence is appended to the existing single `evidence/cloud-vision.json`. Pre-existing uncommitted project work is preserved.

**No commit, push, merge, deployment, paid provisioning, billing activation, existing provider-key change, Vercel settings update or Phase 04 work occurred.**

## Final Remote Verification and Git Cleanup

Date: 2026-10-22. This section supersedes earlier D1 connection/setup claims. **Phase 03 BLOCKED; Phase 04 NO.** Database engineering verification now passes; final exit remains blocked on account cost eligibility and the gated real inference story.

### Remote database result

The owner-created Cloudflare D1 database `hidden-data` responds successfully with the dedicated credential. Application configuration now supports `CLOUDFLARE_D1_DATABASE_ID` / `CLOUDFLARE_D1_API_TOKEN`, retaining the original `CLOUD_AI_D1_*` aliases; conflicting pairs fail closed. Existing Workers AI/provider keys were not repurposed or changed. No credential value is logged or included in evidence.

The initial remote schema contained only Cloudflare's internal table. Reviewed additive migrations **1 and 2 applied successfully**, creating the nine application tables, migration record, indexes and four accounting/audit triggers. A second migration invocation skipped both applied versions. No table was dropped and no unrelated data was overwritten. Schema transport and actual numeric parameters/triggers now have remote D1 evidence.

`npx tsx scripts/cloud-d1.ts verify` exercised the exact application schema and `SharedLedger` reservation SQL in isolated `cloud_verify_*` tables in the **real remote database**, not local SQLite. Eight concurrent callers admitted exactly one at a one-request model ceiling. Counters and an uncertain request log persisted without refund; primary exhaustion admitted the secondary. Cooldown expiry and preservation of previous-day counters passed with a controlled fixture SQL clock; this was not a wait through real midnight. The small, clearly prefixed fixture tables remain as diagnostic evidence; no production counter was reset. No fixture eligibility enables a real provider.

Real owner authentication handlers additionally created and revoked a session in the actual application tables, saved the same stopped policy with an optimistic revision, and verified its audit record. This proves remote persistence through the handlers, not a browser login through the still-unverified runtime cost gate. Actual policy values remain unchanged: emergency stop **on**, all four models **off**, zero production attempts. Explicit maintenance commands can inspect/migrate a database without asserting free eligibility; runtime inference/admin connection still requires `CLOUD_AI_D1_FREE_UNTIL`.

### Billing and real inference

Both available Cloudflare tokens return **403 / code 10000** for subscription inspection. Successful D1 access does not establish Workers Free. The available Gemini API key cannot establish project billing, and no Google Cloud OAuth CLI credential is available. The owner explicitly answered **"I still need to verify the billing/tier pages."** No attestation was created and **no new inference call was made**. The real browser → D1 → Gemini → validated browser flow remains **NOT RUN**, as required by the cost gate.

Routing, model identities and conservative limits remain unchanged: Gemini 3.5 → Gemini 3.1 → qualified Cloudflare, with NVIDIA hard disabled. Both Gemini entries retain model ceilings of 300/day, 10 RPM and 200,000 reserved TPM plus shared project 300/day / 10 RPM / token budgets. Production-enabled models: **none**. Historical successful Gemini probes are not current admitted-flow evidence.

### Git review and cleanup

Inventory before: **694 changed files = 20 tracked modifications + 674 untracked files**. After: **610 = 20 tracked modifications + 590 untracked files**. No file was staged, untracked from the index, moved or deleted. Two new source helpers were added, and **86 previously visible generated/downloaded files (353,913,443 bytes)** are now ignored and still present locally.

| Retained category | Files | Scope |
| --- | ---: | --- |
| A — Source, tests, fixtures and workflow scripts | 366 | `src`, `tests`, `scripts`; includes retained historical test/workflow coverage |
| B — Documentation, evidence and root configuration | 192 | Existing reports/measurements, licenses/attribution evidence and lightweight root configuration |
| D — Historical companion source/licenses and research metadata | 52 | 27 companion files and 25 research configuration/manifest/tokenizer/notice files |
| C — Newly excluded generated/dependency/download files | 86 | 76 vendor files, 8 research model/runtime downloads, 2 redundant generated outputs |

New rules ignore only `companion/vendor/`; Python venv/cache/bytecode patterns; research `.onnx`, `.gguf`, `.safetensors`, `.pth`, `.pth.tar`, `.bin`, `.wasm` and copied runtime `.mjs`; the generated image-embedded `human-review.html`; and redundant `evidence/final.zip`. Existing `.env*`, `.cloud-ai`, build/test outputs and companion distributions were already ignored. No whole companion/research source directory was hidden. No already-tracked ignored file requires `git rm --cached`; staged paths are empty. Large licensed test fixtures and non-redundant historical evidence are retained deliberately.

The frozen vendor inventory remains in `reference-vendor.json`, including notices. `python scripts/setup-companion-vendor.py --check` verified **76/76** files. `--source <existing-reference-site-packages-or-vendor-backup>` restores missing files offline only after checking all hashes, without changing differing files. Exact reference copies are required; generic pip byte equivalence is not claimed. Companion README documents the original sibling reference and the need to retain an authorized backup. Model manifests, pinned acquisition scripts and hash tests remain; ignored weights/runtime copies remain locally available. A clean checkout needs optional research dependencies/assets restored before those historical tests. No model download or new research was performed.

This is a complete path/size/classification inventory plus targeted source/configuration/security review, not a claim of an independent line-by-line audit of every historical artifact.

### Fresh verification and security repair

Fresh unit tests **133/133 PASS**; companion Python tests **34/34 PASS**; fresh full Chrome **58/58 PASS in 289.790 seconds**, two workers, no failures/skips/flaky cases. TypeScript, lint, patched production build, formatting and release isolation pass. The scanner inspected **124 output/trace files**. Expanded secret audit: **54 historical blobs / 908 inspected files / zero findings**, with bounded configured-value/common-pattern coverage. All **19/19** locally retained research assets in the three existing manifests matched their byte/hash records without download/inference. These are fresh results, not substituted historical runs.

The first build compiled but stopped on security advisories affecting installed Next.js 16.4.0. Updated Next.js and its ESLint configuration to **16.4.2**, retaining the current series; package/lockfile record the change. Fresh `npm audit --omit=dev` reports **zero vulnerabilities**. Full audit retains **five high development dependency entries from one unpatched `braces` advisory** through the Next ESLint plugin/fast-glob chain; no forced downgrade or claimed all-dependency clearance. The install emitted existing ESLint 10/plugin peer-range warnings; actual lint passes. See [Next 16.4.2 release](https://github.com/vercel/next.js/releases/tag/v16.4.2) and [remaining advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

### Only remaining owner actions

1. Inspect the existing Cloudflare account's Workers plan and confirm **Workers Free**. In the correct Gemini project's AI Studio **Projects → Billing Tier** / billing page, confirm **Free** and no enabled paid billing/credit path for these calls. Do not click setup/upgrade/payment actions. The [official billing guide](https://ai.google.dev/gemini-api/docs/billing) identifies these status fields. Rate limits alone are insufficient.
2. Only after those confirmations, set fresh local `CLOUD_AI_D1_FREE_UNTIL` and `CLOUD_AI_GEMINI_FREE_UNTIL` ISO UTC expiries within seven days. Keep the owner's existing `CLOUDFLARE_D1_*` variables; no credential rename, additional database, permission upgrade or repeat migration is needed.
3. Set local `CLOUD_AI_ORIGIN=http://127.0.0.1:3001`, build/start the local production server, and use the prepared owner key/invitation. Enable only the primary in `/admin/ai` and release the stop for the designated owner test. Run **one** `npx tsx scripts/cloud-admitted-smoke.ts --run`. The normal invitation, consent, shared quota and validation gates remain mandatory. Set `CLOUD_AI_RELEASE_READY_UNTIL` only after its real D1 record and browser result pass. If the invitation has expired, replace it using the existing invitation tool and update its local hash/allowlist. Gemini 3.1 stays disabled until its separately gated smoke succeeds; it is optional for the primary admitted check.

**No commit, push, merge, deployment, Vercel update, billing activation, historical deletion or Phase 04 work occurred.**

## Owner-Only Admitted Verification

Date: 2026-10-22. **Engineering BLOCKED; Cost Safety PASS for the owner-confirmed free configuration; Production Readiness BLOCKED; Phase 04 NO.** This section supersedes the earlier billing/setup blockers. It does not relabel a timed-out request as a successful inference.

The owner manually confirmed Cloudflare **Workers Free — Active, no payment method** and Gemini project `hidden-data` **Free tier with billing setup offered, no active paid tier**. Local `CLOUD_AI_D1_FREE_UNTIL` and `CLOUD_AI_GEMINI_FREE_UNTIL` attestations were registered for 24 hours, expiring **2026-10-23T20:11:35.026Z**. These are dated operator confirmations, not an independent billing API or invoice guarantee. Existing credential/configuration lines were verified unchanged apart from the two attestations and local `CLOUD_AI_ORIGIN=http://127.0.0.1:3001`. No public release flag was added.

The production build ran locally. Actual Chrome owner login succeeded through the real Next endpoint and remote D1 session store; its HttpOnly development cookie survived reload. The owner dashboard enabled only `gemini-3.5-flash-lite` and released the stop through audited normal controls. Secondary Gemini, Cloudflare and NVIDIA remained disabled. The prepared smoke uploaded only the synthetic quadrant fixture, accepted the existing eligibility/disclosure/consent controls, and made one request through the normal invitation, image validation and D1 action/model reservation gates.

**The real attempt timed out at the existing 12-second adapter deadline.** D1's attempt duration was **13,000 ms**, which includes reservation-to-settlement overhead and is not a measured pure model latency. The smoke exited with failure; no completed validated observations or successful result DOM were verified. The cause beyond exceeding the local deadline is unknown: no unsupported-model, billing, provider-outage or eventual provider-completion claim is inferred from a timeout. No automatic or manual second provider call was made.

Remote post-check: **one accepted action, one Gemini attempt, zero completed attempts**, recorded `outcome=uncertain`, `error_category=timeout`, fallback 0. Both model/project and minute/day counter views retain **one request, one failed/uncertain attempt and 4,096 reserved tokens**. Those four aggregate rows describe the same one attempt, not four calls. Input/output/total actual usage fields are null; aggregate reported-token zero means **no usage report**, not proof that the provider consumed zero tokens. No reservation was refunded or counter reset. The action lease is released; unreleased action count is zero.

Cleanup through the authenticated admin endpoint restored the original global policy with **emergency stop on**, disabled the primary, and revoked the owner session. All models are off; `CLOUD_AI_RELEASE_READY_UNTIL` remains absent. The task-owned local server was stopped. Public inference was never opened.

Fresh checks: **133/133 unit**, **58/58 full Chrome** (292.384 seconds, two workers, zero failures/skips/flaky cases), TypeScript, lint, production build and isolation **PASS**. Release scanner inspected **124 output/trace files**; secret audit found **0 matches in 54 history blobs / 908 inspected files**. Production dependency audit is clear; the refreshed full audit retains the five high development-chain entries already documented. After Chrome, real D1 still contains exactly one uncertain production attempt, all models off, stop on and zero active owner sessions. The earlier eight-way remote concurrency proof remains valid history; it was not repeated or misrepresented as the missing successful live model response. No application timeout, provider model, prompt, quota or production feature code was changed during this verification.

**Remaining critical gate:** a genuinely successful admitted Gemini response and its validated browser output. Billing confirmation, D1 access and actual browser owner authentication are now verified; they do not need to be repeated merely because this request timed out. Any later attempt must retain the uncertain debit, pass the normal quotas, stay within the free attestations, and have an explicit test scope. No Phase 04 or deployment is authorized by this report.

No paid billing, account settings, Vercel settings, provider key, commit, push, merge, deployment, historical asset deletion or Phase 04 action occurred.

## Gemini Timeout Alignment — Final Verification

Date: 2026-10-22. **Engineering PASS; Cost Safety PASS for the current owner-confirmed free configuration; Production Readiness READY for the restricted pilot; Phase 04 readiness YES as a gate only.** No Phase 04 work or deployment was performed. The successful admitted flow below closes the prior critical gate; public access remains closed deliberately.

### Minimal timeout correction

Gemini's adapter allowance is now **45 seconds**. Other registered providers retain their existing 12-second allowance. The API processing budget is **50 seconds**, starting before D1 preflight/admission, and the browser waits **65 seconds** including local preview work and response/accounting overhead. The route remains Node.js with **maxDuration=60**, confirmed in the fresh build's functions-config manifest. Retention cleanup now uses only the time remaining in that route budget. The smoke waits up to 70 seconds for the response and uses a 120-second diagnostic ledger lifetime, so its own tooling does not cut off an allowed inference early. The existing 120-second reservation leases and 4-second D1 request bounds remain unchanged.

The combined caller/provider abort signal now covers response-body reads as well as fetch. User cancellation continues to abort immediately; it does not wait for the provider deadline. No prompt, model identifier, image/output limit, quota, eligibility rule, invitation, CSRF control, retry bound, billing gate or refund policy was relaxed. The local production Node/Next runtime supports this allowance; no hosted deployment settings were changed or claimed freshly tested. [Official duration configuration reference](https://vercel.com/docs/functions/configuring-functions/duration).

### One real successful admitted flow

The owner authenticated in actual Chrome through Next and remote D1, enabled only `gemini-3.5-flash-lite` through the audited controls, and allowed the designated owner test while the public release flag stayed absent. One **40 × 24 synthetic quadrant JPEG** went through local upload/analysis, explicit eligibility and consent, invitation validation, remote D1 action/model reservation, real Gemini, strict response validation and visible browser output. No intercepted provider or D1 transport was used in this real flow.

Result: **HTTP 200**, one completed attempt, validated observations visible. API processing metadata reports **2,227 ms**; browser response wait was **3,157 ms**; the whole smoke took **12,588 ms**, including local analysis/presentation. These are separate measurements, not a universal model-performance claim. Reported input **1,213**, output **128**, total **1,341 tokens**. D1's coarsely clocked reservation-to-settlement duration is 1,000 ms and must not be substituted for those other measurements.

Both model and project daily counters now contain **2 reserved requests, 1 completed, 1 failed/uncertain, 8,192 reserved tokens and 1,341 reported actual tokens**. The earlier timeout remains uncertain with its original **4,096-token reservation** and null actual usage; it was neither refunded nor reset. Aggregate actual tokens therefore cover only the newly reported success, not the unknown earlier provider consumption. The new action lease was released; no action is unreleased. One new provider request was made under this authorization, with no fallback or blind retry.

After the test, the normal owner-authenticated controls restored emergency stop, disabled primary, restored the original global policy values and revoked the session. Final remote read confirms **exactly two total production attempts**, all models off and zero active owner sessions. `CLOUD_AI_RELEASE_READY_UNTIL` remains absent. Existing free attestations expire at **2026-10-23T20:11:35.026Z** and must be current for any later pilot activation. Only the primary was actually qualified here; Gemini 3.1/Cloudflare/NVIDIA remain disabled under their existing gates.

### Focused verification

- **48/48 focused Cloud AI/shared-ledger/admin server tests PASS**, including a response after the old 12-second cutoff, a stalled body reaching the 45-second deadline, immediate cancellation and prior quota/security checks.
- **8/8 focused Chrome Cloud AI/admin tests PASS**, 53.766 seconds, no failures/skips/flaky cases. The browser timeout test verifies the request remains active past the old 50-second cutoff and aborts at the new deadline. This is a focused run; the previous full 58-case results remain history.
- TypeScript, lint, production build, formatting and release isolation **PASS**; **124 output/trace files** inspected. Secret audit: **54 history blobs / 907 inspected files / zero findings**, with the documented bounded coverage and intended ignored credential exclusions.

The admitted smoke now appends sanitized stage/duration, HTTP status, safe error category and D1 outcome metadata on either success or failure. It never records credentials, image bytes, prompts or observation text. No second real test was needed. The prior timeout and all earlier evidence remain in the existing consolidated evidence file. Grounding stays **EXPERIMENTAL**; readiness does not establish broad-image accuracy, perpetual free eligibility, public uptime or a deployed change.

No code/architecture redesign, billing activation, account/Vercel settings update, commit, push, merge, deployment, quota refund/reset, historical deletion or Phase 04 work occurred.


## FINAL READINESS AUDIT — EXIT REVIEW

**2026-10-22 — Phase 03 Completed; Final Readiness Audit CONDITIONAL; Phase 04 READY as an engineering gate only; public deployment NOT YET AUTHORIZED.** No Phase 04 work, deployment, staging, commit, push, merge, paid billing or Vercel setting change occurred. No critical application defect remains in the exercised scope. Conditional means experimental quality with limited evidence, optional providers still unqualified, an unpatched development dependency advisory, and local Git temporary garbage whose deletion automatic approval blocked. It does not authorize public inference.

Current safety is verified remotely: emergency stop ON; every model disabled; zero active owner sessions; zero unreleased actions; temporary owner invitation revoked (actual local production HTTP 403); public-release flag absent. Production D1 retains **3 attempts: 2 completed, 1 uncertain**. Both primary-model and shared-project Pacific-day counters retain **3 reservations / 12,288 charged tokens / 2,743 reported tokens**. The uncertain request still has unknown actual usage; it was never refunded. Free billing remains the owner's expiring manual attestation, not a billing status inferred from an API key.

Fresh evidence is consolidated in [cloud-vision.json](evidence/cloud-vision.json), under `finalReadinessAudit`. Earlier failed calls and historical evaluation records remain intact. The authoritative exact proposed Git scope is [commit-scope.json](evidence/commit-scope.json).

### AI, admission and observations

One genuine owner-only Chrome → API → remote D1 → Gemini 3.5 Flash Lite request processed a 960×640 six-panel contact sheet from attributed, non-sensitive existing Commons fixtures. The pre-inference plan covered landscape, empty room, workshop objects, sleeping dog, furnished room and a dimmed ambiguous window reflection. The unchanged fixed prompt returned validated observations visible in the browser. API processing was **4,361 ms**, browser request wait **5,226 ms**; reported usage **1,218 input + 184 output = 1,402 tokens**, conservatively charged against a **4,096-token** reservation. There was one provider attempt and no retry or live fallback.

Assistant visual review found the six broad subjects correct, four specific observations on panels A–D, no obvious invented object/relationship, and no identity/location/metadata claim. Bottle contents and dog breed were explicitly unverified. Complex and ambiguous panels received little detail. These reused research fixtures were combined into **one composite request, not six independent trials**. No repeatability, calibrated accuracy, physical-mobile or population-quality estimate is claimed; no prompt or acceptance rule was tuned. Keep EXPERIMENTAL.

Central priority remains Gemini 3.5 → Gemini 3.1 → Cloudflare vision, with NVIDIA development-only and hard-disabled for public use. Fresh authenticated metadata GETs list the exact Gemini 3.1 and Cloudflare model IDs. [Google's model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) and [pricing](https://ai.google.dev/gemini-api/docs/pricing) document Gemini 3.1 image input and free input/output. It has no genuine image qualification in this audit: the existing invitation had one action remaining and that action was used for the bounded quality check. Its vision attestation remains absent. Cloudflare has no model-license attestation or measured conservative Neurons envelope: its compiled allocation stays zero. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) specifies 10,000 Neurons per UTC day on Workers Free; that is not 10,000 image requests. Actual Cloudflare inference accounting/balance remains unmeasured. Neither optional model was activated; NVIDIA remains excluded.

Realistic handler stress used persistent WAL SQLite, independent connections, actual shared-ledger SQL and mocked provider transports. For **10 / 40 / 100 simultaneous arrivals**, exactly **2** were admitted, **8 / 38 / 98** denied, and maximum simultaneous provider calls was **2**. Measured handler batches were **309 / 376 / 525 ms**, including a deliberately injected 1 ms/query delay; these are local harness measurements, not production throughput promises. Ten visitors × three analyses, spaced by a controlled 20,001 ms clock, admitted all **30**, then denied a fourth visitor analysis. No external provider calls were made by load tests. A fresh isolated remote D1 race admitted **1 of 8** competing final-slot reservations; production attempts and policy were unchanged.

Shared limits are preserved: global 60 actions/UTC day, 6/rolling minute and 2 concurrent; invitation 3/day and 1/minute; Gemini 300 attempts/model/Pacific day, 10/model/rolling minute and 200,000 reserved TPM; shared Gemini project 300/day, 10 RPM, 200,000 TPM and 1,000,000 charged tokens/day. Every attempt reserves 4,096 tokens with no uncertain refund. Simulations verify exhaustion/fallback order, serial bounded visits, project aggregation, cooldown/expiry, UTC/Pacific/DST resets, concurrency races, database failure, provider failures, malformed output and cancellation. Pure simulated Cloudflare fallback does not claim live eligibility or bypass its zero SQL ceiling.

### Admin and reliability

The actual owner authenticated in Chrome, persisted settings through remote D1, reloaded the session, used audited activation, and restored the stop/disabled state before sign-out. Desktop and 390px viewport inspection showed no horizontal page overflow; physical mobile was not tested. Regression tests cover unauthorized/CSRF writes, HttpOnly short-lived sessions, expiration/credential rotation, optimistic revisions and server-side policy ceilings. Small usability fixes now distinguish Active, Disabled, Paused, Temporarily unavailable, Quota exhausted, Unqualified and minute/concurrency limits, show a database check timestamp, and explain the preceding error for fallback. Provider balances remain unknown; reported usage and conservative reservations are labeled separately.

Timeout budgets remain **45s provider / 50s API / 60s route / 65s browser**. Actual handler abort tests distinguish API deadline from caller cancellation and retain uncertain debit/release the action. Virtual-clock transport tests accept a 13s response and abort a stalled body at 45s; Chrome virtual time survives 50s and aborts at 65s while rejecting a late response. The new diagnostic fix preserves `TimeoutError` as timeout instead of mislabeling it cancellation. Next's build manifest retains `maxDuration: 60`; local Node production execution was verified. Current deployed hosting duration settings were not certified or changed. The live HTTPS page returned 200 and still has no Cloud AI feature mention; the audited implementation is local and was not deployed.

### Fresh verification

| Check | Fresh result |
| --- | --- |
| Complete retained unit suite (`npm run test:all`) | 143/143 |
| Cloud/admin unit regressions within that total | 52/52 |
| Persistent handler traffic tests within that total | 4/4 |
| Production `npm test` in a Git-candidate-only copy | 119/119; no private env, weights or unresolved-rights originals; existing node_modules junction, not a fresh network install |
| Final production Chrome | 58/58; 287.690 seconds; zero skipped, unexpected or flaky results |
| Retained companion Python | 34/34 |
| Offline frozen vendor verification | 76 files; zero download/overwrite |
| TypeScript / lint / production build | PASS; lint has no warnings |
| Release isolation | PASS, 124 build/trace outputs; no research/model/companion release exposure |
| Production dependency audit | Zero vulnerabilities |
| Development dependency audit | Five high findings through one `braces` advisory, GHSA-vfj7-8cjw-p6xm; latest 3.0.3 still affected; no incompatible forced downgrade |
| Secret audit | Zero findings across all 628 candidate files and 638 bounded blobs across refs; current main's 54 blobs included; one >10 MB local capture blob skipped by bounded history scan; configured values and common key patterns only |
| Git connectivity / diff whitespace | PASS; index remains empty |

Archived real local-model browser benchmarks and new research inference were not executed. Gemini 3.1, Cloudflare and NVIDIA genuine inference were not executed. Prior tests are retained as history rather than substituted for these totals.

### Git preparation and local storage

Visible changes were **611 initially → 594 finally** (**20 tracked modifications + 574 untracked files**). The complete 628-file candidate inventory classifies **48 production source**, **92 required test/documentation/configuration**, and **488 retained research/history** files. Source, tests, attribution, licensed fixtures and historical evaluation evidence are retained; the historical source/configuration has continuing reproducibility value. The largest candidate is the attributed `tests/fixtures/readiness/bubbles.jpg` at **10,720,472 bytes**, followed by `discovery/reflection.jpg` at **7,230,957** and `readiness/forest.jpg` at **4,978,501**. The candidate tree is approximately **80.1 MB decimal**, including the scope manifest, without generated assets. No candidate reaches GitHub's 100 MiB object limit; no weights/runtime dependencies or known secrets are proposed. Build/typecheck and the candidate-copy tests verify imports and essential fixtures remain available.

Twenty additional existing files are narrowly excluded and preserved locally: **2 downloaded tokenizer files + 18 unresolved-rights photos** (16 COCO, tiger, cats). Frozen byte/source records and every historical assertion remain; production tests require none of them. The earlier 86 excluded recoverable vendor/model/archive/worksheet files also remain local. No authored or historical file was deleted. The full filesystem inventory additionally records **48,128 ignored regular files** at its timestamp, dominated by node_modules, build outputs and companion distributions; this count includes the generated audit-copy workspace and is not a count of deleted work. No ignored file is already tracked.

The Git metadata directory is separate from that candidate-tree size: **68,452,487,638 bytes**, including **1,090 temporary garbage files / 68,003,197,808 bytes**. Git connectivity passes. Automatic approval rejected the attempted stale-temporary-file cleanup with “blocked by policy”; **zero files were deleted**. No alternative deletion method was attempted. Main's historical largest blob is **1,035,757 bytes**. A local Codex capture tree retains older large objects; it is not a main-branch commit and is not proposed for publishing. This audit leaves that local metadata intact and makes no history rewrite. Normal reviewed branch publication does not include unrelated auxiliary refs; no mirror/ref publication is proposed.

Suggested single coherent commit: **`feat: finalize image analytics and restricted cloud vision`**. Its exact scope is the manifest's **594 `stagePaths`**, with all 628 candidate paths classified and hashed. This includes prior authored work intentionally retained for a reproducible source tree; it is not all attributed to this final audit. The manifest alone omits its own hash/byte count to avoid self-reference. Owner review should inspect that scope, license/attribution records and historical evidence before staging.

Commands below are prepared for the owner; **they were not executed to stage files**:

```powershell
git diff --stat
node scripts/prepare-commit-scope.mjs --check
node scripts/audit-cloud-secrets.mjs
node scripts/prepare-commit-scope.mjs --pathspec
git --literal-pathspecs add --pathspec-from-file=.cloud-ai/commit-paths.nul --pathspec-file-nul
git diff --cached --stat
git diff --cached --check
```

`--check` and `--pathspec` reject unexpected paths or changed bytes; neither stages anything. No blanket `git add .`, reset, clean, commit, push or deployment was performed. The owner's remaining required action is review of the concrete proposed commit and final diff, followed by their separately authorized Git publication decision. Local Git garbage cleanup is disclosed, not a prerequisite to publishing the reviewed source branch. No extra engineering phase or research cycle is proposed.
