# Phase 02 verification

Status: **PHASE 02: PASS**. This record distinguishes executed intermediate failures from final release evidence; no unexecuted test is counted as passed.

## Commands and counts

Commands ran from `C:\Users\ouaha\OneDrive\Desktop\ouahad-hidden-data` on 2026-10-20. Installed versions and Phase 01 baseline are in its evidence directory. Dependencies were unchanged in this phase.

| Command | Observed result |
| --- | --- |
| `npm test` (restricted environment) | 78 tests: 77 passed, 1 failed in the existing research realpath handler. Same Windows sandbox constraint documented in Phase 01; no numerical failure. |
| `npm test` (required Windows path access available) | 78/78 passed. |
| `npm run typecheck` (initial) | Failed: new legacy renderer test omitted an insight prop typed as required-but-possibly-undefined. Fixed the component prop to be optional, matching its intended contract. |
| `npm run build` (initial) | Compiled, then failed the same TypeScript prop check. Not treated as a passed build. |
| `npx tsx scripts/benchmark-phase02.mts` | Passed. The final recorded run was performed after build completion and before browser launch, with no other task benchmark/build running. Initial exploratory concurrent-build measurements were superseded. |
| `npm test 2>&1 \| Tee-Object -FilePath 'docs/phase-02/evidence/unit-tests.txt'` followed by `exit $LASTEXITCODE` | Final analytical code: **78 passed, 0 failed, 0 skipped/cancelled**; 4636.8421 ms. All prior 60 unit tests plus 18 new tests. Actual output retained. |
| `npm run typecheck` (after prop repair) | Passed. |
| `npm run lint` | Passed, including new components/tests/scripts. |
| `npm run build` (final application code) | Passed: compile 2.8 s; internal TypeScript passed; 3/3 static pages. Release postbuild scanned **78** output/trace files; no research route, AI dependency token or model/runtime asset. |
| `npm run test:browser -- --workers=2 --reporter=list,json --output=test-results/phase02-release` (first complete run) | **48 passed, 2 failed**, 5.2 min. Alpha/replacement test timed out clearing the wide preview; screenshot showed overlap blocking the control. Timing test assertion used host locale narrow-space separators while browser used commas. Numerical assertions passed. Layout constrained and locale expectation now calculated in the browser. |

Screenshot review also found mobile clear-control clipping for 256×32 images. The final test adds direct frame/control/overlay bounds; passing document scroll width alone did not cover overlap. `evidence/wide-preview-before-fix.png` is genuine intermediate failure evidence, not final UI. Repaired 320px/1440px screenshots were visually inspected; final six screenshots are retained in this evidence directory.

Targeted outcome: **6 passed, 0 failed**, 1.5 minutes (one file uses one worker despite the two-worker cap). Repaired mobile/desktop screenshots were visually inspected: no preview overlap or clipped clear control, and expanded methodology remains within its results column. The complete Phase 01 suite is still required below.

Targeted browser command:

```powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results/phase02-targeted.json'
npm run test:browser -- tests/browser/phase02.spec.ts --workers=2 --reporter=list,json --output=test-results/phase02-targeted
```

Final full browser command (after complete build, no concurrent application rebuild):

```powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results/phase02-release.json'
npm run test:browser -- --workers=2 --reporter=list,json --output=test-results/phase02-final
node scripts/record-phase02-evidence.mjs
```

Final browser outcome: **50 passed, 0 failed, 0 skipped, 0 flaky**, **278,386.075 ms** (4.6 min), two workers, beginning **2026-10-20T22:17:50.161Z**. All 44 Phase 01 browser tests plus 6 new Phase 02 tests passed against the completed final build with no concurrent rebuild. The evidence recorder completed successfully and verified the SHA-256 of all 25 unchanged Phase 01 files. `git diff --check` also passed (Windows LF→CRLF informational warnings only). Standalone TypeScript and lint were re-run after the final test/layout changes and passed.

## Independent mathematical verification

New unit references are in `tests/insights.test.ts` and detailed in the design report. Constants were calculated before assertions: uniform black/white endpoints, primary coefficients .2126/.7152/.0722, gray-128 luminance .21586050011389926; ramp quantile indices 12/127/243 with values .003676507324047436/.21223075741405523/.8962693533742664. Weighted CDF [0,.2,.8,1] at cumulative [.1,.3,.4,1] fixes endpoint and noninterpolated behavior. Equal black/white median=0 under this declared definition while original mean=.5 remains unchanged.

Weight references use red (alpha255×area1), gray (alpha85×area3), hidden blue (alpha0×area5): equal visible weights, mean saturation .5, coverage 2/9, source opacity equivalents 2. Exact HSV boundary quartet (.1,.11,.6,.59) yields mean .35 and low/intermediate/strong shares .25/.50/.25. Adjacent encoded gray values 123/124 and 217/218 bracket existing .2/.7 tonal cutoffs. Very dark red S=1 and all-intermediate colors evaluate misleading heuristic counterexamples.

Tests cover zero/invalid/fully-transparent samples, large bounded samples, sample/full basis, mismatch/unavailable states, uniform zero span, ties, probabilities 0/1, safe finite quantities, units, methods/versions, numerical text agreement, JSON/structured-clone round trips and unchanged input arrays. Serialization comparison catches nonfinite-to-null coercion rather than merely checking JSON for the word NaN. Legacy unavailable rendering is exercised through actual React markup and a real browser worker result with only the optional analytics field omitted. No successful measurement values are mocked. Line/branch coverage percentages were not measured.

## Browser, privacy and accessibility scope

Real Chrome executes native codecs, production page, worker/canvas, metadata/maps and actual measured insight text. New tests exercise grayscale ramp evidence at 320/768/1440 CSS px, keyboard disclosure, units/versions, map caveats, no overlap/control clipping, aligned comparison boxes, real partial-alpha weighting, cancel/replacement/clear, sampled estimates and missing-analytics fallback. All earlier metadata/GPS/orientation/statistics/loading/cancellation/resource/clipboard/tab/contrast/responsive tests remain in the full suite.

The new context-level request observer includes worker traffic and asserts no non-GET/body upload, external request, model/inference route or storage write in the alpha/cancel/replace flow. Existing privacy tests cover metadata/GPS and local/session storage. Source review confirms no new fetch, unsafe HTML, third-party script, server handler or browser persistence in analytics/UI. Images and private metadata remain local. Production/research scanner and denied-route tests check model isolation. No physical mobile, Safari, Firefox, screen-reader certification, GPU or native heap measurement is claimed.

## Performance and bundle comparison

Pure-function benchmark (`evidence/compute-benchmark.json`): Node 24.15.0, Windows 10.0.26200, Intel Core i5-10500H @2.50 GHz, 12 logical CPUs. Identical preallocated 262,144-pixel synthetic buffers; two warmups then seven measured iterations per case. The Phase 01 `analyzePixels` implementation is unchanged. Reported medians in milliseconds:

| Pattern | Phase 01 statistics alone, reproduced | Phase 02 insights alone | Combined statistics + insights |
| --- | ---: | ---: | ---: |
| Uniform gray | 39.188 | 39.927 | 71.377 |
| Repeating grayscale ramp | 34.643 | 103.718 | 162.963 |
| Deterministic texture | 74.370 | 116.500 | 193.776 |

These are Node function wall timings, not isolated browser CPU measurements. Sequential measurements include GC/JIT/scheduling effects; medians are not necessarily additive. They demonstrate the bounded incremental work without attributing a speedup to the new phase. There is no decode/canvas/metadata/map or six-second presentation in this benchmark. Scratch arrays are at most 5 MiB plus implementation-dependent native sort storage; native browser heap reclamation was not measured.

The production browser probe separately records real worker wall time (after native construction through terminal result, including asynchronous startup/sampling/statistics/insights/metadata/maps/message delivery; excluding upstream image decode/bitmap creation) and Analyze-to-visible-DNA time (including the preserved 6000ms minimum). The probe runs only in tests. It does not add timing fields or change worker messages. It also records same-origin initial JS Resource Timing `encodedBodySize` and `transferSize` before selection; neither is aggregate generated JS size.

Phase 01 historical user-visible baseline was 6254/6198/6256/6093/6117/6367 ms for dark/bright/gray/low-contrast/tiny/large fixtures. The final Phase 02 comparison is recorded in `evidence/verification.json`. Phase 01 did **not** record initial JS network transfer or worker wall time: no historical delta for those is invented. Worker/initial resource values are Phase 02 observations only.

Phase 01 aggregate emitted static JS was 794,919 raw and 250,758 locally gzipped bytes. Final Phase 02 totals/deltas are taken from the completed build by the evidence recorder, including all framework/deferred worker chunks. This artifact comparison is **not** an initial network-transfer comparison. New modules are static imports in the deferred analysis worker; the main thread imports only the small renderer, type-only contract and existing formatting helpers. No model/runtime dependency was added.

Final observed browser conditions match the recorded Phase 01 hardware: Chrome **155.0.8059.85**, Windows **10.0.26200**, Intel Core i5-10500H @2.50 GHz, 12 logical CPUs, **16,993,001,472 bytes** host memory, **1280×720** timing viewport, headless/unthrottled localhost production and a two-test-worker cap. Resource/timing values below are a single recorded run under test load, not statistical performance guarantees.

| Fixture | Phase 01 visible ms | Phase 02 visible ms | Phase 02 worker wall ms |
| --- | ---: | ---: | ---: |
| dark.png | 6254 | 6160.2 | 105.8 |
| bright.png | 6198 | 6127.8 | 130.9 |
| gray.png | 6256 | 6066.1 | 77.8 |
| low-contrast.png | 6093 | 6072.8 | 73.1 |
| tiny.png | 6117 | 6111.6 | 54.9 |
| large.png (4000×3000) | 6367 | 6192.6 | 417.2 |

Visible measurements remain dominated by the six-second presentation and polling/scheduling variance. Their lower observed numbers do not demonstrate faster computation: the insight layer adds the separately measured work above. There is no Phase 01 worker-time baseline to compare with the last column.

| Artifact inventory | Phase 01 | Phase 02 | Delta |
| --- | ---: | ---: | ---: |
| All emitted static JS, raw bytes | 794,919 | 807,926 | +13,007 |
| Same files, locally gzipped bytes | 250,758 | 256,017 | +5,259 |

Actual initial JS resource observation for Phase 02 before any image selection: **8 requests**, **159,093 encoded-body bytes** and **161,493 transfer bytes** from same-origin Resource Timing. These figures exclude HTML/CSS/images and deferred worker requests. They are not the aggregate artifact totals above. Phase 01 did not measure the corresponding initial resource set, so an initial-transfer delta is unavailable. Per-resource URLs/bytes and per-chunk artifact sizes are in `evidence/verification.json`.

## Acceptance criteria

| Criterion | Final evidence |
| --- | --- |
| Backward-compatible typed analytics contract | PASS — optional payload, discriminated status, literal units, source basis, method/rule versions; legacy browser/render tests. |
| Mathematical definitions documented | PASS — design report with CDF, HSV, weighting, cutoffs, quantile convention and references. |
| Useful tonal and color interpretation | PASS — actual values/intervals/concentrations in the Light/Color tabs, with observation/meaning/limitations and disclosure. |
| Accurate accessible spatial explanations | PASS — existing algorithms preserved, caveats shown, controls contained/aligned, tested at 320/768/1440px. |
| Every interpretation traceable; facts/rules/limits distinct | PASS — structured measurements and method/rule IDs, visible sampling basis; numerical text tests. |
| No unsupported quality/authenticity/AI verdict | PASS — explicit limits, no new model/semantic processing or score. |
| Degenerate/sampled/transparent/invalid handling | PASS — finite measurements or explicit unavailable/error; full/sample weighting and counterexamples tested. |
| Deterministic calculations and independent references | PASS — 18 new unit tests within 78 passing tests; no coverage percentage or universal scientific validity claim. |
| New and existing browser regressions | PASS — 50/50, comprising all original 44 and new 6; no skipped/flaky tests. |
| Cancellation/resource ownership/privacy preserved | PASS — existing and new real worker/cancel/replace/clear/URL/network/storage tests and source review. |
| Research/AI isolated | PASS — 78-file postbuild scan and real denied-route/model-traffic tests. |
| Build, TypeScript, lint | PASS — all executed successfully on final code. |
| Four reports complete | PASS — design, implementation, verification and handoff in this directory, with evidence. |
| Live Vercel unchanged | PASS — no commit/push/merge/deploy or deployment-configuration change. |

## Corpus and remaining limits

All 25 Phase 01 synthetic files are reused without modification and checked by SHA-256 in the evidence recorder. New references are deterministic typed arrays and canvas patterns documented above and in the design/test files; no download or uncertain-license fixture was added. Synthetic verification demonstrates implementation correctness on defined cases, not universal scientific validation of the product-defined bands.

Inherited limitations remain sampling tails/rare details, color management/low-alpha rounding/animation frame selection, unknown physical-device/native-memory behavior, experimental research inference not validated here and the Phase 01 development-only braces advisory chain. No Phase 02 essential work is intentionally deferred to Phase 03. No package/deployment configuration was changed, and no commit/push/merge/deploy occurred.
