# Phase 4.3 — AI Vision production readiness

## Final decision

**Keep Scene Discovery experimental. Launch the reliable local pixel-analysis features separately; do not promote CLIP to production AI Vision in this release.** The evaluation is complete, not a proposal to continue researching indefinitely. Useful closed-set matches do not compensate for the absence of reliable unsupported-scene handling. A smaller artifact would not fix this semantic problem. Production MobileNetV4, the approved interface, analytical algorithms and brand tokens remain unchanged by this phase; retaining its implementation during evaluation is not an endorsement of ImageNet classification as scene understanding.

The audited library is available only at `/experiments/vision` → **CLIP · audited readiness library**. The original 36-description mode remains available to reproduce previous evidence. Neither mode downloads CLIP until **Run experiment** is explicitly pressed.

## Acceptance criteria fixed before inference

The versioned photograph manifest records the gates before any new benchmark prediction:

- On covered held-out photographs, at least 80% relevant top matches and 90% relevance within the best match plus the **three actually displayed alternatives** (leading four). Leading-five coverage is also recorded, but cannot be substituted for the user-visible alternatives to pass the gate.
- Unsupported principal scenes must receive explicit abstention/scope handling rather than a selected scene presented as established fact. All unsupported photographs must pass this small challenge set. This is a product behavior gate, not a proposed universal cosine threshold.
- Plain closed-set disclosure; no caption, probability, identity, object-count or unrestricted-understanding claims.
- Large download disclosed before an explicit action, browser-only pixel processing, functioning base analysis after AI failure, cancellation/replacement protection and graceful resource errors.
- Performance evidence must distinguish local-network downloads from internet experience and desktop browser tests from physical mobile tests. Untested device families cannot be advertised as validated.

These are provisional product acceptance criteria, not statistically calibrated accuracy guarantees. A 24-photo challenge cannot establish population accuracy, fairness or universal score cutoffs. There is deliberately no arbitrary “confidence percentage” conversion.

## Reproducible dataset and judgments

`tests/fixtures/readiness/benchmark.json` contains 24 new JPEG photographs, fixed SHA-256 hashes, source URLs, license/author metadata where available, audit/held-out assignments, observations and accepted IDs **separate from model similarities**. None are the six Phase 4.2 photographs.

Selection is independent of model outputs: the first 16 published rows of [detection-datasets/coco](https://huggingface.co/datasets/detection-datasets/coco), without rejecting unfavorable photographs, plus eight fixed Commons photographs covering missing indoor, food, landscape, Moroccan objects/craft and abstract/macro subjects. Alternating source order assigns 12 audit and 12 held-out photographs. Both candidate versions and both sets of relevance labels were fixed before inference. No descriptions were tuned between the audit and held-out runs.

The source photograph selection and visual judgments were performed by one evaluator. “Independent selection” here means independent of model scores and the previous six examples, **not an independent panel of human raters**. The first COCO rows are a convenience sample with many animals/vehicles; the supplementary photographs are coverage checks. Pretraining overlap is unknown. Held-out means held out from prompt development, not proven absent from CLIP training. Treat the reported counts as a reproducible qualitative relevance audit, not a representative population accuracy estimate.

Judgments target the main subject/scene and the actual description wording. A visible secondary vase, road or building does not make a flower arrangement, clock or airplane adequately described. An empty accepted-ID list means the principal scene lacks an adequate candidate; it does not mean that every word in every candidate is absent. Judgments can be disputed and independently reviewed without changing raw model scores.

The Commons images were visually inspected. Forest, kitchen, pottery craft, metal teapots, soap bubbles, macro flower, served tajine and coastline are included. Tajine and coast use 960-pixel Commons thumbnails after original-download rate limiting; other Commons files and COCO files retain their acquired bytes. This is a scene-matching benchmark, not a native-resolution localization test. The manifest and README record that distinction. Commons attribution/license details are retained; COCO image-specific Flickr licenses remain unresolved and those fixtures are development-only, outside `public/`, not approved product assets for redistribution.

## Responsible library audit

Original `ouahad-scenes-36-v1` is preserved. Audited `ouahad-scenes-36-v2-audit` retains the same 36 IDs and six equal-size themes. Eight descriptions change, before looking at new predictions:

| ID | Original | Audited |
| --- | --- | --- |
| living-room | a furnished living room | a living room or sitting area |
| bedroom | a bedroom with a bed | a bedroom interior |
| drinks | cups or glasses containing drinks | cups, glasses or drinking vessels |
| wildlife | a wild animal outdoors | wild animals |
| pets | pets resting indoors on furniture | domestic pets |
| street-people | people walking along a street | people in a public outdoor space |
| tools | tools used for building or repairs | tools or workshop equipment |
| music | musical instruments or a musical performance | musical instruments |

This removes the reported furnished-room implication, visible contents, furniture/location assumptions and some asserted actions. It does **not** prove an empty room is a living room, or remove every potentially unsupported activity qualifier. Broadening wording changes semantic scores and accepted coverage; therefore the original and audited denominators are reported separately. In particular, the outdoor dog becomes in-scope under “domestic pets.”

Remaining gaps include portraits, flowers, clocks, aircraft, generic kitchens without visible food preparation, craft processes and abstract patterns. Themes overlap: nature/animals, dining/vessels, architecture/indoor spaces and optics/reflections. Equal counts do not eliminate English-language taxonomy bias, CLIP training bias, or different candidate specificity. No synonym voting or country/cultural-identity inference is used. Three Moroccan subjects do not establish cultural competence.

No library expansion was justified merely to make this test pass. Removing unsupported qualifiers is retained as a limited experimental correction; adding a collection of image-specific prompts after seeing errors would invalidate the held-out comparison. The entire original and audited libraries are copied into archived evidence.

## Model, preprocessing and exact scoring

Same pinned `Xenova/clip-vit-base-patch32` combined q8 graph, revision `d15189d7028b43f1d3e65039190477f6af591c2a`; Transformers.js 4.3.1 and its matching local ONNX Runtime Asyncify assets. Graph SHA-256: `0898a3facfdb27f0a041e57649b4989cfd094e4a0040d6ae75ed69917dfc7328`. Every new inference explicitly uses **WASM CPU, one thread**, without relying on GPU availability.

The complete oriented bitmap is fitted, with preserved aspect ratio, into a 224 × 224 white square; alpha is composited on white. The official processor supplies CLIP channel normalization. Letterboxing differs from standard central-crop CLIP preprocessing, and can reduce effective subject resolution in wide/tall scenes. The stable whole-image policy from Phase 4.2 is retained. Previous multi-crop tests did not improve the primary match; four-view processing multiplies work and is diagnostic, not an abstention mechanism.

Each prompt is exactly `This is a photo of {description}`. Ranking uses `dot(image,text)/(L2(image)*L2(text))`, descending cosine, ID tie-break. Cosines are not softmax percentages, probabilities, accuracy or calibrated confidence. Technical display uses three decimals without assigning universal match-strength categories. Themes list the categories of leading candidates; they do not independently verify scene content. Tokenization is cached per version; changing libraries releases old prompt tensors while reusing model weights. The combined graph still recomputes text embeddings during each inference.

## Actual quality and performance evidence

**48 real whole-image CPU inferences completed: 24 photographs × two libraries.** Raw evidence is archived in `docs/evidence/phase-4-3-benchmark.json`; relevance judgments remain separate from cosine scores. Automated inference/shape/privacy checks passing does not mean semantic acceptance passing.

| Library / subset | Covered photos | Relevant top match | Relevant in displayed leading four | Unsupported photos / explicit abstentions |
| --- | ---: | ---: | ---: | ---: |
| Original / all | 15 | 12/15 (80%) | 15/15 (100%) | 9 / 0 |
| Original / audit | 6 | 4/6 (67%) | 6/6 (100%) | 6 / 0 |
| Original / held-out | 9 | 8/9 (89%) | 9/9 (100%) | 3 / 0 |
| Audited / all | 16 | 10/16 (63%) | 14/16 (88%) | 8 / 0 |
| Audited / audit | 7 | 4/7 (57%) | 6/7 (86%) | 5 / 0 |
| Audited / held-out | 9 | 6/9 (67%) | 8/9 (89%) | 3 / 0 |

Leading-five coverage was identical to leading-four coverage in this run, so showing one more alternative would not repair the two audited retrieval misses. The audited library fails both held-out relevance gates (6/9 versus ≥80%; 8/9 versus ≥90%). The original passes those two small covered-image gates, but **both versions fail unsupported-scene abstention**. Every photograph receives five ranked matches. Static warnings honestly disclose closed-set limits; they do not identify which photographs lack an adequate candidate. No score threshold was invented to disguise that failure.

The wording correction is not an extraction-quality upgrade: on the 15 photographs covered by both versions, audited top relevance is 10/15 versus original 12/15. Keep both versions isolated for inspection rather than switching production or declaring the audited prompts better. The dog becomes covered under broader wording but its relevant description is rank 9. The shoe-rack cat's audited pet description falls to rank 14. The specificity of descriptive context can help retrieval even when that wording risks asserting unsupported details; removing it exposes the task tradeoff rather than solving it.

### Per-photograph results

Top IDs below are library candidates, not generated captions. `yes` means relevant top match; `alt` means relevant within the displayed leading four but not top; `miss` means a covered scene is missing from those alternatives; `scope` means no adequate description was pre-annotated for the principal subject. Cosines are rounded to three decimals for inspection, not converted into probabilities.

| Photograph / split | Observed principal scene | Original top / cosine / judgment | Audited top / cosine / judgment |
| --- | --- | --- | --- |
| coco-9 / audit | served food in containers | food-preparation / .270 / alt | food-preparation / .272 / alt |
| coco-25 / held-out | giraffes among trees | wildlife / .240 / yes | wildlife / .241 / yes |
| coco-30 / audit | flower arrangement and vase | pottery / .243 / scope | pottery / .244 / scope |
| coco-34 / held-out | zebra grazing | wildlife / .263 / yes | wildlife / .260 / yes |
| coco-36 / audit | parasol portrait | harbor / .212 / scope | street-people / .213 / scope |
| coco-42 / held-out | cat on shoe rack | bedroom / .245 / alt | bedroom / .236 / miss |
| coco-49 / audit | frisbee activity | sport / .235 / yes | sport / .231 / yes |
| coco-61 / held-out | elephants/people in wooded setting | forest / .254 / yes | forest / .255 / yes |
| coco-64 / audit | public clock with street behind | street-people / .269 / scope | road-vehicles / .262 / scope |
| coco-71 / held-out | train and railway | railway / .270 / yes | railway / .271 / yes |
| coco-72 / audit | giraffes among trees | wildlife / .261 / yes | wildlife / .270 / yes |
| coco-73 / held-out | parked motorcycles | road-vehicles / .234 / yes | tools / .238 / alt |
| coco-74 / audit | dog lying in street | pets / .249 / scope (indoors qualifier) | street-people / .235 / miss |
| coco-77 / held-out | skateboarding | sport / .234 / yes | street-people / .242 / alt |
| coco-78 / audit | ornamental clock and vase | pottery / .249 / scope | pottery / .249 / scope |
| coco-81 / held-out | airplane in flight | optics / .244 / scope | optics / .244 / scope |
| forest / audit | sunlit trees/undergrowth | forest / .282 / yes | forest / .281 / yes |
| kitchen / held-out | kitchen without visible preparation | food-preparation / .261 / scope | food-preparation / .266 / scope |
| potter / audit | Moroccan potter amid clay pots | pottery / .286 / yes | pottery / .285 / yes |
| teapots / held-out | Moroccan teapots on display | pottery / .277 / yes | pottery / .277 / yes |
| bubbles / audit | soap-bubble pattern | reflections / .245 / scope | reflections / .241 / scope |
| flower / held-out | macro flower | gardening / .236 / scope | gardening / .233 / scope |
| tajine / audit | cooked tajine meal | food-preparation / .265 / alt | food-preparation / .263 / alt |
| coast / held-out | beach/coastline | coast / .262 / yes | coast / .261 / yes |

### Failure categories and decision

- **Library gaps / forced matches:** eight audited out-of-scope principal subjects all return a description. Some are partial secondary-object matches (vase → pottery, clock background → road vehicles); others are unsupported activity or object associations (flower → gardening, aircraft → optics). A partial association is not a complete scene description.
- **Activity overreach:** two covered served-food photographs rank kitchen preparation first; the correct meal alternative is retained. The kitchen-only unsupported example also ranks preparation first despite no visible preparation. CLIP associates context but does not verify actions.
- **Context/object competition:** pets lose to bedroom/street context, motorcycles to tools, and skateboarding to people outdoors. Four of the six audited covered top errors are in this category. Two remain outside the leading five entirely.
- **Specificity tradeoff:** honest broadening removes false qualifiers but can reduce retrieval specificity. This is measured regression, not an invitation to tune the held-out prompts until they pass.

Audited unsupported top cosine values span **.213–.266**, while covered photographs span **.231–.285**. Their overlap rules out separating scope with an evident simple cutoff from this sample. For example, an unsupported kitchen scores .266 while a relevant sport match scores .231. Even this overlap analysis is not score calibration. Crop agreement and a top-two gap cannot establish scope or correctness.

### Measured desktop performance

Environment: Windows NT 10.0.26200, Intel64 family 6/model 165, 12 logical processors; Chrome 154 headless, `crossOriginIsolated=false`. Next production server on localhost, Playwright suite with **two workers**; other tests ran concurrently for part of the benchmark. This measures the working browser pipeline under that workload, not an isolated hardware speed limit. The original/audited timing difference is confounded by scheduling and is not evidence of an optimization.

| Measurement | Observed value |
| --- | --- |
| First cold click to result | **21.15 s** |
| First model/runtime/download initialization | **15.45 s** |
| Cold q8 graph localhost resource transfer duration | **3.73 s**, 153,696,002 Resource Timing transfer bytes |
| Cold WASM localhost resource transfer duration | **2.28 s**, 6,690,648 transfer bytes / 26,861,777 decoded bytes |
| Cold tokenizer resource transfer duration | **0.32 s**, 571,926 transfer bytes / 2,224,119 decoded bytes |
| Model/config/tokenizer/runtime resource transfer total | **160,981,494 bytes (~161.0 MB)** including Resource Timing overhead; decoded total **182,840,474 bytes (~182.8 MB)** |
| Original whole-view inference | **1.55–4.75 s**, median **2.84 s** across 24 runs |
| Audited whole-view inference | **1.36–4.45 s**, median **2.29 s** across 24 runs |
| All warm click-to-result measurements | **1.92–5.18 s**, median **3.05 s** across 47 runs |
| Pixel preprocessing | **9–116 ms** |
| Main-thread 20 ms timer responsiveness | worst observed gap **313 ms**; largest per-run 95th-percentile gap **33 ms** |
| Three worker V8 used-heap snapshots | **15.1–18.0 MB**, backing storage **29.8–32.0 MB** |

All 47 subsequent runs reuse the loaded model, including the library switch. Prompt token caches change; weights are downloaded only once. Resource durations can overlap and must not be summed into initialization time. Transfer values reflect actual compression on this local server; decoded sizes reflect the files processed. Application JavaScript is outside that resource total. Browsers report transfer-size overhead differently; these are observed values, not a permanent CDN budget.

The main-thread timer continues during worker inference, supporting desktop responsiveness, but a 313 ms gap is still perceptible and a timer is not an INP/Lighthouse or interaction-latency measurement. Warm inference completed without tab crashes here. V8 snapshots exclude substantial native/WASM allocations, omit peak loading pressure and must not be added up as total browser RAM. They cannot support a claim that the model requires only tens of megabytes.

**Validation:** 53/53 unit tests and 39/39 browser tests passed; full browser suite **5.9 minutes**. Lint, strict TypeScript and production build passed. Tests include known deterministic pixel statistics/maps, staged loading accuracy, invalid files, URL cleanup, desktop/mobile layouts, actual MobileNet and experimental CLIP/YOLOS inference, downloads, CPU compatibility, reuse, cancellation and failure isolation. Semantic gates above still fail: test harness success is not production model-quality approval.

## Download assessment and alternatives

The compatible combined q8 graph is **153,695,702 bytes**. Config/tokenizer assets bring CLIP to about **155.9 MB decimal**; the shared Asyncify runtime adds **26,914,834 bytes**, or about **182.8 MB before application JavaScript** on a first use without cached runtime. A downloaded file size is neither total browser RAM nor a measured internet transfer duration.

For illustration only, transferring 182.8 MB at a sustained 10 Mbit/s has a calculated ideal floor of about 146 seconds; at 50 Mbit/s about 29 seconds, before latency, overhead, initialization and inference. These are arithmetic bandwidth scenarios, **not tested internet benchmarks**. Localhost timings cannot validate first-use experience on a mobile connection.

Pinned [upstream artifact metadata](https://huggingface.co/api/models/Xenova/clip-vit-base-patch32/tree/d15189d7028b43f1d3e65039190477f6af591c2a/onnx) was retrieved and saved in `docs/evidence/phase-4-3-artifacts.json`:

| Artifact | Graph bytes | Verified compatibility / decision |
| --- | ---: | --- |
| combined q8 | 153,695,702 | Real browser CPU inference on both libraries; current compatible artifact |
| combined uint8 | 152,738,540 | Availability/size verified, not executed; less than 1 MB reduction does not materially change download cost |
| combined q4 | 189,403,477 | Larger than q8; not a download improvement; not executed |
| combined q4f16 | 125,818,295 | Smaller, but mixed fp16/WASM behavior and numerical quality unverified; not recommended as a compatible replacement |
| separate q8 vision + text | 89,117,001 + 64,504,507 | Similar total size; not an automatic saving if both still downloaded |
| vision-only q8 with precomputed library text embeddings | 89,117,001 plus embeddings/config/runtime | Possible architecture, **not executed or licensed as a newly derived embedding artifact here**; not a production recommendation |

No alternative is promoted simply because its file exists. [Transformers.js dtype documentation](https://huggingface.co/docs/transformers.js/guides/dtypes) explicitly makes available variants model-dependent; a dtype option does not verify the exported graph on this runtime. Original [OpenAI CLIP source license](https://github.com/openai/CLIP/blob/main/LICENSE) is MIT and existing notices are retained. The Xenova export card does not independently declare a derivative license; provenance review remains necessary before shipping those exports. No new model weights or packages were installed in this phase. Download optimization is not the chosen release path because it cannot solve unsupported-scene handling.

## Privacy and failure review

The complete benchmark records network requests and asserts same-origin GETs with no request bodies. Selecting any of the 24 images does not request CLIP assets; only the explicit action does. All 48 comparisons reuse a single downloaded graph. Remote model loading and browser model-cache persistence are disabled in the experiment. Pixel contents, filenames, EXIF and embeddings are not submitted to remote APIs or analytics. No image localStorage/database persistence was introduced.

Image validation/signature checks, file-size/decoded-pixel limits and browser decoding remain shared with the existing tool. Temporary object URLs are revoked on replacement/unmount; bitmaps close and temporary pixel arrays/tensors are cleared/disposed in `finally`. Active replacement terminates the experiment worker and supersedes callbacks; release discards the model, and a three-minute watchdog handles a stuck experiment. Browser/WASM allocations may remain until worker termination or garbage collection; this is not a secure-erasure or bounded-peak-memory guarantee.

Existing automated failure tests abort downloads, simulate unavailable capabilities and replace images during pending work. They verify recoverable errors, no stale results, available base Image DNA/statistics and separate pixel/AI outputs. Real out-of-memory/device-pressure failures and tab suspension are not simulated exhaustively. A graceful error cannot guarantee that every device can allocate the model.

## Supported and untested environments

Verified: Windows desktop, installed Chrome, production Next build, same-origin HTTP localhost, single-thread WASM and worker/canvas support. Main-thread interval timing is measured during actual work. Existing viewport tests cover desktop/tablet/mobile widths, including 360–430 px. Viewport emulation proves layout behavior, not physical mobile inference speed, RAM limits, battery use or thermal behavior.

Untested: physical Android/iOS devices, Safari, Firefox, CLIP WebGPU, throttled real internet/CDN delivery, low-memory phones, background tab/resume behavior and peak total process memory. Browser V8 heap/backing-store snapshots exclude important native/WASM allocations and cannot establish minimum RAM. OS-wide memory queries were unavailable in this sandbox; no total-memory requirement is invented. Host/browser details and unavailable indicators are saved with evidence.

## Release decision and exact next actions

**No production integration is approved by this evidence.** Do not add the proposed “Discover the scene” action to production in this release, and do not automatically download CLIP on image selection. Keep `/experiments/vision` as an explicitly experimental, unlinked workspace. Preserve existing production code for review; do not interpret that preservation as an approval to market MobileNet as general scene understanding.

For the non-AI release, the concrete recommendation is to ship Image DNA, properties, native sampled colors, light/detail maps and metadata privacy as the reliable product. Exclude experimental routes/large CLIP and YOLOS assets from that release package, and make a separate explicit release decision about the existing MobileNet tab rather than silently substituting a model. No packaging removal, deployment, commit or production-tab change was performed during this evaluation.

There is no indefinite optimization workstream scheduled. If integration is separately authorized in the future, the implementation contract is: (1) optional explicit “Discover the scene”; (2) disclose full first-use asset budget before consent; (3) no download on image selection/tab opening; (4) dedicated reusable worker with cancellation, timeout, retry and release; (5) label results as predefined-library matches with visible alternatives; (6) independently validate out-of-scope behavior instead of inventing a cosine threshold; (7) test target browsers/physical devices and internet loading before enabling them; (8) keep base analytical results available under every AI failure. These are prerequisites, not an approved implementation plan or a promise that a smaller model will pass.

## Reproduction and files

With existing pinned assets/fixtures, run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, then `npm run test:browser -- --workers=2`. To run only this benchmark: `npx playwright test tests/browser/readiness.spec.ts --workers=1` after building. Timings vary with concurrency/hardware; score/ranking judgments remain reproducible. The browser test writes `test-results/phase-4-3-benchmark.json`; copy it to the evidence directory after the complete run because Playwright clears its output directory on a subsequent run. Run `node scripts/summarize-readiness-benchmark.mjs` for mechanically derived counts and gate results from the archived file, or pass a fresh benchmark JSON path as its first argument. The archived `phase-4-3-summary.json` contains those counts separately from raw inference.

Changed: `src/scene/clip-engine.ts`, `ranking.ts`; experimental `types.ts`, `evaluation.worker.ts`, `workspace.tsx`, `scene-results.tsx`. Created: `src/scene/audited-candidates.ts`; `tests/readiness.test.ts`; `tests/browser/readiness.spec.ts`; `tests/fixtures/readiness/` (24 JPEGs, manifest, README); `scripts/prepare-readiness-benchmark.mjs`, `scripts/summarize-readiness-benchmark.mjs`; this report and `docs/evidence/phase-4-3-*` evidence. No packages installed, brand assets changed, production algorithms replaced, commits, pushes or deployment.
