# Phase 4.1 — capability evaluation

## Decision

**Do not replace production AI Vision yet.** Object detection supplies useful spatial evidence for common objects, but this detector still makes serious errors in the target outdoor cooking scene. CLIP's candidate matching is more relevant than ImageNet classification on that scene, but its large download and dependence on the supplied description list make it an optional research direction, not unrestricted understanding.

The working proof of concept is at **`/experiments/vision`**. It is unlinked from the homepage and does not change the approved UI or the production AI tab. Choose an image and a capability, then Run experiment. All computation uses a separate browser worker and local model files. Base Image DNA, statistics, maps, metadata privacy, loading orchestration and branding are untouched.

## Current classifier diagnosis

Audited `src/ai/vision.worker.ts`, `client.ts`, `engine.ts`, AI Vision presentation and the local config/preprocessor. Production MobileNetV4 uses verified fp32 weights, normalized RGB, a 224 × 224 central crop and standard stable softmax over 1,000 ImageNet labels. Its top-five scores are not fabricated. Loading/reuse/cancellation protections remain technically appropriate and optional AI does not delay base analysis.

The limitation is primarily task suitability, not a softmax arithmetic error:

- ImageNet classification selects an overall class. It cannot identify every object, place boxes or infer an activity such as cooking from a structured set of detections.
- The crop is a square with side `min(width,height) × 224/256`, losing edges and much of a landscape frame. In the comparable cooking photograph, important pots/fire near the bottom are partly outside the crop.
- The ImageNet vocabulary lacks an outdoor tagine-cooking scene description. It must still allocate all probability to its classes, even for out-of-distribution images.
- A low top score can warn about ambiguity; a high score does not prove correctness. No threshold converts this classifier into a scene-understanding system.

The experiment reproduces the current crop/normalization independently for comparison, while production code stays preserved. On the comparable outdoor cooking image, the baseline top label was **spiny lobster 7.3%**, then milk can 5.6%, fiddler crab 4.2%, rock crab 3.6% and apiary 3.3%. This supports the user's real-world diagnosis. The user's original photograph was not supplied; no claim is made that its exact binocular/tank/telescope result was reproduced.

## Candidate comparison and verified availability

All sizes below are actual pinned repository file metadata, not estimated benchmark results. Runtime/config/tokenizer costs are stated separately. Models marked untested were not assumed to work in browsers.

| Candidate | Capability | Selected artifact sizes | License source | Browser verification / assessment |
| --- | --- | --- | --- | --- |
| YOLOS-tiny, Xenova export | 80 COCO object categories + normalized boxes | q8 **9,661,148 bytes**; fp32 alternative **26,227,993** | Original hustvl model: Apache-2.0; export card has no independent declaration | **Real WASM tested** on all three images. Installed v4 registry supports YOLOS. Useful boxes, significant false positives and category limits. |
| DETR ResNet-50, Xenova export | COCO object detection | q8 **43,102,531 bytes**; fp32 **166,789,212** | Original facebook model: Apache-2.0; export card has no independent declaration | Installed registry supports DETR; ONNX files available. **Not executed here**. Larger weights and same limited vocabulary; not automatically a cooking-scene solution. |
| CLIP ViT-B/32, Xenova export | Image/text similarity for supplied descriptions | combined q8 **153,695,702 bytes**; fp32 **605,799,029** | Original OpenAI repository: MIT; export card has no independent declaration | **Real WASM tested** on all three images. Better scene matching in this small test; no boxes, no generated text, scores depend on candidate set. |
| Florence-2-base-ft, onnx-community | Generative captioning / other vision tasks | q8 vision **93,746,540**, encoder **43,651,493**, embeddings **39,390,433**, merged decoder **98,177,697**: **274,966,163 bytes** minimum selected graph set | Export model card declares MIT | Registry support and caption example verified; **not executed**. Tokenizer/config/runtime add more bytes; autoregressive decoding and memory need separate validation. |
| SmolVLM-256M-Instruct | Local image/text generation | q8 vision **94,247,969**, embeddings **28,385,824**, merged decoder **137,221,644**: **259,855,437 bytes** | Original model card declares Apache-2.0 | Artifacts available; installed registry supports the SmolVLM/Idefics family. **Not executed**; exact model/config/backend behavior remains unverified. Not appropriate to promise a mobile captioner from its name alone. |

Captioning was researched but not forced into the product. Even these small candidates require roughly 260–275 MB of selected q8 graphs, plus tokenizer/runtime and transient allocations. Smaller mixed q4/fp16 artifacts exist, but their numerical quality and backend support were not tested. This does not establish that captioning is impossible on a capable desktop; it establishes that there is insufficient evidence for acceptable broad desktop/mobile performance in this phase. CLIP supplies the requested feasible local image-understanding experiment without making caption-generation claims.

Primary sources: [YOLOS original](https://huggingface.co/hustvl/yolos-tiny), [YOLOS ONNX](https://huggingface.co/Xenova/yolos-tiny), [DETR original](https://huggingface.co/facebook/detr-resnet-50), [DETR ONNX](https://huggingface.co/Xenova/detr-resnet-50), [CLIP original model card](https://huggingface.co/openai/clip-vit-base-patch32), [CLIP MIT license](https://github.com/openai/CLIP/blob/main/LICENSE), [CLIP ONNX](https://huggingface.co/Xenova/clip-vit-base-patch32), [Florence ONNX and usage](https://huggingface.co/onnx-community/Florence-2-base-ft), [SmolVLM original/ONNX](https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct).

## Provenance, sizes and reproduction

- YOLOS export revision: `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`; q8 SHA-256 `82b5c1de8aaaffd763c67d67b09b742a1c53628acfee3077af3fa59233e86b6b`.
- CLIP export revision: `d15189d7028b43f1d3e65039190477f6af591c2a`; q8 SHA-256 `0898a3facfdb27f0a041e57649b4989cfd094e4a0040d6ae75ed69917dfc7328`.
- Both downloaded weight hashes were checked against the pinned Hugging Face LFS metadata. Config/tokenizer bytes and SHA-256 are recorded in `public/experiments/ai/manifest.json`.
- YOLOS assets including config/preprocessor: **9,665,750 bytes**. CLIP including tokenizer/config: **155,926,112 bytes**. Shared existing Asyncify WASM/module: **26,914,834 bytes**, plus lazy JavaScript.
- Cold detector path: about **36.6 MB** of model/runtime assets; cold CLIP path: about **182.8 MB**, plus JavaScript. When the runtime is reused the incremental downloads are smaller. Local initialization timing below is not an internet download benchmark.
- Included original licenses and attribution: `public/experiments/ai/NOTICE.txt`, Apache license and CLIP MIT license. Converter cards do not independently declare the derivative export licenses; preserve upstream notices and confirm provenance before public redistribution. CLIP's original card emphasizes research use and context-specific evaluation before deployment; MIT permission is not evidence of product readiness.

Research-only pinned but undownloaded repositories: DETR `8be7ab59ff663484ee9ba2e8d8f267330d5ad03e`; Florence `e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f`; SmolVLM `7e3e67edbbed1bf9888184d9df282b700a323964`.

Run `node scripts/prepare-vision-evaluation.mjs` to restore or verify experimental artifacts against the manifest. This is a development download script; the browser never contacts Hugging Face. No new packages were installed for Phase 4.1; it reuses Transformers.js 4.3.1 and its exact matching runtime.

## Preprocessing findings and corrections in the experiment

**YOLOS:** complete image, aspect preserved, shortest edge 512, maximum longest edge 1,333, white alpha composite; official rescale/normalization and padding. The installed generic v4 resize helper computes a second resize factor without clamping it to 1. With both edges configured it upscaled the tiger to 888 × 1,333 and cats to 999 × 1,333, despite shortest-edge 512. Actual initial inference took **14.69 s / 17.06 s** respectively. The isolated experiment now computes the intended shortest-edge/max-edge dimensions explicitly and disables processor resizing, preventing double resize. Final tensors were 512 × 768 for tiger and 512 × 682 for the other photographs. Canvas filtering/rounding is still an approximation of reference Pillow filtering. Production preprocessing was not changed.

**CLIP:** the complete image is fitted into a 224 × 224 white square so the cooking equipment is not silently cropped away. Its official processor performs CLIP normalization. Letterboxing is a deliberate evaluation variant and differs from the original central-crop training convention; broader comparisons are needed. The ten descriptions are fixed in `src/experiments/vision/types.ts`; no “Moroccan” or “tagine” identity is injected. They include cooking, indoor kitchen, indoor animals, wild animal outdoors, restaurant, pottery market, landscape and the user's example distractors. CLIP scores use standard softmax over these ten supplied descriptions, not over all possible scenes. Changing descriptions changes the scores; an unsuitable list can produce a confident wrong winner.

**Runtime discovery:** explicit model/processor loading avoids high-level local alias assumptions. AutoTokenizer's file discovery failed for the local `clip` alias (`tokenizer_class` unavailable). The experiment explicitly fetches the two pinned same-origin tokenizer JSON files and constructs CLIPTokenizer. A model's presence in a repository was therefore not treated as proof of runtime compatibility.

## Real inference observations

Chrome headless on Windows desktop, production Next build, **WASM one thread**, local server. Inferences ran sequentially, while another browser ran regression checks in the archived run below. Original source resolutions: tiger 612 × 408, cats 640 × 480, outdoor cooking 2,592 × 1,944. Images were visually inspected. The cooking fixture is an unmodified, attributed CC BY-SA 3.0 photograph of tagines/kettle over a wood fire by **محمد بوعلام عصامي**; fixture sources and license limitations are in `tests/fixtures/evaluation/README.md`.

Raw scores, boxes, tensor shapes and timings are saved in **`docs/evidence/phase-4-1-inference.json`**. Future test runs write their current evidence to `test-results/phase-4-1-inference.json`; the archived document is retained as a specific observation, not a performance guarantee.

| Image / model | Actual output (selected) | Inference ms | Preprocessing ms |
| --- | --- | ---: | ---: |
| Tiger / MobileNet | tiger **61.7%**, tiger cat 30.9% | 162 | 44 |
| Cats / MobileNet | tabby **81.1%**; no object count/boxes | 37 | 15 |
| Cooking / MobileNet | spiny lobster **7.3%**, milk can 5.6% | 31 | 22 |
| Tiger / YOLOS | **cat 85.3%**, one enclosing box; no tiger class | 4,122 | 76 |
| Cats / YOLOS | cats **99.2% / 59.2%**, remotes **99.8% / 98.0% / 78.2%**, bed **71.0%** | 2,804 | 79 |
| Cooking / YOLOS | bowls **73.3% / 64.7% / 54.6%**, false bicycles **77.8% / 61.2% / 55.7%** | 2,547 | 70 |
| Tiger / CLIP | wild animal outdoors **73.5%**, indoor animals 25.2% | 535 | 42 |
| Cats / CLIP | animals resting indoors on furniture **97.7%** | 553 | 13 |
| Cooking / CLIP | outdoor cooking with pots over a fire **67.6%**, landscape 12.8%, military vehicle 6.1% | 530 | 16 |

Archived cold initialization: baseline **2,775 ms**, YOLOS **615 ms**, CLIP **2,722 ms**. Later images reused the loaded model and reported about 0 ms initialization. Mode switches dispose the previous session, so large models are not intentionally kept together. An earlier isolated run observed detector inference **2,392–3,530 ms** and CLIP **431–503 ms**, illustrating normal timing variation with system load.

### Product value and failures

The cat scene demonstrates useful spatial results: separate cat boxes and localized remotes, with keyboard/pointer-label selection of overlays. It also demonstrates imperfect results: duplicate remote detection and “bed” for the couch. Raw YOLOS output is retained without NMS in this PoC; no inflated object counts are claimed. A production detector should evaluate class-aware deduplication with IoU before treating boxes as counts.

The cooking scene is a decisive failure case for automatic detector narratives. There are no bicycles in the inspected photograph, yet multiple scores exceed 50%. Raising a threshold alone does not establish reliable cultural/contextual recognition. COCO includes “bowl” but lacks tagine, kettle, fire, outdoor cooking and Moroccan identity labels. Do not turn these boxes into a cooking explanation or rename bowls as tagines.

CLIP correctly ranks the useful broad cooking description first in this test. That is materially better than lobster or optical equipment, but **67.6% is only relative preference among ten prompts**. It is not 67.6% probability that the scene is correct, does not prove Moroccan origin, does not count pots and cannot generate a free-form explanation. No caption was generated. This three-image, deliberately representative test is qualitative evidence, not an accuracy benchmark or a calibrated unknown-scene detector.

## Performance, memory and browser limits

YOLOS's roughly 2.4–4.1 s observed desktop WASM inference is potentially acceptable for an explicit optional operation; physical mobile speed has not been established. CLIP's roughly 0.43–0.55 s warmed inference is encouraging here, but its **156 MB** incremental download is a substantial obstacle to a lightweight product. A mobile viewport passing overflow checks is not a mobile inference benchmark.

In the archived run a 16 ms main-thread heartbeat observed maximum gaps of **27.2–52.6 ms** for baseline, **48.3–114.8 ms** for corrected YOLOS, **31.2–49.6 ms** for CLIP. These are sampled gaps across the entire run including browser work, not INP scores or guarantees. Computation is in a worker, but decoding, memory transfer and CPU contention can still affect responsiveness. The untuned large YOLOS inputs had observed gaps over 300–400 ms.

Peak total browser memory was not measured. Artifact sizes are not RAM requirements. Weight fetch copies, ONNX graphs, runtime linear memory and attention tensors can multiply the footprint. For scale, the final 512 × 768 detector RGBA canvas is about 1.6 MB and its float input about 4.7 MB, excluding model intermediates; CLIP's stored artifact alone is 154 MB before any overhead. YOLOS attention cost grows strongly with token count, which is why resizing changed timings so much. Captioners additionally retain autoregressive state. Do not claim these candidates fit low-memory phones based on download size.

Verified execution is current desktop Chrome + WASM SIMD/worker canvas. No WebGPU inference was tested for these **experimental** q8 models; production MobileNet's prior GPU validation cannot be transferred to them. WASM is deliberately the verified compatible execution path here. Safari/iOS, Firefox, physical Android, WebGPU q8 fallback, low-memory browser termination, wide-ranging offline-cache behavior and slow internet downloads remain untested. Caption candidates' WASM operator support is unverified, even though framework classes and ONNX files exist.

## Recommended architecture before any upgrade

1. Keep the native statistics/DNA engine independent and immediately usable. Maintain the current production implementation until a replacement clears a broader evaluation.
2. Separate **object proposals**, **candidate scene matching** and any future **generated captions** as distinct capabilities with typed provenance, model/version, preprocessing, backend and uncertainty descriptions.
3. For spatial proposals, use the full frame and normalized boxes; display source class names and model scores. Validate deduplication, threshold tradeoffs, missed objects and false positives on locally relevant photographs before using counts or automatic summaries.
4. Explore semantic matching as an opt-in, explicitly constrained tool. User-visible descriptions or a fixed evaluated taxonomy are preferable to hiding the candidate list. Text embeddings can be cached in memory for that fixed list; smaller compatible encoders could reduce download costs, but require their own accuracy/license/browser tests.
5. Require an independent local test corpus including cooking, pottery, textiles, people, nature, unfamiliar scenes and hard negatives. Include the user's actual failing photographs when available. Keep cultural/geographic identity outside automatic claims unless evidence supports it.
6. Assess physical desktop/mobile peak memory and real WebGPU/WASM behavior before selecting default backends. Lazy loading, one session at a time, idle release, explicit cancel/discard, generation-based stale-result rejection and base-feature fallback should remain standard.
7. Treat captions as an optional future high-resource feature. Test hallucination rate and factual usefulness with representative images before showing generated narrative. No closed-set matcher or COCO detector should be sold as a captioner.

## Isolation, privacy and deployment impact

No production homepage, tabs, colors, analysis engines or loading files were changed in Phase 4.1. New files live under `src/experiments/vision`, the new `/experiments/vision` page, `public/experiments/ai`, evaluation tests/fixtures, script and docs. All imagery is local object URLs/ImageBitmaps; no image bytes, metadata or GPS are sent. The worker fetches only same-origin model/tokenizer/runtime assets. Cache API persistence is disabled; ordinary HTTP asset caching remains browser-policy dependent. Images/predictions are not saved by the application. Only the automated development tests write fixture-derived benchmark JSON locally.

Replacement during active work terminates the research worker and invalidates its generation; input/output tensors and pixel buffers are disposed/cleared where practical. The Release model button frees the retained worker. No GPU-cancellation guarantee is made; this PoC intentionally uses WASM. Failures/timeouts do not affect the main product.

Experimental public assets add about **165.6 MB** to this checkout and would also enter a deployment if left in `public`. Do not silently ship them as production assets. Keep the experiment behind a development/research gate or remove experimental weights from public deployment output until adoption is approved; the restoration script makes that practical. Static-source size and bandwidth may exceed small hosting-plan budgets. No remote, commit, push or deployment was performed.

## Verification

Commands: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:browser -- --workers=2`. The two new browser tests execute nine real inferences, verify warm reuse, boxes and overlay interaction, desktop/mobile layout, same-origin GETs with empty request bodies, model download counts, failure recovery and preserved main-page access. Three unit tests cover size rules, box validation and the fixed candidate taxonomy. Existing Phase 2/3/4 tests remain in the regression run.

**Passed: 47 unit tests, 36 browser tests, lint, TypeScript and production build.** The full browser suite took approximately 3.3 minutes. The restoration script verified all nine experimental model/config/tokenizer assets against their manifest. No claim is made that these results validate physical mobile memory/performance, unexecuted captioners or untested experimental GPU paths.
