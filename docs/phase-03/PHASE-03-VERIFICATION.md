# Hidden Data — Phase 03 verification

**Final exit review, 2026-10-22: Phase 03 COMPLETED; Final Readiness Audit CONDITIONAL; Phase 04 READY as an engineering exit gate only; public deployment NOT YET AUTHORIZED.** AI grounding remains EXPERIMENTAL. Emergency stop is ON, all models are OFF, the owner session and temporary invitation are revoked, and previous debits are preserved. See **FINAL READINESS AUDIT — EXIT REVIEW** at the end. Every older status block below is historical.

**Latest timeout-fix verification, 2026-10-22:** Engineering **PASS**, Cost Safety **PASS** for the current owner-confirmed free configuration, Production Readiness **READY for the restricted pilot**, Phase 04 readiness **YES** as an exit gate only. One new real admitted request succeeded with validated observations visible and D1 accounting verified; the earlier uncertain debit remains. Stop restored, all models disabled, public release closed. **Gemini Timeout Alignment — Final Verification** supersedes earlier status/deadline statements; no deployment or Phase 04 work occurred.


**Current, 2026-10-22:** see the final Cloud Vision section for this assignment’s tests and real Gemini inference. Engineering Integration **BLOCKED** on account cost/ledger verification; grounding **EXPERIMENTAL**; Phase 04 **NO**. Earlier “latest” checks and model results below remain historical.

Latest checks and measurements are in **Qwen Local Companion — Implementation and Verification** at the end: 87 unit, 20 security, 50 existing production Chrome and 5 new companion UI tests pass, with real Qwen image inference and actual HTTPS-loopback verification. Earlier sections and their counts remain historical. Phase03 remains BLOCKED on the new frozen grounding gate.

**PHASE 03: BLOCKED on model usefulness and production qualification.** Passing engineering tests does not override failed semantic acceptance. All commands below ran locally; no live deployment was changed.

Final production browser regression: **50/50 passed**, zero failures/skips/flaky classifications, one worker,499.039s. The unchanged three-case diagnostic recheck passed3/3 in26.675s after the initial47/50 run. The real-corpus integration test passed1/1; the independent prediction-replay/worker-memory test passed1/1 in16.544s. **40 recorded real inferences** plus a successful manual retry are retained across the two research tests. Final unit suite: **82/82 passed** (78 existing+4 new).

Final TypeScript, lint, research build, normal production build and release-isolation inspection all pass. The final `.next` artifact is the normal non-AI target. The release was not deployed.

## Environment and real inference

Primary benchmark: 2026-10-21T00:43:59Z; Windows10.0.26200, Intel Core i5-10500H2.50GHz,12 logical processors,16,993,001,472 bytes system RAM. Headless Chrome155.0.0.0, same-origin localhost production research build, no network throttling, `crossOriginIsolated=false`, WASM one thread. GPU API exposed but GPU graph execution unverified. No physical-mobile, Safari, Firefox or constrained-device inference is claimed. Research390px viewport checks layout only.

`tests/research/phase03.spec.ts` performs **38 recorded actual inferences**: CLIP20 (16 originals+4 related degradations), MobileNet16 originals, YOLOS2 diagnostics. It also executes a genuine successful manual retry after a blocked download. `evidence/browser-inference.json` retains environment, model outputs, all36 cosine rankings, processing timings, response lengths, resource timings where emitted, main-thread heartbeat and page heap snapshots. `evidence/lifecycle.json` records assertions that passed, not a simulated inference result.

`tests/research/phase03-reproduction.spec.ts` replays the mountain-lake input on fresh workers for CLIP and MobileNet, compares the leading label and score within five decimal places against the first run, and records dedicated-worker CDP heap snapshots. Its final outcome and measured memory are recorded in `evidence/reproduction.json` and the verification summary. These snapshots are after inference, not native/WASM/GPU peak measurements.

Replay fresh-worker observations: CLIP wall6,763ms, initialization4,053.5ms; MobileNet wall1,878ms, initialization1,214ms. Worker V8 `usedSize` snapshots:15,468,896 bytes CLIP,4,155,224 MobileNet; separately reported `backingStorageSize`:29,765,630 and44,770,467 bytes. These fields are not summed into a model peak estimate. The replay explicitly released the first worker before initializing the second. WebGPU `requestAdapter()` returned an adapter, but no graph ran on it; GPU kernel/fallback compatibility remains **unverified**, rather than unavailable or passed. Semantic rejection would not be repaired by a faster backend.

## Timing observations

| Mode | Recorded runs | Graph initialization ms | Preprocess median ms | Inference min / median / max ms | Warm wall median / p95 ms |
| --- | ---: | ---: | ---: | --- | --- |
| CLIP audited36 | 20 | 5,173.2 fresh worker | 14.7 | 1,578.4 / 1,824.8 / 2,139.7 | 1,973 / 3,005 |
| MobileNet | 16 | 270.8 graph switch with runtime already warm | 14.0 | 33.5 / 45.5 / 63.8 | 164 / 192 |
| YOLOS | 2 | 361.4 graph switch with runtime already warm | 61.6 | 2,387.6 / 2,387.6 / 2,978.4 | 2,965 / 2,965 (one warm run) |

Percentiles use sorted nearest lower rank in `scripts/evaluate-phase03.ts`; two detector runs cannot establish a stable latency distribution. CLIP cold wall8,541ms includes loading, processing and browser-test polling. One cold trial is not a speed comparison or download forecast. Fresh-worker replay timings are separate evidence, not substituted for the original protocol's measurements.

First CLIP graph transfer:153,695,702 decoded body bytes,153,696,002 ResourceTiming transfer bytes,864.9ms on localhost. Runtime WASM264.1ms; tokenizer27.3ms. These are not internet/mobile estimates. All local support/runtime response body lengths are retained. CLIP total inventoried model/support+shared runtime182,840,946 bytes (including optional472-byte metadata not fetched in this path). MobileNet equivalent42,071,292; YOLOS36,580,584. JavaScript, HTTP headers and application assets are additional. Baseline/detector graph switches reuse the already-loaded shared runtime; separate fresh-worker replay measures cold startup rather than pretending otherwise.

Main-thread maximum heartbeat gaps: CLIP434.6ms, MobileNet410.7ms, YOLOS72.1ms. Largest CLIP per-run p95 gap25.7ms with a20ms sampling timer. Short MobileNet runs yield few samples; the p95 can equal the maximum. Worker execution avoids placing model kernels on the UI thread, but these observed stalls prevent a claim of perfectly smooth interaction. Page V8 after-run snapshot maxima are5,866,880/5,692,372/5,855,512 bytes respectively, **excluding the worker and model-native allocations**. They are not evidence that models use only a few MB. Memory exhaustion and native peak remain unqualified.

## Executed commands and evidence

```powershell
node scripts/prepare-phase03-corpus.mjs
node scripts/phase03-contact.mjs
# Visual inspection before annotations/inference:
node scripts/prepare-phase03-annotations.mjs
node scripts/audit-phase03-assets.mjs
npm run build:research
npm run test:research -- phase03.spec.ts
npx tsx scripts/evaluate-phase03.ts
npm test
npm run lint
npm run typecheck
npm run build
npm run test:browser -- --reporter=json
npx playwright test --last-failed --workers=1 --reporter=json
npx playwright test --workers=1 --reporter=json
# Following release-server shutdown:
npm run build:research
npm run test:research -- phase03-reproduction.spec.ts
# Final normal-target validation:
npm test
npm run lint
npm run typecheck
npm run build
node scripts/verify-release.mjs
```

Exact final command outcomes/counts are retained in `evidence/verification-summary.json`; logs accompany it. Build/Chrome and the realpath filesystem test ran with the required local process/filesystem permissions. No paid API, key provisioning, new inference server or new dependency was needed. The first research build caught a harness string/property type error, corrected before any inference. The evaluation report script initially used unsupported CJS top-level await; wrapping its async entry point fixed it without altering predictions or thresholds. The original corpus collection's429 and resume are documented.

## Browser regression audit

The first full production run recorded47/50 expected and3 failures, zero skips/flaky classifications. Existing failures: loading illustration missed an ephemeral palette phase; fast-worker test missed “Calculations ready” within4s; timeout scenario received the worker-start error instead of timeout. All three passed unchanged with one worker in26.7s. Both reports are retained as `release-browser-first.json` and `release-browser-recheck.log`; no assertion or application fix was made to hide them. A complete one-worker rerun is the final regression result. Contention/timing sensitivity is plausible but not proven; do not describe the original run as50/50 or claim its failures never occurred.

Existing regression coverage includes genuine pixel workers and independent numerical references, JPEG/PNG/WebP validation, all EXIF orientations, six-second presentation, error/retry/watchdog paths, replacement/cancellation, URL cleanup, comparison maps, legacy results, four tabs, metadata/GPS reveal, clipboard, narrow/wide layouts, keyboard controls, reduced motion, evidence disclosures, no inference traffic and research-route404s. This is available automated accessibility coverage, not a full screen-reader/manual conformance audit.

New four unit tests exercise quality denominators/confusion, calibration-only abstention, reject-all undefined precision/zero coverage, NaN rejection and the actual licensed-corpus checksums/split-parent invariants. Existing session/fallback unit tests are controlled control-flow tests, distinct from new actual inference. No mocked classification is counted as model correctness evidence.

The retained historical research `evaluation`, `discovery` and `readiness` browser suites were not rerun with their unresolved-license COCO/cat/tiger inputs. New licensed-image tests exercise each underlying model engine instead. The50/50 claim covers the complete normal production suite; it does not claim that every historical research scenario was rerun. Those old sources/reports remain intact.

## Privacy, lifecycle and release

Research tests assert no model request on initial visit, explicit activation, only one live worker during repeated runs, termination and result discard, aborted model download surfacing failure, manual retry success, cancellation while loading and replacement suppressing stale results. Requests are exclusively localhost GET with no request bodies; localStorage/sessionStorage remain empty. The normal-release suite verifies no model/inference traffic even during image replacement, all research/model URLs404, retained GPS disclosure controls and baseline analysis. This is evidence for tested flows, not exhaustive proof against all hypothetical browser behavior.

Current normal build has only `/` and framework error routes. The existing scanner inspects78 emitted/trace files and public assets and reports no model binaries, AI-library tokens or research routes. Its allowlist was not relaxed. Experimental weights and evaluation images stay outside `public`; no production immutable model cache or GPU fallback is claimed. Snapshot evidence and the release scanner output are retained in this directory.

## Acceptance disposition

| Requirement group | Status |
| --- | --- |
| Existing asset/code audit; justified approaches; task/taxonomy | Completed |
| Licensed reproducible corpus; real inference; raw predictions and quality/uncertainty | Completed with explicitly small sample |
| Model meets minimum usefulness | **Failed: CLIP accepted coverage1/7 vs >=50%; other candidates do not solve task** |
| Selected model, approved converted assets, normal-release opt-in AI | **Not achieved; promotion prohibited after failure** |
| Exact Chrome/WASM execution and research lifecycle | Verified for recorded flows |
| GPU, additional engines, physical/constrained mobile, native peak memory | Unverified; not advertised |
| Baseline browser regressions | Final50/50; initial3 failures and unchanged rechecks disclosed |
| Unit suite | Final82/82; existing78+new4 |
| TypeScript/lint/build/isolation | Exact outcomes in final summary/logs |
| Production Vercel configuration and model delivery | **Unverified:403 team grant; CLI fallback scope inaccessible** |
| Live deployment unchanged; no Phase04 work | Confirmed |

No passing-model integration or production hosting claim is deferred into Phase04. Those remain Phase03 blockers.

## Second Attempt — Focused Evaluation

**Result: BLOCKED at candidate eligibility, before new inference.** Existing MobileNet was inspected for the narrower broad-content question; MobileCLIP-S0 was the only new candidate inspected. No old CLIP comparison, YOLOS experiment, object detection, captioning, segmentation, OCR or face recognition was run. No model was downloaded. No twelve-image corpus was collected because no model could be cleared for the required product use; this is not an allegation of image-license/access failure. No protocol/threshold was fitted, and no old test result was reused as new independent evidence. New quality metrics and inference latency are unavailable, not passing by default.

`scripts/audit-phase03-focused.mjs` saved pinned Hub metadata, processor/config and source/converter license/cards under `evidence/second-attempt/`. Exact revisions: local MobileNet `3ba07f12712fa58fd6b3d661f9909c9e332c5005`; MobileCLIP conversion `757d59c9c6870a76a4b0306f05f5061bca15c39f`; upstream MobileCLIP `71aa3e13dda93115871afbd017336535ba29886c`. Five local files were hashed successfully against the existing manifest. Remote ONNX hashes/sizes are metadata declarations, not verified graph downloads. No browser compatibility was inferred from those hashes. The model-evaluation section explains task mismatch, the83.79MB delivery calculation, and software-versus-weight license distinction.

Executed for this attempt:

```powershell
node scripts/audit-phase03-focused.mjs
npx prettier --write scripts/audit-phase03-focused.mjs
npm test
npm run lint
npm run build
npm run typecheck
npx playwright test tests/browser/release.spec.ts --workers=1 --reporter=json
```

Current results: **82/82 existing unit tests pass**, no failures/skips. **3/3 focused production Chrome tests pass** in32.513s, no failures/skips/retries. TypeScript, lint and normal production build pass. Postbuild inspects78 emitted/trace files and public assets: no AI dependencies/models/runtime binaries or research routes. The focused browser result is recorded in `evidence/second-attempt/release-browser.json` and summarized in `verification-summary.json`. These existing tests cover actual numerical analysis and image replacement,1440px/390px layouts, four tabs, same-origin GET/no body traffic, no model/inference downloads and research/model-route404s. No production integration or allowlist change was made.

Not executed this attempt: the complete50-case production browser suite, prior model comparison/replay, new real-model inference, research build, GPU/Firefox/Safari/physical-mobile benchmarks, native memory tests, new AI lifecycle/UX tests, or additional Vercel connector/CLI requests. The full prior suite and40 inference records remain historical evidence. Failed eligibility makes a new AI UI/backend qualification inappropriate within this bounded attempt. There are no new test cases and no mocked output counted as inference.

Build/Chrome and the realpath unit test used the documented local process/filesystem permissions. No permission review rejection occurred. The metadata script has no model-weight URL downloads, image uploads, credentials or secret output. The existing production privacy/GPS controls and Phase01/02 schema/calculations were not modified. Vercel deployment compatibility is substantiated only for the local non-AI target; no licensed model artifact delivery was established. Production and Phase04 were untouched.

## Final Completion Assignment — Executed Verification

Actual final evidence is in `evidence/final/`; earlier sections remain historical. Five new research tests execute the pinned TinyCLIP runtime, its12/12 calibration-test pass, Places365 runtime/reference check, its12/12 development-test pass, and calibration-only stability/timing/privacy/retry diagnostics. All five pass as engineering harnesses; **both quality decisions fail**. No successful harness assertion is counted as semantic qualification. Each held-out set was scored once; the earlier interrupted run contained only TinyCLIP's first calibration image. Full final rankings and frozen thresholds are retained.

Conditions: headless desktop Chrome155, localhost, unthrottled, WASM one thread. No physical-mobile/WAN/other-engine/GPU result is claimed. Diagnostic runs are not isolated CPU benchmarks (formatting briefly overlapped); no speed improvement claim is made. Cold wall times3,968ms TinyCLIP and2,488ms Places365; initialization2,671.8/1,888.1ms. Warm identical-input inference352.9/366.6ms, preprocessing62.6/13.3ms. Original/dark/blur inference ranges245.1–519.1ms TinyCLIP and242.7–400.9ms Places365. Both retain their original top class under dark/blur transformations of the same calibration parent. Sample counts are too small for cross-device budgets. Actual response Content-Length values are in `browser-benchmark.json`; they are local payload bytes, not internet download predictions. Tiny graph24,281,512 and Places graph45,445,545 bytes; runtime26,914,834.

20ms heartbeat maximum gaps were260.8ms TinyCLIP and95.7ms Places365 across those diagnostics. Page V8 snapshot maxima10,694,136/13,050,656 bytes explicitly exclude dedicated-worker/native WASM allocations and transient peaks; they are not model-memory limits. Same-origin GET/body-free request assertions, no initial model request, one live worker, completed release, aborted-download failure and explicit retry passed. No broad new AI lifecycle qualification is claimed after quality failure.

Intermediate failures retained: worker-URL conditional bundling caused a timeout; missing explicit `allowLocalModels=true` caused a configuration error; non-tensor processor metadata cleanup interrupted calibration. Static Worker constructors, explicit local paths and guarded Tensor disposal fixed those defects before the completed held-out pass. Commons429 resumed saved selections; one jewelry query lacked a licensed JPEG and changed to a same-subject query before annotation. An initial focused-production-browser command exited with Windows status-1073740791 before a report; its empty/partial launch log was retained and the command rerun without compilation/lint competition. No test/gate was weakened.

Current checks: **85/85 unit tests** (82 existing+3 integrity/taxonomy/split tests), **3/3 focused production Chrome tests** in32.724s, TypeScript, lint and normal production build pass; unchanged scanner inspects78 emitted/trace files and finds no model/research output. Focused production Chrome outcome is in `release-browser.json` and final summary. Complete50-case production suite was not rerun because no AI was integrated; its earlier pass remains historical. Research GPU/other browsers/physical mobile, exhaustive cancellation/replacement and production model hosting are unverified.

Commands: `node scripts/prepare-phase03-final.mjs`; `node scripts/download-phase03-tiny.mjs`; corpus preparation/contact/freeze scripts; `node scripts/screen-phase03-places.mjs`; `python -m pip install onnx`; `python scripts/convert-phase03-places.py`; `npm run build:research`; individual `npm run test:research -- final-*.spec.ts` files; `npm test`; `npm run lint`; `npm run build`; `npm run typecheck`; `npx playwright test tests/browser/release.spec.ts --workers=1 --reporter=json`. New weights/source files stay under research, outside release public assets; no deployment or private-image API occurred.

## Qwen Local Companion — Implementation and Verification

**Engineering checks pass; PHASE03 remains BLOCKED by the frozen quality gate.** Current machine-readable aggregate is evidence/qwen/verification-summary.json; earlier counts remain historical.

| Check | Actual result |
|---|---|
| Complete unit suite |87/87,0 failures |
| Existing production Chrome suite |50/50,0 skipped/flaky/failures;537.516s |
| New companion production UI tests |5/5; exact duration in companion-browser.json |
| Companion API/security unit tests |20/20 |
| Real exact-reference multimodal smoke |PASS; mapped project GGUF and copied vision DLL verified |
| Frozen held-out Qwen output quality |10/10 structured responses; grounding gate FAIL |
| Actual official HTTPS→loopback |PASS in Chrome155 with normal permission, no TLS/security bypass |
| Real cancellation / normal unload |PASS; cancelled inference unavailable, model process gone |
| Packaged runtime / parent-crash ownership |PASS; native listener127.0.0.1 only; child gone0.375s after parent kill |
| TypeScript / lint / production build |PASS |
| Release isolation |78 emitted/trace files inspected; no model/runtime/companion payload or research route |

The five new UI tests exercise the normal built app with explicitly mocked companion responses, including an enabled capability solely to test the successful rendering branch. They verify labeled controls and no horizontal overflow at320/390px, no initial request, pairing before transfer, only id/image in the request, bounded fresh JPEG without EXIF/GPS/filename, no persistent browser credentials, malformed-output rejection, cancellation/replacement and stale-response suppression. The failed-gate test verifies the real shipped capability state disables image transfer. They are not model-quality evidence. An initial new test failed because blue.png was not an existing fixture; the fixture filename was corrected to the existing quadrants.jpg and all four core cases were rerun, then the five-case suite including mobile was run. Initial failure JSON is retained; existing50 regression assertions were not weakened.

Security tests cover loopback binding, exact Origin/no wildcard/no credentials, Host rebinding rejection, one-use codes, expiry/attempt limits, unauthorized requests before decoding, short-session revocation, strict/duplicate/nonfinite JSON, request size/type/image format/dimensions, metadata removal, no command/filesystem/URL operations, bounded concurrency, expired-session cancellation, failed promotion and stale preprocessing. HTTPS evidence additionally proves raw native generation401 without its private key, actual production-origin pairing200, authorized status200, real-image200 and cancelled-response503 after model stop. No actual user image was used; only licensed fixtures.

**Measured Windows11 hardware:** Intel i5-10500H2.50GHz,12 logical processors,16,993,001,472bytes RAM; CPU runtime4 threads, GPU layers0. Integrity scan7.0s; evaluated model load4.375s (reference smoke7.094s). First structured held-out inference31.906s; nine warm requests22.281–56.782s, median38.766s. Pixel preparation16–78ms. Actual generation128–180tokens with384 bound; prompt tokens525–597 in the frozen cases. Peak native working set3,553,243,136bytes and private committed memory2,865,549,312bytes over3,673samples. These exclude browser/Python UI allocations and do not establish a universal minimum or GPU performance. Model/projector bytes are1,930,556,928. Reserve at least4GiB available for the model plus OS/browser;16GB total on this tested CPU is the support floor, not a lower-RAM certification.

Normal unload1.141s. Real HTTPS cancellation1.137s to stopped/no PID; parent-kill cleanup0.375s. The separate HTTPS cat test took71.875s of inference while the50-case browser suite also ran, so it is **not** a clean warm-performance benchmark. Startup9.219s in that run and3.187s in the ownership test also reflect different cache/load conditions. Native CPU time and per-request runtime token/timing records are retained; no GPU or universal throughput claim.

**Packaging boundary:** portable Windows Python/Tk application built successfully from existing local files without downloading binaries. Native window launch, initial layout and exit were observed; the first layout exposed clipping and a scrollable container was added. Further final-window interaction was not safely verified because computer-use capture repeatedly returned the foreground browser instead of the requested app. No coordinates from that wrong surface were used. Packaged Python/service imports, exact model import, ready state, real generation, stop/cancel and abrupt-parent cleanup were tested independently. Full final GUI import/start/stop, screen-reader support and an independent human product review remain unverified. No signed installer, public binary/model publication or other OS support is claimed.

Reproduce engineering checks: npm test; python -m unittest discover -s companion/tests -v; npm run typecheck; npm run lint; npm run build; npx playwright test --workers=1 --reporter=json; npx playwright test --config playwright.companion.config.ts --reporter=json; node scripts/verify-release.mjs. Packaging uses scripts/package-companion.py. scripts/verify-qwen-https.mjs runs the controlled real HTTPS/native integration; scripts/verify-companion-ownership.py tests kill-on-close. Evaluation instructions and outputs are frozen: the quality runner refuses to overwrite the retained held-out run. Do not rerun/tune those cases and call them independent. scripts/record-qwen-evidence.mjs asserts and assembles the summary. No commit/push/merge/deploy/Phase04 action occurred.


## Cloud Vision API Integration — Final Product Architecture

Date: 2026-10-22. User story: local upload and measured results → optional disclosure + access + consent → bounded preview → server validation/admission → real provider adapter → validated interpretation rendered separately. No deployment occurred.

### Real inference versus deterministic tests

Real Gemini `gemini-3.5-flash-lite` succeeded twice: a one-pixel red PNG was described as red; the final adapter's synthetic black/white/gray/red quadrant JPEG returned correct quadrant observations with schema validation, 6,863 ms, 1,213 input / 97 output tokens. The raw normalized response and sanitized account probes are in `evidence/cloud-vision.json`. Earlier legacy-model 404 and two unsupported schema 400s are also recorded. Corrected the provider schema without relaxing the server output validator. No repeated live quota test, NVIDIA inference, Cloudflare inference, paid activation, model download or image-file persistence occurred.

Mock adapter/router tests prove routing logic, serial stop-on-success, legitimate 429 fallback, known/unknown cooldowns, explicit re-enable after an elapsed known reset, all-disabled/suspended state, invalid keys, missing models, billing errors, transient outages, timeout, refusal, invalid output and cancellation. Cloudflare's documented daily 3036 and temporary-capacity 3040 stay distinct. Tests simulate genuine provider *response shapes*, not genuine quota exhaustion or real fallback account eligibility.

The complete handler test exercises a real synthetic JPEG through consent/auth/origin/admission/container validation, a mocked provider and the response contract. Admission/cooldown SQL runs against actual SQLite, not a mock counter: racing submissions, per-client rolling minute/day, global UTC-day budget, global concurrent lease, expired leases, monotonic cooldowns and unknown-reset suspension are verified. D1 transport is implemented but **not genuinely exercised** because account access is denied. No production end-to-end D1/inference claim is made.

Browser Cloud AI requests are intercepted and return explicitly mocked descriptions. They verify no traffic before start/consent; no remote provider requests from the browser; oriented JPEG with no original EXIF/GPS/fixture camera text; 1024 × 768 preview from a 4000 × 3000 source; consent/access reset; mobile unavailable/malformed states; real endpoint 403/405 protections; timeout; cancel; replacement during an active upload; and rejection of stale responses. Existing tests verify all four tabs, local/GPS behavior, exact numerical contracts and no uploads during ordinary local analysis. Desktop/mobile screenshots were inspected; these show mocked rendering, not inference evidence.

### Commands and results

- `npm test`: **116/116 PASS**, comprising 87 prior tests and 29 new Cloud Vision adapter/API/security/SQL tests; zero failures/skips. Node 24.15 provides built-in SQLite only for tests, not the deployment.
- `npm run lint`: PASS. `npm run typecheck`: PASS.
- `npm run build`: PASS, Next 16.4.0. Routes are `/`, framework not-found/error handlers and approved `/api/cloud-vision` only. Automatic postbuild release verification: **88 emitted script/JSON/trace files inspected**, no research routes/model assets/companion import or provider secrets in client chunks. Old research/model URL regressions remain in production Chrome tests.
- `node scripts/audit-cloud-secrets.mjs`: **0 findings**, 54 historical blobs and 741 source/report/log/output files inspected at that run. Checks configured values (including the account ID) and common key patterns, excludes the intended secret file, and never prints values. It is not certification of every unknown historical secret format. `git check-ignore .env.local` succeeds; no credentials were edited, logged, uploaded or deployed.
- Initial `npm run test:browser`: **46 PASS / 8 FAIL of 54**, six workers. Three new test mistakes (wrong expected fixture size and two ambiguous status locators) were corrected. Five existing strict timing assertions failed under concurrent host resource pressure. No timeout or analytical assertion was relaxed. The historical handoff also used a single worker.
- Full `npm run test:browser -- --workers=1` and the final focused Cloud AI recheck: results are recorded in the handoff and `evidence/cloud-vision.json` after completion. A new upload/timeout test initially read the intercepted body before its route callback; it now explicitly waits for capture. No application code change was necessary for that harness race.

### Security and limits of the evidence

No `NEXT_PUBLIC_` secrets, arbitrary image URLs, image/prompts in logs, permanent image storage, local AI runtime/model downloads or process-local authoritative quotas exist in this feature. The owner-issued access capability is not an arbitrary identity header. Missing/expired billing attestation, inaccessible D1, no authorized invitation or absent consent rejects inference. The public interface is therefore safe to build but **currently unavailable for real inference**.

The real model smoke proves syntax and simple image comprehension, not independent photo grounding, identity safety across all content, worldwide provider-term eligibility, financial risk of an uninspected account, physical mobile/Safari/Firefox behavior or actual remote D1 concurrency. Access invitations and participant attestation depend on owner vetting; they are not ID verification or geofencing. Secrets audit has explicitly bounded coverage. Provider cancellation is transport cancellation, not deletion of already-received image data. Account plan changes invalidate cost verification and must disable the pilot.

Engineering Integration: **BLOCKED** until actual free-account billing and accessible verified free shared enforcement are established and one admitted end-to-end real flow is run. AI Grounding: **EXPERIMENTAL**. Phase 04 Readiness: **NO**. These gates are not waived by passing local tests.

Final Chrome outcome (2026-10-22): full one-worker run **55/56 passed in 9.0 minutes**, including **all 50 unchanged baseline cases**. Its sole failure was the new timeout test's interception-capture race. After adding a wait for the route callback (test-only change), the complete Cloud AI file passed **6/6 in 52.0 seconds**, zero failures/skips. Thus every one of the **50 baseline + 6 Cloud AI cases passed across these runs**; this is not represented as a final clean single-run 56/56. No application assertion, timing threshold or numerical behavior was weakened. No additional real inference was consumed for browser tests.

Final secret-audit recheck: **54 historical blobs / 752 inspected files, zero findings**. `git diff --check` passes. Formatting-only cleanup does not change the tested application behavior. Architecture/security review confirms that the remaining blockers are account cost and actual remote shared enforcement, not a hidden anonymous inference fallback.

## Centralized AI Routing, Shared Quotas and Owner Control Center — Finalization

Date: 2026-10-22. The checkout was inspected independently of earlier reports. Engineering / Cost Safety / Production Readiness remain **BLOCKED** on external setup and admitted live verification; Phase 04 **NO**.

### Final checks

| Check | Actual current result |
| --- | --- |
| Full `npm test` | **132/132 PASS**, no failures/skips: prior 116 tests plus 16 central policy/admin cases. |
| Final fresh full `npm run test:browser -- --workers=2` | **58/58 PASS**, no failures/skips. Includes all 50 established regressions, 6 Cloud AI cases and 2 admin cases in one complete run after the final dashboard correction. Playwright's final run record is `passed` with no failed tests; test listing confirms 58 cases. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS, installed Next 16.4.0. |
| Automatic release isolation | PASS, **124 output/trace files** inspected. Exact approved admin/API routes; no model/runtime/research/companion bundle or client secret reference. |
| Focused admin Chrome prerequisite check | **2/2 PASS**; reported separately, not substituted for the full 58-case result. |
| `npx tsx scripts/cloud-d1.ts check` | **BLOCKED** at the verified D1 configuration gate; no database connected or changed. |

The new concurrency case uses eight independent SQLite worker connections, followed by a second eight-worker round. A model daily cap of one admits exactly one reservation. After increasing that model cap, only one additional reservation fits the global concurrency ceiling of two. This is genuine concurrent SQLite/trigger evidence, not proof of remote Cloudflare D1 execution.

Real SQL tests additionally cover multiple participants sharing a primary quota; exact Gemini 3.1 fallback after primary exhaustion; both model budgets unavailable; project-wide RPD/RPM/TPM; conservative token reservations without refunds; uncertain timeout/outage accounting; duplicate action/model protection; three-attempt defense; over-reservation usage triggering an audited stop; database failure preventing provider calls; zero Cloudflare Neurons/NVIDIA allocation; explicit day/minute quota distinctions; Pacific DST day windows and quota restoration without deleting counters.

Admin tests cover genuine server authorization, signed/hashed/expiring sessions, forged-cookie rejection before D1 lookup, CSRF rejection, persistent settings, optimistic revisions, safe ceilings, audit triggers, emergency stop and credential-rotation revocation. Chrome uses real authenticated handlers and SQLite through an explicitly intercepted transport: sign-in, HttpOnly cookie visibility, model/global changes, audit history, stop, sign-out and mobile overflow pass. Desktop/mobile screenshots were visually inspected. The harness makes no model call and does not claim D1 transport.

### Failures retained

An earlier complete one-worker run passed **58/58 in 9.0 minutes**. Final review then found that the dashboard could name a preferred model after its internal quota was exhausted. The displayed primary now considers model/project minute and daily capacity, reserved tokens, global admission/concurrency and cooldowns. A real-SQL assertion verifies selection of the secondary after primary exhaustion. After this correction, all **132 unit tests**, TypeScript, lint, production build, isolation and the fresh full **58-case two-worker Chrome run** passed. Desktop/mobile admin screenshots were re-inspected. This final run supersedes the earlier run as verification of the final source.

The first focused admin run was **1/2**: the local server correctly rejected localhost login because its origin still defaulted to the production domain. Playwright now explicitly configures only its test server's exact localhost origin. No wildcard or production-origin relaxation was added. The recheck passed 2/2 before the fresh full suite.

An early compatibility test attempted seven actions in one minute after the global rolling-minute policy became stricter; its timestamps were spaced to isolate the daily-cap assertion, while separate minute tests remain. An admin audit assertion was scoped to owner actions instead of including fixture initialization. These were test corrections, not relaxed numerical/security behavior. No Phase 01/02 calculation, browser assertion or six-second timing threshold was weakened.

### External evidence and limits

Fresh authenticated model GETs returned **200** for exact `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`; both advertise generation and 1,048,576 input / 65,536 output tokens. Official exact-model documentation confirms image input. Workers AI token/model discovery succeeds, but subscription inspection is **403/code 10000** and D1 discovery **401/code 10000**. A dedicated D1 credential/database/free-plan attestation is absent.

The available browser has no authenticated Cloudflare or AI Studio session: both require sign-in. Temporary tabs were closed without login, token creation, terms acceptance or account changes. **No new inference request was made while billing is unverified.** The earlier two real Gemini 3.5 successes remain historical evidence; no current Gemini 3.1 inference, real D1 admission or admitted browser-to-provider flow is claimed.

The bounded model smoke now refuses generation without current free-account attestation and appends evidence without replacing history. The admitted smoke requires an actual configured D1 connection, owner invitation and local production server. Its completed D1 record and validated DOM must agree; it cannot substitute a SQLite mock or bypass shared enforcement. These concrete checks remain prepared, not completed.

A new random owner application secret and one-day owner-test invitation were generated in ignored `.cloud-ai/` and registered locally in ignored `.env.local`, without printing values. Existing provider secrets remain unchanged. No free-billing, D1 or public-release gate was asserted. The secret scanner now includes owner/D1 credentials. Final scan counts are recorded below and in the existing consolidated evidence file; intended ignored credential destinations are excluded from leakage scanning.

Evidence scope: Chrome viewport emulation, real local SQLite semantics and mocked provider routing; no physical-mobile/Safari/Firefox, invoice attribution, remote D1 compatibility or independent broad-image grounding claim. Invitations enforce capability quotas, not human identity; sharing a code shares its daily limit. No images, EXIF, raw IPs, personal prompts or API secrets enter telemetry. No paid infrastructure, local-model research, commit, push, merge, deployment, Vercel configuration change or Phase 04 work occurred.

Final secret audit: **54 historical blobs / 803 inspected files / zero findings**. Prettier and `git diff --check` pass. The scanner's configured-value/common-pattern coverage excludes intended ignored credential files and is not forensic certification of every past secret format.

## Final Remote Verification and Git Cleanup

Date: 2026-10-22. These are freshly executed results for this request; prior runs remain above as history.

| Check | Current result |
| --- | --- |
| Full unit suite after dependency patch | **133/133 PASS**, no failures/skips; includes alias-conflict rejection and unchanged runtime free gate |
| Companion Python suite | **34/34 PASS**; local historical dependencies preserved |
| Vendor frozen inventory | **76/76 PASS**, offline, no overwrite/download |
| TypeScript / lint | **PASS** after the patch |
| Production build | **PASS**, Next **16.4.2** |
| Release isolation | **PASS**, **124 output/trace files**, approved routes only |
| Fresh full Chrome | **58/58 PASS**, two workers, **289.790 seconds**, no failures/skips/flaky tests or global errors |
| D1 connection/schema | **PASS**, actual remote `hidden-data`, migrations **1/2** applied; second invocation skipped them |
| Remote atomic reservations | **PASS**, **one of eight** concurrent calls admitted at model cap 1 |
| Remote accounting | **PASS**, persisted counters/logs, uncertain outcome charged without refund |
| Remote secondary/cooldown/reset | **PASS**, application SQL in isolated remote fixture namespace; controlled fixture time for expiry/day transition |
| Remote owner persistence | **PASS**, real authentication handlers/session records, same-value stopped config update, revision/audit, logout |
| Production dependency audit | **0 vulnerabilities** after the patch |
| Full dependency audit | **5 high dev dependency entries**, one unpatched braces root advisory; not an all-dependency pass |
| Real admitted browser/provider inference | **NOT RUN**, billing verification remains pending by owner confirmation |

The database was remotely inspected before migration and contained only Cloudflare's internal table. Migrations created nine project tables plus a migration ledger, indexes and accounting/audit triggers. No unrelated data was overwritten. The verifier creates a separate, random, clearly prefixed copy of the exact project schema and runs `SharedLedger` SQL through real HTTPS D1 requests. Eight calls run concurrently; all other verification queries are bounded. Small fixture tables are retained, with no DROP statement or production counter reset. A second HTTP query confirms counter/log persistence. Controlled future SQL clock values belong only to fixtures; no claim of observing actual provider midnight is made. Actual application policy remains stopped with all models off and zero production attempts.

Owner sessions/configuration use actual project tables and the real owner secret through server handlers with a supplied remote ledger. That proves D1 authentication/persistence; it does not claim a real browser login through an absent runtime free-account gate. The Chrome admin lifecycle uses the explicitly labeled SQLite transport harness. The real admitted browser → D1 → Gemini story remains unexecuted, and historical adapter probes are not substituted.

The initial TypeScript check caught an overly broad UUID filter type predicate in the new verification script; it was corrected and type validation passed before remote writes. The first build then stopped on Next 16.4.0 security advisories after compilation. Next and eslint-config-next were patched to 16.4.2, followed by fresh unit/type/lint/build/isolation checks and a full Chrome run. No application analytical assertion or browser timing threshold was relaxed. Full npm audit still reports the unpatched development braces chain; no forced major downgrade was applied.

Git inventory: **694 before → 610 after**; **86 existing files / 353,913,443 bytes newly ignored**, with two source helpers added. All original paths still exist. Retained review counts: **366 source/test/fixture/script**, **192 documentation/evidence/root configuration**, **52 companion/research source/metadata/license**. No ignored path is already tracked, no staged file exists, and no model/private configuration is prepared for commit. Scanner coverage now includes both D1 aliases and text in companion/research/Python/HTML paths; intended ignored credential files, binaries, large text and dependency/build directories remain outside portions of this bounded scan.

Final Chrome JSON records 58 expected, 0 unexpected, 0 skipped, 0 flaky, no global errors; Playwright's final-run record is `passed` with no failed tests. Final secret audit: **54 historical blobs / 908 inspected files / zero findings**. Formatting and diff whitespace checks pass. Read-only local integrity verification additionally matched **19/19** retained baseline/experiment/TinyCLIP assets against existing manifests, without downloads or inference; this checks preservation, not renewed model qualification. No focused run or old result substitutes for the freshly completed full suite.

No new model call, account setting change, billing activation, provider-key change, historical deletion, commit, push, merge, deployment, Vercel update or Phase 04 work occurred. The only remaining release gates are actual account free eligibility and the one admitted inference after those confirmations.

## Owner-Only Admitted Verification

Date: 2026-10-22. Owner-confirmed free billing is now recorded with 24-hour local attestations. The final exit remains **BLOCKED**, because the one real admitted Gemini attempt timed out. Cost Safety is **PASS** for the owner-confirmed restricted free setup; Production Readiness **BLOCKED**, Phase 04 **NO**.

| Boundary/check | Fresh result |
| --- | --- |
| Browser owner sign-in, persisted session/reload, audited model/global controls | **PASS**, actual Next API and remote D1; no intercepted admin transport |
| Synthetic image, opt-in consent, invitation, input validation and remote admission | **PASS**, one accepted action and one model reservation recorded |
| Real Gemini response → validated observations → browser output | **FAIL / BLOCKED**, existing 12-second adapter deadline exceeded; no successful DOM verification |
| Real uncertain accounting and release | **PASS**, one uncertain timeout, 4,096 tokens reserved in model/project windows, zero released-budget refunds, action lease released |
| Restore stop, disable model, sign out | **PASS**, original global policy restored, all models off, subsequent unauthorized admin GET rejected |
| Full unit suite | **133/133 PASS**, zero failures/skips |
| TypeScript / lint / production build | **PASS**, installed Next 16.4.2 |
| Release isolation | **PASS**, 124 output/trace files inspected |
| Production dependency audit | **PASS**, zero vulnerabilities; prior unpatched development-only braces finding remains documented |
| Fresh full Chrome | **58/58 PASS**, two workers, **292.384 seconds**, 0 failures/skips/flaky cases/global errors |
| Final secret audit | **0 findings**, 54 historical blobs / 908 inspected files; intended ignored credential files excluded |

The admitted smoke was invoked once and exited 1. D1 records `gemini-3.5-flash-lite`, `uncertain`, `timeout`, 13,000 ms, reserved_tokens=4096, null input/output/actual usage, fallback=0. The four aggregate rows (model/project × minute/day) each show one reservation and one failed/uncertain attempt, not four separate provider calls. Reported-token aggregate zero is unreported usage, not measured zero cost/consumption. The pre-test production attempt count was zero. No automatic retry, alternative provider, quota reset or timeout increase was performed.

The existing smoke's generic failure message was corroborated by an independent read of actual D1 logs/counters. A small ignored diagnostic initially used unsupported top-level await under this repository's CJS tooling; it was wrapped in an async entry point before the successful read. A local configuration comparison initially referenced an unavailable dotenv module; a direct comparison then verified that all existing credential/configuration lines were unchanged apart from the three explicitly authorized local settings. Neither diagnostic invoked a provider or altered request accounting. The wrapper's authenticated finally cleanup verified emergency stop restored, models disabled and owner session revoked even after the failed smoke.

This run establishes a real admitted **attempt** and real failure-path accounting, not the required successful end-to-end model result. No scientific grounding, physical-device coverage, universal free-service uptime, independent billing API or successful response is inferred. Existing reports and earlier probe history remain intact.

After the full Chrome run, another read of actual D1 confirms **exactly one total production attempt**, zero completed attempts, the original uncertain debit, emergency stop on, no enabled model and zero active owner sessions. Six owner audit records cover actual login, model enable, stop release, stop restore, model disable and logout. Full dependency audit was also refreshed: 0 critical / 5 high development-chain entries; the production-only audit is clear. Diff whitespace and ignored/staged-path checks pass; no staging or untracking occurred. Git remains 610 changed files, preserving the previous cleanup. No second provider request was needed for these checks.

## Gemini Timeout Alignment — Final Verification

Date: 2026-10-22. Fresh results for the authorized timeout correction; earlier failed/complete runs remain history.

| Check | Verified result |
| --- | --- |
| Focused server Cloud AI/central policy suite | **48/48 PASS**, zero failures/skips; includes two new deadline/body/cancellation regressions |
| Focused Cloud AI/admin Chrome suite | **8/8 PASS**, one worker, **53.766s**, zero failures/skips/flaky cases/global errors |
| TypeScript / lint / formatting | **PASS** |
| Production build | **PASS**, Next 16.4.2, Node runtime; emitted cloud route maxDuration **60s** |
| Release isolation | **PASS**, **124 output/trace files** inspected |
| Secret audit | **0 findings**, 54 historical blobs / 907 inspected files; bounded configured-value/common-pattern coverage |
| Real admitted image analysis | **PASS**, one new actual browser/Next/remote-D1/Gemini call, HTTP 200, validated observations visibly matched the response |
| New actual usage | **1,213 input / 128 output / 1,341 total tokens**; 4,096 reserved tokens retained |
| Prior uncertain debit | **PRESERVED**, original timeout outcome, null actual usage, 4,096 tokens still reserved |
| Final D1/admin state | **2 total attempts, 1 completed, 1 uncertain**, no unreleased action, stop on, all models off, zero active sessions |

The test image is the existing 40×24 synthetic quadrant fixture. The smoke records **3,157 ms** browser response wait and **2,227 ms** API processing; full smoke **12,588 ms** includes 6,752 ms local analysis/presentation. D1's second-resolution clock records a 1,000 ms attempt interval; no precise pure-provider latency is inferred. Both model/project daily aggregates show 2 reservations, 1 completed, 1 failed/uncertain, 8,192 reserved tokens and 1,341 reported actual tokens. These scopes describe the same two requests. Unknown consumption from the old timeout is not counted as measured zero.

The 45-second Gemini allowance is inside the 50-second processing budget and unchanged 60-second route limit. The browser's 65-second deadline permits preparation and response/accounting overhead. Fetch and response-body reads share both caller cancellation and the provider timeout. Retention cleanup is bounded by remaining route time. The smoke's response wait is 70 seconds with a 120-second diagnostic ledger lifetime. No existing quota, image/output limit, consent, auth, release, billing, idempotency, max-attempt or uncertain-accounting control was relaxed.

Focused fake-clock tests verify an accepted response after the old 12s cutoff, a stalled body expiring at 45s and immediate parent cancellation. The browser test verifies it stays active after the old 50s cutoff, then times out at 65s. Existing privacy/cancel/replacement/admin cases pass in the focused run. A fresh full 58-case suite was **not** run for this focused correction; previous full results remain labeled history.

The real flow used normal browser owner authentication/audited activation and restored the stop/model state through authenticated endpoints afterward. A post-regression read confirms only one new provider attempt occurred, the earlier uncertain record is unchanged and owner sessions are revoked. Sanitized smoke telemetry now records exact stage/duration and safe API/D1 outcome metadata on failure as well as success, without image bytes, prompts, observation text or credentials. No repeated real inference was needed.

Engineering **PASS**, Cost Safety **PASS** under current owner confirmations, Production Readiness **READY for the restricted pilot**, Phase 04 readiness **YES** as a gate only. Grounding remains experimental. Public release stays closed, and no commit/push/merge/deployment/billing activation/Vercel update/Phase 04 work occurred.


## FINAL READINESS AUDIT — EXIT REVIEW

**2026-10-22 — Phase 03 Completed; Final Readiness Audit CONDITIONAL; Phase 04 READY as an engineering gate only; public deployment NOT YET AUTHORIZED.** No Phase 04 work, deployment, staging, commit, push, merge, paid billing or Vercel setting change occurred. No critical application defect remains in the exercised scope. Conditional means experimental quality with limited evidence, optional providers still unqualified, an unpatched development dependency advisory, and local Git temporary garbage whose deletion automatic approval blocked. It does not authorize public inference.

Current safety is verified remotely: emergency stop ON; every model disabled; zero active owner sessions; zero unreleased actions; temporary owner invitation revoked (actual local production HTTP 403); public-release flag absent. Production D1 retains **3 attempts: 2 completed, 1 uncertain**. Both primary-model and shared-project Pacific-day counters retain **3 reservations / 12,288 charged tokens / 2,743 reported tokens**. The uncertain request still has unknown actual usage; it was never refunded. Free billing remains the owner's expiring manual attestation, not a billing status inferred from an API key.

Fresh evidence is consolidated in [cloud-vision.json](evidence/cloud-vision.json), under `finalReadinessAudit`. Earlier failed calls and historical evaluation records remain intact. The authoritative exact proposed Git scope is [commit-scope.json](evidence/commit-scope.json).

Fresh post-correction checks pass: **143 complete retained unit tests**, including **52 cloud/admin** and **4 persistent traffic** tests; **119 production unit tests from a Git-candidate-only copy**; **58 complete production Chrome tests**, zero skipped/unexpected/flaky, final run 287.690 seconds; **34 companion Python tests**; 76 offline vendor hashes; TypeScript, lint without warnings, production build and 124-output release-isolation audit. The candidate-only test copy used the existing node_modules installation via junction, not a claimed fresh network install. No optional model files, private env or unresolved-rights photographs were copied.

Traffic tests exercise real handlers and persistent WAL SQLite through independent connections, mocking only providers. Arrivals 10/40/100 admit 2 each and deny 8/38/98 with maximum provider concurrency 2; batch durations 309/376/525ms include injected 1ms SQL query delay and are local measurements, not deployed throughput. Ten visitors each complete three spaced actions and a fourth visitor action is denied. Controlled SQL clocks cover minute/day/Pacific/DST behavior without resetting production counters. Actual remote D1 admits 1/8 competing for the final fixture slot and preserves production policy/attempts. Fail-closed database failure, shared model/project RPM/TPM/RPD, conservative reservations, timeout/cancellation and bounded routing are included.

One genuine owner-only quality request passes browser → remote D1 → Gemini, validates the returned observations in the DOM and verifies a one-attempt/4,096-token reservation increase in both quota scopes. It reports 1,402 tokens and 4,361ms API elapsed time; the one-contact-sheet quality evidence is limited, reused and not an accuracy benchmark. Real owner controls persist and audit through D1; desktop/390px layouts, HttpOnly session/reload, stop/disable/logout and revoked-invitation HTTP 403 are verified. Session expiry, CSRF, unauthorized writes and unsafe policy rejection are covered by regressions. No credentials or source image bytes appear in production request logs.

Production `npm audit --omit=dev` reports **zero vulnerabilities**. Full audit retains **five high development-only findings** rooted in [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); published latest braces 3.0.3 remains affected. Npm's offered lint-config major downgrade was not applied. The bounded secret scan finds **zero matches** in all 628 Git candidate files and 638 history/capture blobs ≤10MB, including all 54 main blobs. One large local capture blob is outside that bounded history scan. Configured credentials/private invitation and common key patterns are checked; unknown historic secret formats are not forensically certified.

Git connectivity and whitespace checks pass. Exact 628-file classification/594-change scope and hashes are in `evidence/commit-scope.json`; no ignored file is tracked and nothing is staged. The 68GB stale local temporary Git object files remain: automatic approval rejected their deletion as blocked by policy, zero files were deleted, and no alternative deletion was attempted. These files and the auxiliary local Codex capture ref are outside the proposed source-branch commit. Main's largest historical blob is 1,035,757 bytes, largest new candidate 10,720,472. See [handoff](PHASE-03-HANDOFF.md#final-readiness-audit--exit-review) for the complete inventory, source/license decisions and prepared owner commands.

Not executed: archived real local-model browser benchmarks/new research inference, genuine Gemini 3.1/Cloudflare/NVIDIA inference, physical mobile, or deployed Cloud AI integration. The unchanged live HTTPS page responds 200; the cloud implementation is local. No earlier result was substituted for these fresh totals. Public traffic remains blocked and all safety settings/invitations/sessions are restored as stated above.
