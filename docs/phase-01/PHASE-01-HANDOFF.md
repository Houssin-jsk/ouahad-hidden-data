# Hidden Data — Phase 01 handoff

Phase completion status: **PASS**. **PHASE 01: PASS** for the audited release core and the documented runtime conditions. No confirmed core P0/P1 remains open.

## Verified foundation

The release remains the existing browser-local image statistics workspace. Selection/drop, JPEG/PNG/WebP decoding, all eight EXIF orientations, dimensions/aspect ratio/file properties, alpha-weighted color/luminance/histogram, measured Image DNA, local metadata with explicit private GPS reveal, light/detail/comparison maps, cancellation/replacement/reset and HEX clipboard are retained. The visual system, four result tabs and six-second minimum presentation are preserved.

P1 repairs: reject oversized encoded dimensions before preview decode; abort active image decode and release handlers/timers during replacement, reset, cancellation and unmount. P2 repairs: correct binary size labels, make research asset access test self-contained and correct obsolete README limitations. No P0 was found and no confirmed core P0/P1 is deferred.

Final unit suite: **60/60 passed** (54 existing plus 6 new). Final production browser suite: **44/44 passed** (31 existing plus 13 new), with zero failures, skips or flaky cases. Production build, standalone TypeScript and lint pass. Commands and evidence are in [PHASE-01-VERIFICATION.md](PHASE-01-VERIFICATION.md). Runtime production dependency audit reports zero vulnerabilities; development caveat below.

## Nonblocking limits

- Five high-severity development audit entries trace to one braces stack-exhaustion advisory through the Next ESLint glob toolchain. This path does not consume uploaded images or user-selected names as glob patterns. npm offers a major lint-config downgrade rather than a compatible patch; no forced downgrade was made. Review a compatible upstream fix when available. This is tracked as a developer-tooling P2 risk, not a deployed image-processing P1.
- Verified runtime is headless Chrome on Windows with viewport emulation, not physical mobile hardware, Firefox, Safari or a screen reader. Low-memory/browser-specific canvas limits can still reject a valid image safely. No native heap-reclamation guarantee, CPU-utilization benchmark or code-coverage percentage is claimed.
- Statistics above 262,144 pixels are sampled; rare colors/extrema may be missed. Palette families are approximate even for small images. Browser color management and low-alpha rounding affect measurements. Animated formats use a decoded frame and may have an animated preview; temporal analysis is not supported.
- AI/scene/detector implementation is preserved as isolated experimental work, absent from normal release routes/assets/bundles. Existing pure session/ranking/geometry tests pass; model inference, WebGPU and research browser benchmark suites were not re-run. No new model was downloaded. Existing research tiger-fixture provenance remains unresolved; the new corpus is entirely synthetic and release public assets contain brand files only.
- The current host's Windows sandbox denies realpath/canonicalization needed by Next and the research file-handler test. Required local checks passed with that restriction lifted. This is an execution constraint, not a weakened application path policy.

## Interfaces Phase 02 must preserve

| Interface / ownership contract | Repository path |
| --- | --- |
| `validateFile(File): Promise<string>` returns signature-derived JPEG/PNG/WebP or throws user-safe validation errors. Enforces 20 MiB, MIME agreement and encoded <=40 MP before decode. | `src/analysis/files.ts` |
| `decodeImage(url, signal?): Promise<HTMLImageElement>` returns an oriented decoded image. Caller clears successful image source; decoder clears failure/abort resources. Abort rejects with AbortError. | `src/analysis/files.ts` |
| `ImageSource`, `PixelStatistics`, `AnalysisResult`: retain dimensions, size, format, sampling basis, native sample count, coverage, metadata/map optionality and mapError semantics. | `src/analysis/types.ts`, `src/analysis/discovery-types.ts` |
| `analyzePixels(RGBA, areas?)` remains pure and deterministic. Weight is integer alpha × original cell area; means, histogram, palette and variance share the same denominator. Fully transparent buffers fail clearly. | `src/analysis/pixels.ts` |
| `planSamples`/`sampleBitmap`: bounded original-resolution, seeded stratified sampling; no resize interpolation for statistics. Cells exhaust source area; arrays and canvas readbacks are explicitly cleared. | `src/analysis/sampling.ts` |
| Worker input `{ bitmap, file }`, transferable bitmap ownership; progress `{ stage }`, terminal `{ result }` or `{ error }`. Worker closes transferred bitmap even on error. Do not add uploaded-image server calls. | `src/analysis/analysis.worker.ts` |
| `inspectMetadata(ArrayBuffer)` returns available/missing/error, selected fields and validated optional coordinates. Parser exceptions must not expose metadata. GPS display remains explicit and reset on new analysis. | `src/analysis/metadata.ts`, `src/components/metadata-results.tsx` |
| `generateMaps` and `mapBitmap`: fixed-scale luminance, per-image normalized Sobel, excluded fully-transparent kernels, bounded 512-pixel maps. Do not relabel normalized gradient as quality/sharpness. | `src/analysis/maps.ts`, `src/components/spatial-preview.tsx` |
| `imageDNA` is a deterministic measured summary, with sample qualification. Preserve provenance if later adding independent analytics. | `src/analysis/dna.ts` |
| Generation token, AbortController, worker/watchdog and Blob URL ownership prevent stale state. New async work must follow invalidation/cleanup paths. | `src/components/image-lab.tsx` |
| `createLoadingRun` separates actual completion from existing presentation timing. Cancelling pending work must release results, URLs and timers. | `src/loading/presentation.ts`, `src/components/analysis-loading.tsx` |
| Normal `dev/build/start` select release regardless of inherited target; research requires explicit separate commands/distDir. Keep postbuild release verification and denied routes. | `scripts/run-next.mjs`, `scripts/verify-release.mjs`, `next.config.ts` |

## Image Analytics Engine integration points

Keep numerical additions in pure modules beside `src/analysis/pixels.ts`, with independent reference tests in `tests/`. Wire bounded processing into `analysis.worker.ts`; explicitly extend the typed result and stage contracts when justified. Use `Results`/`SpatialPreview` for rendering independent optional outputs and clear unavailable states. Preserve the existing statistics and their qualification rather than replacing them with semantic guesses.

Use `tests/fixtures/phase01/README.md`, `tests/reliability.test.ts`, `tests/accuracy.test.ts`, `tests/discoveries.test.ts`, `tests/browser/phase01.spec.ts` and the existing production browser suite as integration regressions. Research `src/ai/`, `src/scene/`, `src/experiments/` is not a validated production Image Analytics Engine and must remain opt-in until separately evaluated. Phase 02 has not been started.

## Deliverables and deployment

- [Architecture, inventory and baseline defects](PHASE-01-AUDIT.md)
- [Implemented changes and regressions](PHASE-01-FIXES.md)
- [Commands, results, corpus and limits](PHASE-01-VERIFICATION.md)
- This handoff; machine-readable build/browser/fixture evidence and representative screenshots in `evidence/`.

The existing Vercel production deployment was left unchanged. No deployment, push, merge or commit was performed. Pre-existing working-tree work was preserved; review this task's focused changes separately from earlier uncommitted research/configuration changes before any future release.
