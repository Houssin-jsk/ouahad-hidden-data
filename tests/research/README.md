# Explicit research target

The public results interface no longer contains AI. The original experimental models, engine, candidate libraries, worker, evaluation workspace, licenses and evidence are preserved.

- `npm run dev:research` runs the research target on port 3002.
- `npm run build:research`, then `npm run start:research -- --port 3002`, runs its separate `.next-research` build.
- `npm run test:research -- --workers=2` runs the retained experimental benchmarks after `build:research`. Normal `test:browser` runs only the non-AI release tests.

The three experimental test files moved here from `tests/browser/` with the same inference assertions. Their relative fixture/source imports remain valid. Historical phase documentation contains the old paths; benchmark evidence is unchanged. These tests continue to write benchmark JSON under `test-results/` as before, while Playwright's research output directory is separate. Do not replace archived evidence unless intentionally recording a new measurement.

`archive/vision.spec.ts` preserves the five historical public MobileNet-tab tests. It is excluded from the active research test run because that public tab has been removed. MobileNet preprocessing/classification remains exercised by `evaluation.spec.ts` in the isolated workspace. The former `src/components/ai-vision.tsx` component and `src/ai/` architecture are retained but never imported by release UI.

Research assets now live in `research/assets/{ai,experiments/ai}`, outside `public/`. Only research builds recognize the `.research.ts[x]` pages and file-serving routes. Normal build/start commands explicitly force the release target even if a research environment flag was inherited. `postbuild` and `prestart` inspect release manifests/bundles/assets and fail if AI is included. Do not ship `.next-research`, `research/`, tests, docs or development dependencies as part of a non-AI deployment package.
