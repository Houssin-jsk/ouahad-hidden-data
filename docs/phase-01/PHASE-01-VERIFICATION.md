# Phase 01 verification record

Date: 2026-10-20. **PHASE 01: PASS**. Commands were executed from the repository root on Windows. Build, research realpath test and Chrome launch used the same local workspace with the Windows sandbox restriction lifted; this did not authorize or perform deployment.

## Commands and observed results

| Exact command | Result |
| --- | --- |
| `npm test` (baseline, restricted environment) | 54 tests: 53 passed, 1 failed. Research file handler returned 404 where 200 was expected. Existing config exists; sandbox realpath restriction was subsequently demonstrated. |
| `npm run typecheck` (baseline) | Passed. |
| `npm run lint` (baseline) | Passed. |
| `npm run build` (restricted environment) | Failed loading next.config.ts: SWC could not canonicalize repository baseUrl; Windows Access denied, os error 5. |
| `npm run build` (outside sandbox restriction) | Passed. Static `/` and framework error/not-found pages. Release scanner found no research route, model/runtime asset or AI dependency token in output. |
| `npm audit --omit=dev --json` (restricted network) | Failed DNS resolution for registry.npmjs.org; not treated as a clean audit. |
| `npm audit --omit=dev --json` (network available) | Passed, **0 vulnerabilities**, production dependency count 22. |
| `npm audit --json` | Exit 1: **5 high-severity development dependency entries**, from one braces advisory chain. No production advisory. Details and applicability in audit/handoff. |
| `npx tsx scripts/prepare-phase01-fixtures.ts` (initial generator attempt) | Failed: tsx CommonJS transform does not support top-level await. Generator corrected to `.mts`; no app behavior involved. |
| `npx tsx scripts/prepare-phase01-fixtures.mts` | Passed; generated 25 local synthetic files with Chrome 155.0.8059.85. No downloads. |
| `npm test` (repaired tree, restricted environment) | 59 tests: 58 passed, research realpath test failed. |
| `npm test` (same tree, outside sandbox restriction) | 59/59 passed; confirms environment cause rather than loosening production path checks. |
| `npm run lint` (during test development) | Found one no-this-alias rule violation in the controlled decoder adapter. Added narrowly justified test-only suppression; later checks pass. |
| `npm run test:browser -- --workers=2 --reporter=list,json --output=test-results/phase01` (first attempt) | Test collection failed on import.meta in the new CommonJS Playwright test. Switched to a repository-root path. |
| Same browser command (first completed run) | **42 passed, 1 failed**, 3.6 minutes. Failure was test locator ambiguity between app alert and Next route announcer; app correctly rejected oversized input. Scoped the locator. |
| `npm run test:browser -- --workers=2 --reporter=list,json --output=test-results/phase01-final` | Superseded/interrupted run. A concurrent rebuild invalidated the running server's static asset references; resulting hydration/timeouts are not accepted as product evidence. Final run below uses a completed immutable build. |
| `npm test` (final code, outside sandbox restriction) | **60 passed, 0 failed, 0 skipped/cancelled**; 3655.599 ms test-runner duration. All original 54 unit tests retained, plus 6 reliability tests. |
| `npm run build` (final code) | Passed. Compiled in 5.4 s; internal TypeScript step passed; generated 3/3 static pages. Postbuild inspected **78** output/trace files with no AI/model/research match. |
| `npm run typecheck` (final code) | Passed. |
| `npm run lint` (final code, including evidence script) | Passed. |
| `git diff --check` | Passed; only standard LF→CRLF informational warnings on this Windows checkout. |

Final browser command (PowerShell; JSON report kept separately from superseded runs):

```powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results/phase01-release.json'
npm run test:browser -- --workers=2 --reporter=list,json --output=test-results/phase01-release
```

Final browser outcome: **44 passed, 0 failed, 0 skipped, 0 flaky**, 229,559.735 ms (3.8 minutes), using two Chrome workers. All 31 existing production browser tests and 13 new regressions passed. This run began at 2026-10-20T21:48:26.248Z and used the completed final build without concurrent rebuilds or application-source changes. The following command was executed successfully to record the machine-readable summary:

```powershell
node scripts/record-phase01-evidence.mjs
```

Code formatting during implementation used `npx prettier --write` on the changed files: `src/analysis/files.ts`, `src/lib/format.ts`, `src/components/image-lab.tsx`, `tests/research-assets.test.ts`, `tests/reliability.test.ts`, `tests/pixels.test.ts`, `tests/fixtures/exif.ts`, `tests/browser/phase01.spec.ts`, `tests/browser/lab.spec.ts`, and `scripts/prepare-phase01-fixtures.mts`. Read-only reconnaissance used `rg`, `Get-Content`, `Get-ChildItem` and Git status/diff; no credentials were read. No unexecuted research browser or GPU inference test is counted as passing.

## Actual scope of verification

Unit references cover encoded sRGB means, independently calculated linear luminance of primaries/gray, the 256-level ramp mean 0.3110134861116172 and deviation 0.293965191383006, all 32 expected bin counts, alpha/cell weighting, exact zero variance for uniform images, deterministic family ties, sample area exhaustion/bounds, 75/25 proportions, Sobel zero/step/ramp cases, metadata states, private GPS and malformed formats/bitfields. No math implementation change was needed. No line/branch coverage percentage was measured.

Browser tests exercise the real production page, native codecs, worker script, canvas readback, ExifReader and rendered results. Added EXIF 1–8 tests inspect actual oriented map corner luminances against independently specified expected geometry. Real metadata, light/detail/comparison, 12 MP sampling, Unicode names, drop/chooser, fully transparent input, corrupt payload, no-preview oversized rejection, error recovery, replace/cancel and clipboard flows are covered. Delayed/suppressed worker-message transport and a throwing constructor are used only for failure/timeout branches; successful measurement assertions use real workers and actual fixture pixels.

Accessibility-oriented tests cover keyboard file chooser activation, tab arrows/Home/End, cancel focus recovery, compare range control, progress/status semantics, selected tab relationships, reduced motion, representative text contrast and document overflow. Responsive checks span 320 through 1440 CSS pixels, including 390/768 emulation. These are desktop Chrome viewports, not physical mobile execution or screen-reader certification.

Privacy observations combine import/data-flow review, emitted release scan and browser request/storage assertions. Observed core flows make no non-GET upload or external/model/inference request; uploaded bytes and GPS are not sent through an API. GPS starts hidden and disappears on replacement; local/session storage remain empty in the principal flow. Tests count owned Blob URLs and Worker lifetimes across repeated cancellation and completed/replaced analyses, ending at zero after clear. This shows no obvious owned-resource leak; it does not measure the browser's native heap or certify secure memory erasure.

## Corpus and runtime conditions

`tests/fixtures/phase01/README.md` documents all **25 synthetic files**, purposes and expected outcomes. Actual bytes/SHA-256 values are recorded in `evidence/verification.json`. Existing deterministic browser-generated ramps/checkerboards/partial-alpha and >20 MiB cases supplement them. All new files are synthetic; existing research imagery is neither newly licensed nor distributed to release public assets by this task.

Runtime conditions and small/large fixture timings are captured by the actual final browser run and included in `evidence/verification.json`: browser version, Windows release, CPU model/count, total host memory and viewport. Timings run from Analyze click to rendered DNA, include the deliberate six-second minimum, and come from unthrottled headless desktop Chrome against localhost with two test workers. They are neither isolated engine CPU timings nor mobile benchmarks. Source image dimensions are fixed in the corpus README. No CPU utilization/native heap benchmark was performed.

The evidence recorder lists all emitted static JavaScript chunks with raw and locally computed gzip bytes. This is an artifact inventory, **not initial page transfer size**: it includes framework and deferred analysis worker code. Metadata is imported within that deferred worker, not on initial selection. Production has no model assets to initialize/cache/dispose. Native source decode can still allocate substantial memory below 40 MP; the new guard rejects oversize declared dimensions before starting it.

Measured conditions: Chrome **155.0.8059.85**, Windows **10.0.26200**, Intel Core i5-10500H @ 2.50 GHz, **12 logical CPUs**, **16,993,001,472 bytes** host memory; timing-test viewport **1280 × 720**. Analyze-to-DNA timings: dark **6254 ms**, bright **6198 ms**, gray **6256 ms**, low-contrast **6093 ms**, tiny **6117 ms**, 4000 × 3000 large **6367 ms**. Each includes the preserved 6000 ms presentation. Total emitted static JS: **794,919 raw bytes**, **250,758 locally gzipped bytes**; per-chunk inventory is in `evidence/verification.json`. No initial-transfer, CPU-utilization or native-memory delta is inferred from these totals. Representative final 390px/1440px screenshots were visually inspected and retained as `evidence/release-390.png` / `evidence/release-1440.png`.

## Acceptance criteria

| Criterion | Evidence / status |
| --- | --- |
| Core features inventoried and verified | PASS — inventory in audit; real release browser workflows and independent numerical references. |
| Confirmed P0/P1 repaired | PASS — HD-01/HD-02 resolved; no confirmed P0 or remaining core P1. |
| No known critical privacy/security issue in audited release | PASS — reviewed data flow, no-image-upload assertions, local GPS controls, zero runtime audit advisories. Scope limits remain explicit. |
| Deterministic core numerical references | PASS — unit ramp/primary/alpha/variance/bin/Sobel references and actual worker/browser results. |
| Supported JPEG/PNG/WebP | PASS — real codecs, oriented JPEG, PNG metadata/alpha and WebP in production browser suite. |
| Malformed/unsupported/oversized inputs fail safely | PASS — header/byte/MIME/decode tests and no-preview oversized rejection. |
| Repeated analysis has no stale state/obvious owned-resource leak | PASS — generation/abort/worker cancellation, replacement, result/URL counters and clear-to-zero checks. No native-heap guarantee claimed. |
| Experiments cannot silently mislead production | PASS — no normal-release import, route or model asset; denied-route browser tests; experimental code preserved. |
| Automated core workflow regression suite | PASS — 44 production browser tests. |
| Existing tests pass | PASS — original 54 unit and 31 production browser tests retained within final 60/44 totals. Opt-in research inference browser benchmarks were not counted. |
| Standalone TypeScript | PASS — `npm run typecheck`. |
| Lint | PASS — `npm run lint`. |
| Production build | PASS — static Next build plus 78-file release scan. |
| Available browser/runtime execution documented | PASS — actual desktop Chrome; emulation, hardware and unsupported environments distinguished. |
| No unrelated project/deployment changes | PASS — focused diff review; prior dirty tree preserved; no deploy/push/merge/commit. |
| Four reports produced | PASS — audit, fixes, verification and handoff in this directory. |

## Remaining limits and release assessment

No confirmed core P0/P1 is left open by implementation. Nonblocking limits: developer-only braces glob advisory chain; other browser engines/physical devices and AI inference not re-run; no native heap/CPU utilization or coverage percentage; approximate sampled extrema/families, browser color/alpha rounding and animated-frame timing; existing uncertain provenance of an isolated research tiger fixture. No new dependency or deployment infrastructure was added.

Production compatibility is supported by the exact installed Next build, static output and production localhost route tests. Existing Vercel deployment settings and live site were not changed or used for these checks. No commit, push, merge or deploy occurred.
