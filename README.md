# OUAHAD HIDDEN DATA

**Latest exit review, 2026-10-22: Phase 03 COMPLETED; audit CONDITIONAL; Phase 04 READY as an engineering gate only. Public deployment NOT YET AUTHORIZED.** Fresh checks: 143 complete retained unit, 119 production unit from a candidate-only copy, 58 production Chrome, 34 companion Python, typecheck/lint/build/isolation pass. One new real admitted Gemini contact-sheet analysis succeeds; quality remains EXPERIMENTAL. Stop ON, all models OFF, owner session/invitation revoked, uncertain debit preserved. See [FINAL READINESS AUDIT — EXIT REVIEW](docs/phase-03/PHASE-03-HANDOFF.md#final-readiness-audit--exit-review) and [exact commit scope](docs/phase-03/evidence/commit-scope.json). Every older status block below is historical.

Latest timeout-fix verification: **Phase 03 PASS for the restricted free-tier configuration**. Gemini now has 45 seconds within a 50-second API budget, a 65-second browser wait and the unchanged 60-second Node route limit. One new real browser → remote D1 → Gemini request succeeded with validated observations visible; the previous uncertain request remains charged. Focused server/browser checks pass. Emergency stop is restored, all models disabled and public release still closed. Phase 04 readiness is YES as a gate only; no Phase 04 work or deployment occurred. See **Gemini Timeout Alignment — Final Verification** in [the Phase 03 handoff](docs/phase-03/PHASE-03-HANDOFF.md); earlier summaries remain history.

Current Phase 03: optional **AI Visual Observations** uses a secure Next.js Cloud Vision endpoint. Gemini `gemini-3.5-flash-lite` passed real image inference and structured-response validation. Public inference remains **BLOCKED** until account-level free billing and a shared usage ledger are verified. AI grounding is **EXPERIMENTAL**; Phase 04 readiness is **NO**. Nothing was deployed. See the final **Cloud Vision API Integration — Final Product Architecture** section in [the handoff](docs/phase-03/PHASE-03-HANDOFF.md).

The four local measurement tabs and six-second presentation remain independent. Cloud processing requires a restricted pilot invitation, explicit external-processing consent and an adult professional participant in Morocco. Metadata-free previews are sent sequentially; no image is stored by this app. The old companion is absent from release bundles. Existing provider secrets remain server-side and unchanged. Setup requirements are in [the architecture report](docs/phase-03/PHASE-03-ARCHITECTURE.md).

Earlier phase summaries below are historical and superseded by that final section for Cloud AI status.

Latest Phase03 assignment: **Qwen Local Companion — BLOCKED on grounding quality.** The exact existing Qwen3-VL Q4_K_M/native runtime genuinely processes images; a Windows companion, production UI connection, exact-origin pairing and actual HTTPS-to-loopback transport are implemented. The frozen six-photo/four-transform evaluation failed, so the companion disables observations and the website prevents image transfer to that configuration. Current checks: 87 unit, 20 security and 55 production Chrome tests pass. See [the final handoff](docs/phase-03/PHASE-03-HANDOFF.md), [companion setup](companion/README.md) and [machine-readable evidence](docs/phase-03/evidence/qwen/verification-summary.json). Prior sections below remain history. No deployment occurred.

The current reliability audit and verified test counts are in [docs/phase-01/PHASE-01-HANDOFF.md](docs/phase-01/PHASE-01-HANDOFF.md). The phase descriptions below record earlier implementation history. Normal builds expose the local statistics workspace only; AI research code remains isolated from the release.

Phase 02 adds weighted luminance percentiles and HSV saturation interpretation with traceable methods, sampling/opacity basis and clear limits. See [docs/phase-02/PHASE-02-HANDOFF.md](docs/phase-02/PHASE-02-HANDOFF.md) for the analytics contract and verification; the original measurements and four tabs remain intact.

The four-phase program's **Phase 03 is BLOCKED**: fresh licensed-image evaluation found insufficient useful coverage after CLIP abstention calibration; no model was promoted. See [docs/phase-03/PHASE-03-HANDOFF.md](docs/phase-03/PHASE-03-HANDOFF.md) for real inference evidence, candidate decisions and remaining acceptance criteria. Historical “Phase 3/4” descriptions below refer to earlier prototype work, not a passing Phase 03 AI release.

The second and final focused attempt also stopped as **BLOCKED**, before new inference: the local classifier did not fit the broad-content task, and MobileCLIP-S0 did not clear product-use licensing and standard delivery-size eligibility. The handoff separates this stop from the first attempt's benchmarks; no additional research cycle or production integration was started.

**Every image has a story.** A standalone, browser-only image statistics prototype by OUAHAD SPACE. Phase 2 adds validated native-pixel analysis and an Image DNA summary to the approved V1.1 interface.

Phase 3 adds the adaptive workspace, local EXIF/metadata discovery, private GPS disclosure, real processing stages, and light/Sobel-detail maps with interactive comparison. See [docs/phase-3-workspace.md](docs/phase-3-workspace.md) for the layout audit, development-issue investigation, methods, tests and limits. Phase 2 pixel calculations and sampling remain unchanged.

The pre-Phase-4 loading presentation now has a configurable 6000ms minimum, a six-stage instrument-style panel and live worker status. Real analysis runs immediately; display waits for both its result and the presentation minimum. Early completion is explicitly disclosed. Cancel/replacement stop pending presentation and stale results. See [docs/loading-presentation.md](docs/loading-presentation.md) for tuning constants, timing logic and file inventory. Timing safeguards, lint, TypeScript and production build remain covered by validation.

The loading UI now visualizes the selected image and its real palette, luminance histogram, light map, Sobel map and measured report. A captioned schematic grid represents sampling, while unavailable outputs remain clearly pending. No stock illustration, random analytical data or main spinner is used. The current browser suite totals 29 passing tests, including the new stage visuals and temporary-map cleanup.

## Run locally

The app requires Node.js 20.9 or newer and npm. Full verification uses Node.js 24.15, including built-in SQLite for atomic shared-limit tests.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For production locally, run `npm run build` followed by `npm start`.

## What works

- Select or drag-and-drop one JPEG, PNG or WebP, preview, explicitly analyze, explore Overview / Color / Light, then replace or clear.
- Original decoded dimensions, reduced aspect ratio, exact file size and signature-detected file format.
- Up to six dominant color families with HEX values and approximate shares; average RGB; HEX copying.
- Average relative luminance, shadow/midtone/highlight shares, standard deviation, min/max range and a 32-bin luminance histogram.
- Image DNA: a measured-value summary of average RGB, largest RGB color family, luminance, tonal spread and opacity-weighted coverage.
- Metadata tab for supported EXIF camera/settings/orientation/time/software information and PNG software text. GPS coordinates stay hidden until explicitly revealed with a privacy warning.
- Original, light, Sobel detail and original/detail comparison views; spatial maps have a maximum 512-pixel longest edge independently of the native statistical sample.
- True worker processing stages, cancellation and responsive fit-based desktop sticky preview; natural mobile stacking without nested results scrolling.
- Stage-based progress, keyboard-operable result tabs, mobile layouts, graceful invalid/corrupted/transparent-image errors.
- Official logo and icon assets preserved in `public/brand/`, with their original proportions.

## Analysis and privacy

The browser validates file signatures and MIME consistency (when supplied), a 20 MiB file limit, and decoded dimensions of at most 40 million pixels. It uses its native image decoder with a timeout. A decoded ImageBitmap transfers to a dedicated worker. Native sRGB pixels are read without resizing or interpolation in bounded 512×512 tiles. Images up to 262,144 pixels use every pixel; larger images use up to 262,144 deterministic stratified sample points, one per rectangular cell, weighted by that cell's original area. The worker closes the bitmap, resets its canvas and zeroes retained sample buffers before returning results. Blob URLs are revoked on replacement, errors and unmount. A generation token discards stale work if a user changes images during analysis.

Average RGB uses area-and-alpha-weighted encoded sRGB values rounded to whole bytes. Integer alpha units avoid accumulated channel-sum rounding. Luminance first linearizes sRGB, then applies Rec. 709 coefficients (0.2126 / 0.7152 / 0.0722). Histogram bins span [0,1], with white in the last bin; all distributions use the same effective weights. Empty histogram bins have zero height. The product-defined tonal bands are shadows below 0.2, midtones from 0.2 to below 0.7, and highlights at least 0.7. Tonal spread is population luminance standard deviation computed with weighted Welford updates; range is min/max among analyzed pixels. These describe variation, rather than a universal contrast score or an accessibility contrast ratio.

Dominant colors use 5-bit RGB bucket means, stable spread-based seeds, and up to 24 rounds of weighted RGB k-means with early convergence and up to six clusters. Rounded duplicate centroids are merged. The reported colors are cluster centroids, so they need not match original pixels. Fully transparent pixels are excluded; partial transparency contributes proportionally, without compositing onto a background. Coverage is average alpha over image area, not the fraction of pixels with nonzero alpha. Results identify whether all pixels or a sample were analyzed, and sampled light metrics carry approximate labels and fewer decimal places.

Local image measurements make no upload, external analytics or AI requests. User previews use native blob URLs, outside Next.js image optimization. Optional Cloud AI alone uses `/api/cloud-vision`, owner-issued access codes and a verified shared D1 usage ledger. Until free billing and the ledger are verified, it refuses inference. Cloud observations stay separate from numerical facts. Google unpaid processing can include product improvement and human review; do not send personal, sensitive or confidential images.

## Architecture and files

| Path                                                    | Responsibility                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/app/layout.tsx`, `page.tsx`, `globals.css`         | App Router entry, metadata, official icon and responsive visual system |
| `src/components/image-lab.tsx`                          | Selection, safe decoding, preview, cancellation and analysis lifecycle |
| `src/components/results.tsx`                            | Accessible result views and visualizations                             |
| `src/analysis/types.ts`                                 | Engine input/output contracts                                          |
| `src/analysis/files.ts`                                 | File validation and browser decoding                                   |
| `src/analysis/pixels.ts`                                | Pure pixel analysis, independent of React or DOM                       |
| `src/analysis/analysis.worker.ts`                       | Off-main-thread computation with transferable buffers                  |
| `src/lib/format.ts`                                     | Human-readable file sizes                                              |
| `tests/pixels.test.ts`                                  | Known-value math and validation tests                                  |
| `tests/browser/lab.spec.ts`, `playwright.config.ts`     | Chrome end-to-end tests and screenshots                                |
| `package.json`, `package-lock.json`                     | Scripts and reproducible dependency versions                           |
| `tsconfig.json`, `next-env.d.ts`, `next.config.ts`      | Strict TypeScript and Next.js configuration                            |
| `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore` | Tailwind, lint and generated-file configuration                        |

`src/analysis/sampling.ts` contains the pure sample planner and bounded native-pixel tile reader. `src/analysis/dna.ts` creates the deterministic summary. Phase 2 regressions are in `tests/accuracy.test.ts` and `tests/browser/accuracy.spec.ts`; shared display rounding is in `src/lib/format.ts`.

The pure engine and typed outputs support adding independent EXIF, edges, composition, browser vision or report-export modules later. Those features are not implemented in this phase.

Runtime packages: Next.js 16.4.2, React / React DOM 19.3.0 and Lucide React 0.468.0. Development packages: TypeScript 5.9.3, React/Node type definitions, Tailwind CSS 4.3.3 with its PostCSS plugin, ESLint 10.12.0 with Next.js configuration, Prettier, tsx and Playwright. Exact installed versions are in the lockfile.

Phase 3 adds ExifReader 4.50.0 inside the deferred analysis worker. It receives local ArrayBuffers only. Current validation totals are 33 unit tests and 20 browser tests; previous Phase 2/V1.1 counts below describe those historical phases.

## Validation

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:browser
```

Browser tests use installed Google Chrome and start an isolated production server on port 3001, keeping the development preview on port 3000 separate. Build first. Port 3001 must be free. Screenshots are generated in ignored `test-results/`.

Validated with exact solid red, a 75/25 red-blue distribution, equal black/white, sRGB gray and alpha-weighted samples. Tests verify average RGB, dominant HEX/share, luminance, standard deviation, histogram endpoints/normalization, transparent-buffer errors, empty/oversized/spoofed files and format signatures. Chrome tests cover actual PNG/JPEG/WebP decoding, dimensions/aspect ratio, worker results, keyboard result tabs, replacement/reset, corrupted images, fully transparent images, mobile drag-and-drop and overflow at 390px and 320px. Network observation covers the analysis flow: no non-GET requests, upload bodies or external requests; local/session storage remain empty; no uncaught page errors in the main flow.

## Limitations

The historical V1.1 visual refinement is documented in [docs/v1.1.md](docs/v1.1.md). Phase 2 preserves that stylesheet byte-for-byte. The current analytical audit, formulas, tolerances, performance observations and complete file inventory are in [docs/phase-2-analysis.md](docs/phase-2-analysis.md). All 25 unit tests and 14 Chrome browser tests pass, including the original privacy and six-width responsive checks.

- Larger images use a stratified native-pixel sample. Rare colors, very sparse visible details and extrema may be missed; RGB families remain approximate even when every decoded pixel is read. No sampling resize introduces mixed colors.
- Browser color management and decoding affect sampled pixels. Animated files are measured at a decoded frame, not across the animation; previews may animate.
- Encoded PNG/JPEG/WebP dimensions are checked against 40 million pixels before preview decoding, with a second check after decode. Supported images can still require substantial native decoder memory; reclamation after URL revocation is browser-controlled. Replacement and cancellation abort active decodes.
- Native sampling requires ImageBitmap and worker OffscreenCanvas support; unsupported browsers receive a clear error. Canvas readback uses 8-bit sRGB, and low-alpha premultiplication/unpremultiplication can round channel values. Browser-specific dimension limits still apply.
- SVG, GIF, HEIC, AVIF and remote-image URLs are intentionally unsupported. Metadata inspection is local; semantic Cloud AI observations are optional and experimental, with inference disabled until release safeguards are verified.
- Mobile was tested through Chrome viewport emulation, not physical devices. Other browsers have not been verified. Clipboard copying requires a secure context (localhost qualifies).
- `npm audit` reports a development-only `braces` stack-exhaustion advisory through Next.js's ESLint glob dependencies. At installation time npm offered a downgrade to an older Next.js lint configuration rather than a compatible patch. No production dependency advisories were reported. Avoid passing untrusted glob patterns to developer tooling.

Next.js also generated `AGENTS.md` when the local development server first started. It records framework guidance for future coding work.

No Git repository/remotes, commits, pushes or deployments were created.

## FINAL READINESS AUDIT — EXIT REVIEW

Production tests are self-contained: `npm test` runs 119 assertions without optional weights or unresolved-rights photos. `npm run test:all` preserves and executes all 143 retained assertions when historical assets are present. Existing source/attribution/manifests remain; eighteen unresolved-rights photographic originals and two reproducible tokenizers are narrowly ignored, not deleted. Restoration constraints and hashes are in fixture READMEs; model/vendor restoration remains optional research setup. No model search or promotion is required for the passing restricted engineering foundation.

The proposed source tree is approximately 80.1 MB across 628 classified files, with 594 changed paths, no known secret matches and no oversized candidate objects. The manifest enumerates every proposed path/hash; `scripts/prepare-commit-scope.mjs --check` validates it and `--pathspec` prepares an exact local NUL-delimited list without staging. All actual staging/commit/publication remains the owner's decision. The handoff records the limited quality evidence, unpatched development advisory, and 1,090 stale Git metadata garbage files (about 68 GB) whose deletion automatic approval blocked. Git connectivity passes; that generated local metadata is outside the proposed commit and was not deleted or rewritten. The live site was checked read-only and was not updated.
