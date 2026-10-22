# Phase 4.2 — Scene Discovery engine / AI Vision V2 prototype

## Recommendation

**Keep production AI Vision unchanged.** The new closed-set prototype is useful enough for a controlled desktop evaluation, but not sufficiently validated for general production integration. It broadens the scene library, removes misleading confidence percentages and makes view disagreement inspectable. It still selects a description when the correct scene is absent, and downloads about 156 MB of CLIP assets before runtime/JavaScript overhead.

Use `/experiments/vision` → **CLIP · Scene Discovery V2**. Whole image is the default. Multi-crop comparison is optional and diagnostic; this benchmark provides no evidence that enabling it by default improves correctness. No caption generation, object-count claims or production bounding boxes were added.

## Library and selection method

The frozen library is **`ouahad-scenes-36-v1`**, defined in `src/scene/candidates.ts` and copied into the archived benchmark evidence. It contains exactly six descriptions in each of six themes. Descriptions were selected for distinct visual subjects/settings/activities rather than synonym ensembles. No country, ethnicity, recipe or tagine-specific identity is inferred. The cooking description is one candidate, not an amplified cluster of cooking synonyms. Themes have equal candidate counts and are not summed into category probabilities.

| Theme | Exact descriptions |
| --- | --- |
| Nature | a mountain landscape with a lake; a forest with trees and vegetation; a beach or coastal landscape; a desert landscape with sand or bare rock; a river or waterfall in a natural environment; cultivated fields or farmland |
| Indoor spaces | a furnished living room; a bedroom with a bed; a bathroom with washing fixtures; a classroom or teaching space; an office workspace with desks; a warehouse or industrial interior |
| Food & dining | outdoor cooking with pots over a fire; food being prepared in a kitchen; a meal served on a dining table; a market stall displaying fruit and vegetables; bread and pastries in a bakery; cups or glasses containing drinks |
| Animals & people | a wild animal outdoors; pets resting indoors on furniture; birds in their surroundings; people walking along a street; people playing a sport; people tending a garden |
| Objects & activities | pottery or household utensils on display; clothing or textiles on display; books or paper documents; musical instruments or a musical performance; tools used for building or repairs; an abstract view of reflections or glass surfaces |
| Technology & built world | computers or electronic equipment; cameras or optical viewing equipment; road vehicles or traffic; a train or railway scene; boats or a harbor; buildings or architectural structures |

Every prompt is exactly **`This is a photo of {description}`**. The 36 descriptions and crop policy were frozen before Phase 4.2 inference; they were not tuned after looking at rankings. Curated themes inevitably overlap semantically (for example water/landscape and animals/settings). Equal counts and lack of synonym duplication do not make this set unbiased or exhaustive. It is a small English-language taxonomy, not unrestricted visual understanding.

The original ten-candidate Phase 4.1 mode remains separately selectable and unchanged. Its archived scores remain candidate-relative and are not directly comparable with V2 cosine values.

## Model and reusable architecture

- Same verified **Xenova/clip-vit-base-patch32**, combined q8 graph, revision `d15189d7028b43f1d3e65039190477f6af591c2a`.
- Graph: **153,695,702 bytes**, SHA-256 `0898a3facfdb27f0a041e57649b4989cfd094e4a0040d6ae75ed69917dfc7328`. Existing pinned configs/tokenizer and model manifest are reused. No new model artifacts or packages were added in Phase 4.2.
- Transformers.js **4.3.1**, matching same-origin Asyncify ONNX Runtime from Phase 4. Explicit **WASM, one thread** is the verified CPU compatibility path. The new CLIP engine does not attempt WebGPU; production MobileNet GPU results are not reused as CLIP evidence.
- Original CLIP repository MIT license and upstream research-use cautions remain relevant. Xenova's export card does not independently declare derivative licensing. Existing notices remain under `public/experiments/ai`; confirm redistribution provenance before release. Sources: [CLIP model card](https://huggingface.co/openai/clip-vit-base-patch32), [original MIT license](https://github.com/openai/CLIP/blob/main/LICENSE), [pinned export](https://huggingface.co/Xenova/clip-vit-base-patch32/tree/d15189d7028b43f1d3e65039190477f6af591c2a).

`src/scene/clip-engine.ts` is independent of React. It accepts a loaded model/processor/tokenizer and an ImageBitmap, creates bounded input views, runs inference, extracts actual embeddings and releases temporary tensors/buffers. Prompt tokenization is cached for the frozen library. Model initialization is reused across images and the two CLIP experimental modes; changing to baseline/detector disposes the prior session. The combined graph still recomputes text embeddings on each view. Caching separate text embeddings with separately validated encoders is a future optimization, not a claimed optimization here.

`ranking.ts` owns scoring/summary semantics and `coverage.ts` owns deterministic crop geometry. The experimental worker supplies real loading/view statuses; no fake percentages or presentation delay are added. Generation checks, replacement cancellation, watchdog and explicit model release remain separate from inference. The production AI tab, pixel engine, DNA, metadata, light/detail maps, brand tokens and staged base loader are untouched.

## Exact scoring, themes and uncertainty

For each candidate text embedding `t` and image embedding `i`, the engine computes:

`cosine(i,t) = dot(i,t) / (L2_norm(i) × L2_norm(t))`

It validates finite, nonzero vector norms and ranks all 36 candidates by descending cosine, with stable ID ordering for exact ties. Scores can be negative; they are **not softmax percentages and do not sum to one**. Higher indicates closer embedding-space alignment for that pair. There is no conversion to accuracy, probability of correctness, “strong match” category or universal confidence threshold. Optional technical details display cosine rounded to three decimals and the top-two gap, without interpreting that gap as a calibrated certainty measure.

The first five whole-image candidates supply the leading description, alternatives and their unique library theme names. Themes describe candidate categories; they do not prove people/objects/activities are present. Alternatives are other rankings within this library, not factual scene statements. No narrative caption is fabricated from these candidates.

For multiple views, different leading IDs produce **“Ambiguous across views”**. Shared leading IDs produce an explicit caution that overlapping crops are correlated and agreement is not proof. This is a structural comparison, not an uncertainty calibration or independent voting system. A whole-image-only result also states that its leading match does not establish correctness. Missing-category uncertainty remains unresolved: CLIP will still return a nearest candidate for an unfamiliar image.

## Image coverage experiment

Whole-image preprocessing fits the complete oriented bitmap into a **224 × 224 white square**, preserving aspect ratio. Transparent areas are composited on white. The official CLIP processor applies its channel rescaling/normalization. Letterboxing differs from CLIP's usual center-crop convention and must be evaluated for each target domain; it is not inherently more accurate.

Multi-crop runs that same whole view plus three square views. Each square has side **0.75 × min(width,height)**. For landscape/square images, views are centered, left and right with vertical centering. For portrait images, views are centered, top and bottom with horizontal centering. Regions are recorded in original decoded-image coordinates. Crops overlap and cover partial context; they do not detect or localize individual objects.

**No averaging of crop scores occurs.** Whole-image ranking stays primary, even if a crop differs. Per-view rankings remain visible in “Compare image coverage” and in raw evidence. This deliberately avoids making an unvalidated crop ensemble look like a reliability improvement.

## Fixed benchmark and actual results

Fixture specification: **`discovery-six-photos-v1`**, `tests/fixtures/discovery/benchmark.json`. Original images were inspected before inference. They cover comparable Moroccan outdoor cooking, one clear animal, multiple pets/objects, an empty indoor room, a lake/mountain landscape and distorted window reflections. Known relevant IDs were written before inference; the empty-room case intentionally has no exact candidate. This is a qualitative diagnostic set, not a random held-out accuracy benchmark. It does not validate all 36 descriptions or every theme.

The new three fixtures are unmodified Wikimedia photographs: FASTILY's empty apartment (CC BY-SA 4.0), Karthika Manikandan's lake/mountain landscape (CC0), W.carter's old-window reflections (CC0). Attribution/source links and API snapshots are in `tests/fixtures/discovery/README.md`. The inherited cooking image is CC BY-SA 3.0; tiger/cat fixture image-specific redistribution limitations remain documented in their existing READMEs. The user's original failing photograph was not supplied.

Archived evidence: **`docs/evidence/phase-4-2-benchmark.json`**. Eighteen real analysis runs were performed: six MobileNet baseline calls, six whole-image CLIP calls and six four-view CLIP calls (30 actual CLIP view inferences). Chrome headless on Windows, production Next build, local assets, WASM one thread. The archived run had another browser executing regression checks concurrently; timings therefore include system contention.

| Photograph | MobileNet top label | V2 whole-image leading description | Cosine | Whole / four-view inference ms |
| --- | --- | --- | ---: | ---: |
| Outdoor cooking | spiny lobster (7.3% ImageNet score) | outdoor cooking with pots over a fire | 0.269 | 2,427 / 6,469 |
| Tiger | tiger (61.7%) | a wild animal outdoors | 0.255 | 1,595 / 5,582 |
| Cats/remotes | tabby (81.1%) | pets resting indoors on furniture | 0.257 | 2,028 / 6,571 |
| Empty indoor room | spotlight (14.4%) | a furnished living room | 0.287 | 1,750 / 5,932 |
| Lake/mountains | lakeside (79.4%) | a mountain landscape with a lake | 0.284 | 1,394 / 5,537 |
| Window reflections | guillotine (8.6%) | an abstract view of reflections or glass surfaces | 0.284 | 1,316 / 5,770 |

Five leading descriptions align broadly with the inspected subject/settings. This is not a reported “83% accuracy”: images were deliberately selected, descriptions are coarse, three fixtures were previously known, and the empty-room case lacks an exact description. The empty room is a concrete failure: “furnished” is unsupported and the left crop changes to bedroom. Other alternatives also reveal errors—river/waterfall and people playing sport rank near cooking, while bakery appears among the cat-image alternatives. Do not treat all leading themes or alternatives as confirmed content.

All four views retained the same leading ID for cooking, tiger, cats, landscape and reflections. The room's left crop disagreed. **The primary match improved on zero images through multi-crop**, because whole view remains primary; crops provided one useful disagreement warning but no demonstrated correction. View agreement on the others is not independent evidence of correctness. Whole image remains the preferred default; crops are an explicit inspection tool with a substantial time cost.

## Download, warm performance and memory measurements

CLIP assets in the existing manifest total **155,926,112 bytes** including an unused special-token sidecar. The files actually requested for this engine decode to **155,925,640 bytes**. Shared runtime factory/WASM adds **26,914,834 bytes**, plus lazy JavaScript. Homepage/experiment opening requests no model; first Run initializes it. No new model copies were downloaded for this phase.

Worker Resource Timing measured the **153,695,702-byte graph** with **153,696,002 transfer bytes** (includes reported overhead), duration **770 ms** from this local production server. Tokenizer JSON duration was **131 ms**, decoded **2,224,119 bytes** and transfer **571,926 bytes** with compression. These are localhost fetch observations, not internet/mobile download predictions. Resource details are in `assetLoads`. Missing Content-Length headers are recorded as `null`, not zero-sized downloads.

First CLIP initialization was **3,280 ms**, including local model loading/session construction; the shared runtime was already initialized by the baseline runs. Subsequent same-model calls reported approximately 0 ms initialization. Whole-view inference in this archived run was **1.3–2.4 s**; four-view inference was **5.5–6.6 s**. Preprocessing was **7–58 ms** whole and **34–59 ms** four-view. An earlier isolated run observed approximately **1.1 s** on later whole-view calls and **4.3–4.9 s** on later four-view calls. None of these are mobile guarantees. The larger candidate set costs more than the ten-prompt Phase 4.1 matcher because the current combined graph runs the text encoder for all prompts on every view.

Chromium DevTools `Runtime.getHeapUsage` was collected from the **worker**, after each completed call. Across CLIP snapshots: used V8 heap **14,933,040–18,544,160 bytes**, backing storage **27,531,436–52,102,054 bytes**. Values varied with garbage collection. These counters do **not** establish total browser RAM or peak memory: original decoded images, native runtime/linear-memory allocations, compiled code and other process allocations are not fully represented. They must not be used to advertise a 52 MB model footprint. Peak process memory and physical low-memory-device behavior remain unmeasured.

Temporary canvases are bounded to 224 px; each RGBA view is 200,704 bytes and float input is 602,112 bytes. Buffers/tensors are released after each view and the bitmap is closed after the run. Original-image decoding still depends on the source resolution. Loaded model and prompt tokens persist only in the worker until mode disposal, explicit release, cancellation or page close.

## Browser support, privacy and failure behavior

Verified: current desktop Chrome, WASM SIMD, Workers, createImageBitmap and OffscreenCanvas, desktop and 390 px mobile layouts. There is no provided physical phone session; Android debugging tooling (`adb`) was unavailable. No physical-mobile performance certification, Safari/iOS, Firefox, new CLIP WebGPU path or automatic CLIP GPU-to-WASM recovery test is claimed. WASM is deliberately used as the known CPU compatibility path in this prototype.

All inference is local. Runtime/model/tokenizer paths are same-origin; remote model loading and application Cache API persistence are disabled. Only an ImageBitmap crosses into the worker. No image file, EXIF/GPS data, analytics payload, paid API or external inference request is sent. Ordinary HTTP model caching remains browser-policy dependent. Images/predictions are not persisted by the application; the test runner writes only fixed-fixture observations locally.

Download/worker errors and the three-minute watchdog leave native analysis unaffected. Replacement invalidates the generation and terminates active research work, so old results cannot reappear. Base product tests still exercise real statistics, metadata privacy, maps and staged loading. YOLOS remains in its explicitly experimental mode; its false positives and localization tests from Phase 4.1 are retained. No detector filtering was promoted or boxes enabled in production.

## Readiness and next steps

Suitable now: a controlled opt-in desktop experiment that exposes a known English description library, alternatives, geometric similarity and per-view evidence. It is materially more informative than ImageNet on cooking/reflections, and the empty-room failure is visible instead of disguised as high confidence.

Before production integration: evaluate a larger independent corpus with local photographs, people, technology/transport, unseen scenes and hard negatives; test descriptions absent from the library; assess candidate bias and qualifier errors; measure physical mobile peak RAM/download/warm latency; validate smaller or separate encoders and prompt-embedding caching; and establish useful uncertainty behavior without an arbitrary universal threshold. Automatic scene assertions, cultural/geographic identity inference and generated captions are out of scope. The current evidence supports continued evaluation, **not automatic replacement of production AI Vision**.

## Files and verification

Added `src/scene/{candidates,coverage,ranking,clip-engine}.ts`, experimental `scene-results.tsx`, six-image fixture manifest/provenance assets, `tests/scene.test.ts`, `tests/browser/discovery.spec.ts`, this document and archived evidence. Updated experimental worker/types/workspace to add V2 while retaining baseline, legacy ten-prompt CLIP and isolated YOLOS. Existing Phase 4.1 browser failure test now explicitly selects detector because the experimental default is V2. No production AI/base-analysis/brand/loading files changed.

Run `npm run dev` and open `/experiments/vision`. `node scripts/prepare-vision-evaluation.mjs` verifies/restores existing pinned model assets if needed. Benchmarks write current output under `test-results/phase-4-2-benchmark.json`; the docs evidence is an archived run. Validation commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:browser -- --workers=2`.

**Passed:** 51 unit tests, 38 browser tests (approximately 3.6 minutes), lint, standalone TypeScript check and production build. The 18-run V2 benchmark and the existing Phase 4.1 real-inference benchmark both passed within that suite. Desktop and mobile screenshots were visually inspected. The data include real failure cases rather than accuracy assertions that force the model to agree with the expected scene.

No commit, push, remote initialization or deployment.
