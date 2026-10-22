# Phase 4.4 — Non-AI release preparation

## Result

The default HIDDEN DATA build is a non-AI product. Public results have **Overview, Color, Light and Metadata** tabs. MobileNetV4 is no longer imported, loaded or offered in public results. The warm visual identity, typography, responsive image workspace, official six brand assets and existing analytical/loading algorithms are preserved.

Production contains no experimental routes, ONNX graphs, WASM runtime binaries or Transformers inference bundles. Research remains available through explicit, separately built commands. Nothing was committed, pushed or deployed.

## Public capabilities preserved

- Actual Image DNA based on measured image statistics, dimensions, aspect ratio, file format and size.
- Native-pixel sampling, alpha-weighted RGB averages, approximate color families, real HEX palettes and distributions.
- Linearized sRGB relative luminance, 32-bin histograms, tonal spread and documented approximation limits.
- Original/light/detail views, Sobel detail maps and interactive image comparison.
- EXIF information and explicit GPS privacy controls.
- Image selection, validation, preview, replacement, cancellation, object-URL cleanup and recovery from invalid/corrupt/transparent files.
- All six approved processing stages and animated image-based loading illustration.

The six-second configurable presentation minimum is **unchanged**. All stages still concern actual pixel processing: reading, native sampling, palette extraction, luminance, detail maps and preparing results. There were no AI steps in this base pipeline to remove, and no new waiting was introduced. Unit and browser tests verify fast-work buffering, slow-work gating and independent replacement timing.

## AI excluded, research retained

Removed the public AI Vision tab, dynamic `ai-vision` import and AI-specific tab state. The original component, `src/ai/` implementation, CLIP engine/libraries, YOLOS worker, experimental workspace, research licenses, documentation and prior benchmark evidence remain in the repository.

Moved `public/ai/` to **`research/assets/ai/`** and `public/experiments/` to **`research/assets/experiments/`**. Model/config/tokenizer/runtime bytes were moved, not deleted or redownloaded. The only files under `public/` are the six original logos/icons. Updated the experimental asset-preparation script to the new directory.

Transformers.js remains pinned to **4.3.1**, now a development dependency. Its ONNX Runtime Web/Node dependencies are marked development-only in the lockfile, so they are omitted by a production-only runtime installation. No new package or model version was introduced. Install development dependencies when building or running research; omit them only after the production build has been produced.

## Explicit build separation

`next.config.ts` accepts ordinary `.ts/.tsx` routes for the release target. Only the explicit research target also recognizes `.research.ts/.research.tsx`. The experimental page is now `src/app/experiments/vision/page.research.tsx`. The model-file handlers at `/ai/[...path]` and `/experiments/ai/[...path]` likewise use `.research.ts`, and therefore **do not exist** in the release route manifest. This is build-time exclusion, not hidden links or a runtime-only navigation guard.

Research handlers stream files only from the relocated asset directories, require the research target, reject traversal and verify real paths stay within the allowed directory. Missing/unavailable files return 404. They serve model bytes; they do not process or receive user images. Normal build/start commands explicitly override inherited target flags to `release`. Research uses **`.next-research/`**, separate from the release **`.next/`**.

| Command | Behavior |
| --- | --- |
| `npm run dev` | Non-AI development application, default port 3000 |
| `npm run build` | Non-AI production build plus automatic release verification |
| `npm run start` | Verifies release output, then serves the non-AI build |
| `npm run dev:research` | Explicit research application on port 3002 |
| `npm run build:research` | Separate research build containing experimental routes |
| `npm run start:research -- --port 3002` | Explicitly serves that research build |
| `npm run test:browser -- --workers=2` | Public release browser suite |
| `npm run test:research -- --workers=2` | Retained experimental browser suite after research build |

The three experimental benchmark files moved from `tests/browser/` into `tests/research/`. Five historical public MobileNet-tab tests are retained in `tests/research/archive/vision.spec.ts`, excluded from active runs because their public tab intentionally no longer exists. Their inference coverage remains available through the isolated baseline mode. `tests/research/README.md` documents these moves; historical research reports/evidence have not been rewritten or discarded.

## Production route and bundle verification

`scripts/verify-release.mjs` runs automatically after `npm run build` and before `npm run start`. It fails if:

- The release app manifest includes `/experiments` or `/ai` routes.
- `public/` includes AI route namespaces or ONNX/WASM files.
- Production static/server output contains model/runtime binaries.
- Compiled JavaScript or JSON/tracing output references Transformers.js, ONNX Runtime, MobileNetV4, YOLOS, the CLIP model, quantized graph filenames or research asset paths.

The final release build reports only **`/` and `/_not-found`**; internal manifest entries are `/page`, `/_not-found/page` and `/_global-error/page`. **78 compiled JavaScript/JSON/trace files** were inspected with no AI references. `public/` contains exactly `app_icon.png`, the blue/green/orange/black logos and `Logo_White.png`, all under `brand/`. There are no `.onnx` or `.wasm` files in the production static/server output. The measured complete `.next/static` directory is approximately **0.84 MB**; that includes framework/application assets and is not the compressed initial page transfer size.

Saved verification: `docs/evidence/phase-4-4-release-verification.json`. The final `npm run build` was also run with an inherited `HIDDEN_DATA_BUILD_TARGET=research`; the command still produced the same verified non-AI release, confirming the wrapper overrides inherited research flags. Production browser requests confirmed **404**, including:

- `/experiments/vision`, `/experiments/other`, and `/experiments/vision?research=1`
- `/ai/mobilenetv4/onnx/model.onnx`
- `/ai/runtime/ort-wasm-simd-threaded.asyncify.wasm`
- `/experiments/ai/clip/onnx/model_quantized.onnx`
- `/experiments/ai/yolos/config.json`

Both release image-analysis flows (1440 px and 390 px) recorded exclusively same-origin GETs with no bodies. No AI/model/WASM/inference or remote requests occurred. Selecting red then blue images produced the expected current RGB/HEX results without stale values. Existing active-worker/buffered-result replacement tests also passed. This verifies the tested flows and built dependency graph, rather than merely asserting privacy based on copy.

## Tests performed

- **54 unit tests passed**, covering deterministic RGB/color/luminance/histogram results, sampling/alpha, Sobel maps, EXIF/GPS parsing, invalid-file validation, loading timing/cancellation and retained research algorithms. New asset-handler tests check release denial, traversal rejection and research file access. The local sandbox denied Windows `realpath` access to the moved directory; the complete unit suite passed with host filesystem access. Missing-path/access errors are handled as 404.
- **32 production browser tests passed** in **2.9 minutes** against the production Next server. These preserve the 29 non-AI regression tests and add three release checks: two desktop/mobile analysis/privacy/replacement flows and production-route/model 404s. Known checkerboard, grayscale gradient, partial alpha and uniform-color results remain validated. Comparison maps, EXIF/GPS controls, URL cleanup, invalid files, drag/drop, loading/cancellation, keyboard tabs and responsive layouts passed.
- **Research build passed**, listing the explicit experimental page and two model-serving routes only in `.next-research`.
- **Two retained research browser smoke tests passed** (25.7 seconds): nine real WASM inferences across MobileNetV4, YOLOS and CLIP on tiger, cats and outdoor cooking photographs, plus failure/replacement isolation. This checks that asset relocation preserved working research. It is not a new semantic quality approval; Phase 4.3's decision remains unchanged. The complete 24-image semantic benchmark was not rerun because no model, prompt or inference calculation changed.
- **Lint, strict TypeScript and final non-AI production build passed.** A final release build restores release-generated type declarations after research checks.
- Desktop/mobile screenshots were inspected and saved as `docs/evidence/phase-4-4-desktop.png` and `phase-4-4-mobile.png`.

## Packaging and remaining limitations

Use the verified `.next` release output and `public/brand/` for the release, together with required production runtime dependencies. **Do not ship `.next-research`, `research/`, tests, benchmark fixtures, development caches or development dependencies.** The production build excludes research dependencies/assets/routes, but the source repository deliberately still contains the research archive. Copying the entire repository into a public static hosting directory is not a supported release method. No hosting/CDN/deployment configuration was created or tested.

Tests used Windows desktop Chrome and mobile viewport emulation. Physical Android/iOS devices, Safari/Firefox and real hosting behavior remain untested. Sampling and palette clustering remain approximations, and rare colors/extrema may be missed as disclosed in the product. Original-image decoding still uses browser memory; existing file-size/pixel limits remain in place. EXIF may be missing/stripped and is not independently verified. Images and derived buffers are released where practical, not guaranteed securely erased. The approved six-second presentation minimum remains an intentional UX cost rather than an AI delay.

## Files changed

Public result cleanup: `src/components/results.tsx`, keyboard-tab expectation in `tests/browser/discoveries.spec.ts`.

Build separation: `next.config.ts`, `scripts/run-next.mjs`, `scripts/verify-release.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `eslint.config.mjs`, `playwright.research.config.ts`; generated `next-env.d.ts` is restored to release declarations by the final release build.

Research preservation: renamed `src/app/experiments/vision/page.research.tsx`; added the two `route.research.ts` handlers and `src/experiments/assets.ts`; moved asset directories and experimental browser tests; updated `scripts/prepare-vision-evaluation.mjs` and the shared-license directory note; added `tests/research/README.md`.

Verification: `tests/browser/release.spec.ts`, `tests/research-assets.test.ts`, this report and `docs/evidence/phase-4-4-*`. Approved brand assets, brand tokens, typography, pixel-analysis formulas, maps, metadata/GPS behavior and loading architecture were not changed.
