# Hidden Data — Phase 03 model evaluation

**Final exit review, 2026-10-22: Phase 03 COMPLETED; Final Readiness Audit CONDITIONAL; Phase 04 READY as an engineering exit gate only; public deployment NOT YET AUTHORIZED.** AI grounding remains EXPERIMENTAL. Emergency stop is ON, all models are OFF, the owner session and temporary invitation are revoked, and previous debits are preserved. See **FINAL READINESS AUDIT — EXIT REVIEW** at the end. Every older status block below is historical.

**Latest timeout-fix verification, 2026-10-22:** Engineering **PASS**, Cost Safety **PASS** for the current owner-confirmed free configuration, Production Readiness **READY for the restricted pilot**, Phase 04 readiness **YES** as an exit gate only. One new real admitted request succeeded with validated observations visible and D1 accounting verified; the earlier uncertain debit remains. Stop restored, all models disabled, public release closed. **Gemini Timeout Alignment — Final Verification** supersedes earlier status/deadline statements; no deployment or Phase 04 work occurred.


**Current, 2026-10-22:** Cloud Vision replaces the local-model product strategy. Engineering Integration **BLOCKED** on cost verification and shared abuse-control access; AI Grounding **EXPERIMENTAL**; Phase 04 Readiness **NO**. The final Cloud Vision section supersedes earlier “latest” statements; all previous evaluations below remain historical.

Latest decision: **Qwen Local Companion — BLOCKED on grounding quality.** See the final section titled **Qwen Local Companion — Implementation and Verification**. The exact reference GGUF/native runtime was reused and genuinely processed images. Previous candidate evaluations below remain historical.

**PHASE 03: BLOCKED. No model selected or promoted.** The calibrated CLIP acceptance policy covers only **1/7 supported independent test photographs (14.3%)**, below the frozen 50% product minimum. MobileNet has the wrong task/taxonomy for scene understanding, and the detector has no demonstrated localization need or validated detection quality. Executing these graphs successfully is not a production qualification.

The second and final focused attempt also ended **BLOCKED**, at candidate eligibility, before a new dataset or inference run. See **Second Attempt — Focused Evaluation** below. Earlier scores and recommendations are retained as first-attempt history, not new independent evidence or authorization for another search.

## Task and baseline audit

Useful questions: “Which supported description fits this image?” and “Is there sufficient support to show it?” This would add semantic information unavailable from Color, Light, Metadata and Image DNA. It does not answer identity, location, authorship, authenticity, mood, provenance or photographic quality. A supplied description is a model prediction, not a generated caption.

Reviewed the Phase 01 audit/handoff/verification, Phase 02 design/implementation/handoff/verification, `src/ai`, `src/scene`, `src/experiments/vision`, research manifests, notices, runtime versions, research routes/build selector and release scanner. Earlier work already rejected promotion: the audited 36-description CLIP library had 6/9 top-one and 8/9 top-four relevance on its old covered held-out examples, and forced matches on all three unsupported examples. Unsupported and supported cosine ranges overlapped. YOLOS previously hallucinated bicycles on outdoor cooking equipment; ImageNet predicted crustaceans for cooking. Old fixtures included COCO photographs with unresolved image-specific licenses. Those scores inform selection only and are not pooled with this new benchmark.

## Candidate inventory

All weights were already present; no new model was downloaded. `evidence/asset-audit.json` freshly verifies all **14** model/config/tokenizer/runtime files against saved SHA-256 and sizes, plus both runtime copies against the installed dependency and all 20 corpus files. Sizes below are decimal bytes, not MiB.

| Candidate | Exact converted revision | Graph bytes | All model/support bytes | Task / decision |
| --- | --- | ---: | ---: | --- |
| `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k` | `3ba07f12712fa58fd6b3d661f9909c9e332c5005` | 15,086,122 fp32 | 15,156,458 | MobileNetV4 Conv Small, ImageNet-1k. Fast object/content labels; not a scene taxonomy. Rejected for primary task. |
| `Xenova/clip-vit-base-patch32` | `d15189d7028b43f1d3e65039190477f6af591c2a` | 153,695,702 q8 | 155,926,112 | ViT-B/32 image/text contrastive model. Frozen 36-description ranking. Closest task fit; fails acceptance coverage. |
| `Xenova/yolos-tiny` | `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d` | 9,661,148 q8 | 9,665,750 | Transformer COCO object detection. Two diagnostic inferences only; rejected as unjustified primary capability. |

Shared Asyncify runtime: **26,914,834 bytes** (26,861,777 WASM +53,057 MJS), plus bundled application/Transformers JavaScript. Installed and tested: Transformers.js **4.3.1**, ONNX Runtime Web **1.31.0-dev.20260914-8d85527a0**, Next **16.4.0**. Graph/support inventory and individual tokenizer/config sizes are recorded in the audit. CLIP uses its pinned tokenizer JSON/config, processor/config and combined graph; MobileNet and YOLOS need processor/config and graph without a tokenizer. Optional special-token metadata is inventoried even though this browser path does not request it.

Source model provenance is distinct from conversion provenance. [timm's original MobileNet card](https://huggingface.co/timm/mobilenetv4_conv_small.e2400_r224_in1k) declares Apache-2.0; [HUST's original YOLOS card](https://huggingface.co/hustvl/yolos-tiny) also declares Apache-2.0. The [OpenAI CLIP repository license](https://github.com/openai/CLIP/blob/main/LICENSE) is MIT, and its [model card](https://huggingface.co/openai/clip-vit-base-patch32) requires task-specific evaluation and warns against unevaluated deployment. Retained local notices/licenses document those upstream declarations. Apache attribution/license/notice obligations and MIT copyright/license retention must be preserved for distribution. Each converted repository lacks a separate export-license declaration in its inspected card; this audit does not certify converted-weight redistribution clearance. Transformers is Apache-2.0; ONNX Runtime is MIT. Nothing was redistributed to production.

Converted repositories inspected: [MobileNet](https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k), [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32), [YOLOS](https://huggingface.co/Xenova/yolos-tiny). Browser compatibility is established for these exact local exports on Chrome/WASM only. A shared architecture name does not validate a different graph, precision, revision or processor. WebGPU exposure alone proves neither adapter nor graph execution; no GPU result is claimed.

## Corpus and frozen protocol

`tests/fixtures/phase03/benchmark.json` contains **16 natural Commons originals**, eight calibration and eight final test, and **four derived test challenges**. Historical licensed development examples were used only to understand prior failure modes; none enters independent metrics. Fixed queries in fixed order select the first distinct JPEG with an explicit CC BY, CC BY-SA or public-domain declaration. No model output influenced selection. Commons HTTP429 interrupted collection after ten images; the script resumed the same list without replacement. Saved source responses, titles, author HTML, license URLs, file bytes and SHA-256 accompany every photograph. Source declarations are evidence, not independent legal clearance. Attribution and share-alike notices for derived images are in the fixture README.

Ground truth was visually inspected in `evidence/corpus-contact.png` before fresh inference. Scene relevance is set-valued against the unchanged `ouahad-scenes-36-v2-audit` descriptions. Primary IDs are merely descriptive confusion rows: the tram street also legitimately accepts road vehicles, pedestrians and architecture. Unsupported principal subjects include a face close-up, flower, aircraft and soap bubble. Clock tower architecture is supported. ImageNet accepted IDs are separate visible-content/object-family judgments, never scene truth. These are single-annotator judgments, not breed/species certification or an exhaustive annotation of every background object.

Coverage includes urban/indoor/nature/animal/people/object compositions, historical monochrome interiors, close-ups and ambiguous mixtures. Test-only brightness×.22, contrast×.25+96, sigma12 blur, and central70% crop plus occlusion exercise low-light/low-contrast/degraded subjects. Related transformations stay with their parent and do not increase the independent sample count. They are stability checks with parent labels, not separately adjudicated quality examples.

The sample is small and selected by search convenience, not deployment prevalence. Only one independent unsupported test original exists. No guarantee is made that models did not see these images during pretraining. “Independent test” means excluded from this project's prompt selection and threshold fitting. No class is certified for production from one example.

Frozen product gates in `PROTOCOL.md`: covered top-one >=80%; covered top-four >=90%; accepted precision >=90%; covered coverage >=50%; zero unsupported acceptances. Calibration searches top cosine and top-minus-second margin using calibration originals only, maximizing correct acceptances subject to precision/OOD constraints, with deterministic conservative tie-breaking. A reject-all policy fails coverage. There was no test-based prompt/threshold revision.

## Fresh quality results

Full rankings and raw tensors' parsed outputs are retained in `evidence/browser-inference.json`; judgments, confusion counts and calibration decisions are in `evidence/quality.json`. Scores are cosine similarities for CLIP and softmax over all 1,000 logits for MobileNet; neither is a calibrated correctness probability.

| CLIP metric | Calibration originals | Independent test originals |
| --- | ---: | ---: |
| Covered / unsupported | 5 / 3 | 7 / 1 |
| Raw top-one relevant, covered only | 3/5 (60%) | 6/7 (85.7%) |
| Raw top-four relevant, covered only | 5/5 (100%) | 7/7 (100%) |
| Raw unsupported forced matches | 3/3 | 1/1 |
| Accepted correct / accepted | 2/2 | 1/1 |
| Covered images accepted | 2/5 (40%) | **1/7 (14.3%): FAIL** |
| Unsupported images accepted | 0/3 | 0/1 |

Frozen calibrated thresholds: cosine >=**0.26428556788883745** and margin >=**0.0325981373188419**. These are benchmark-specific parameters, not universal confidence thresholds. Only the mountain-lake test original passes both. Seven test originals abstain. Perfect observed accepted precision from one acceptance provides little evidence; it cannot compensate for failed coverage. Even calibration coverage is below minimum.

Explicit errors: furnished sitting room → bedroom; domestic cat → wildlife; face → sport; aircraft → optics; soap bubble → reflections; teapots → drinking vessels; flower → gardening. Top-four alternatives can contain a relevant description while the leading prediction remains wrong. All four transformations retain the parent top-one ID, but the dimmed mountain switches from acceptance to abstention. Stable rankings do not prove correctness.

MobileNet visible-content top-one relevance is **7/12 (58.3%)** across covered originals and **5/7 (71.4%)** on covered test originals; top-four is 11/12 and 6/7 respectively. These are set-valued content relevance rates for this annotated subset, not ImageNet benchmark accuracy or scene accuracy. Its central crop predicts cowboy hat for the elephant/person image and football helmet for the teapot display; a human face yields proboscis monkey and the bubble yields spiny lobster. No valid scene acceptance policy is supplied by this classifier. Its legacy `.5` softmax uncertainty threshold is not used as validated confidence.

YOLOS finds a person but also a dog over the elephant, with no elephant detection; the teapot-shop image yields overlapping vase/bottle detections. No ground-truth boxes, IoU/mAP or counting validation exists, so none is reported. Two runs diagnose suitability, not detection accuracy. Localization adds complexity without solving the supported-description task.

Exclusive-class accuracy, macro F1 and ordinary per-class precision/recall would misrepresent these relevance sets, overlapping accepted descriptions and near-singleton classes. Machine-readable primary-to-predicted confusion counts and explicit relevance denominators are provided instead. Calibration error/reliability diagrams are unjustified by this small sample and cosine outputs.

## Decision matrix

| Criterion | MobileNet | CLIP | YOLOS |
| --- | --- | --- | --- |
| User value for requested task | Narrow objects; scene mismatch | Direct supplied-description fit | Boxes not justified |
| Quality | Visible-content errors; no scene labels | Coverage gate fails after calibration | Misses elephant; overlapping boxes; no detection benchmark |
| Graph size / maintainability | Smallest classifier; existing processor | Largest; prompt library and combined text/image graph | Compact graph; more geometry/postprocessing |
| Actual inference median | 45.5ms | 1,824.8ms | 2,387.6ms, only2 runs |
| Browser support | Exact export WASM works | Exact export WASM works | Exact export WASM works |
| Memory / GPU / mobile | Native peak and GPU unverified | Large graph, native peak and GPU unverified | Native peak and GPU unverified |
| Licensing | Upstream Apache; conversion clearance incomplete | Upstream MIT repository; conversion clearance incomplete | Upstream Apache; conversion clearance incomplete |
| Failure handling | Research manual retry/cancel tested | Worker reuse/release tested | Same research lifecycle |
| Hosting | No production assets selected | No approved immutable hosting; large source payload | No production assets selected |

No alternative weights were downloaded simply to continue searching on the same test set. The two justified primary approaches have real inference evidence; YOLOS remains diagnostic. This result rejects these candidates/configurations for this phase's acceptance criteria, not all possible browser vision. A future attempt requires a distinct justified candidate/task fit, cleared derivative assets, a larger independently annotated dataset and fresh held-out evaluation. It must finish within Phase 03 before production AI or Phase 04 can proceed.

## Second Attempt — Focused Evaluation

**Final decision: BLOCKED; bounded investigation stopped.** This section supersedes the preceding first-attempt suggestion of further model investigation. Exactly two approaches were inspected; zero model-weight downloads, zero new images, zero threshold fits and zero held-out inference passes were performed. No automatic continuation is proposed.

**User value defined before candidate eligibility:** identify supported broad visible-content kinds that numerical color/light measurements cannot identify. The question is “Which content kinds, if any, are supported by this model's evidence?” Proposed overlapping concepts are natural scenery, built settings, indoor settings, animals, people and ordinary objects. An indoor photograph with people and objects can legitimately have multiple labels. These are investigated concepts, not an approved taxonomy. There is no identity, geographic, authenticity, mood or provenance inference, no forced six-way softmax, and no renaming of ImageNet predictions as scenes.

| Approach | Exact artifact revision | Eligibility result |
| --- | --- | --- |
| Existing `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k` | `3ba07f12712fa58fd6b3d661f9909c9e332c5005` | 1,000-way ImageNet dominant-content classifier, not a broad multi-label content model. Has specific animals/objects but no general person or indoor-environment output. Reject as the primary task model. |
| New candidate inspected: `Xenova/mobileclip_s0` | `757d59c9c6870a76a4b0306f05f5061bca15c39f` | Separate ONNX text/image encoders and documented Transformers.js loading make zero-shot content matching technically plausible. Exact weights were not downloaded or executed: model-use clearance fails eligibility, and standard two-encoder delivery exceeds the size limit. |

MobileNet's local five model/config/runtime files were freshly hashed and match the prior manifest. Total model/config/runtime is **42,071,292 bytes**, before JS. Its upstream Apache-2.0 lineage and existing converter notice remain unchanged. Coarsening selected ImageNet children into object families is conceivable, but would be a separately specified mapping requiring calibration and evidence; it would not establish general people/indoor/scenery capability. No such mapping or arbitrary group probabilities were created. First-attempt MobileNet failures remain diagnostic context only, not six-category accuracy. The old heavy CLIP and YOLOS were not shortlisted or rerun in this attempt.

**MobileCLIP exact metadata:** upstream `apple/MobileCLIP-S0` at `71aa3e13dda93115871afbd017336535ba29886c`. Converter processor: shortest-edge resize256, center crop256×256, bilinear resampling, RGB, rescale1/255 and `do_normalize=false`. Its previous CLIP224 normalization must not be reused. Labels would come from explicit text inputs rather than a trained fixed six-category head; category-specific acceptance requires empirical calibration. The converter documents `CLIPTextModelWithProjection` and `CLIPVisionModelWithProjection`; that documents a browser implementation route, **not a local compatibility or performance test**. No local WASM/GPU execution or upstream speed claim is substituted for measurements.

Hub-advertised q8 files: text graph **42,799,238 bytes**, vision graph **11,846,843**, config344, processor382, tokenizer2,224,081 and tokenizer config763. Combined model/support **56,871,651** plus existing runtime26,914,834 = **83,786,485 bytes**, before JS/notices. This exceeds the80MB bound without a measured justification. A vision graph with precomputed fixed text embeddings could have a38,761,677-byte graph/runtime lower bound before metadata/embeddings, but neither that artifact nor delivery approach was implemented or benchmarked. It would not resolve permission to use the weights. Remote graph sizes/SHA-256 are advertised metadata, **not independently verified downloaded graph hashes**; local saved text/config files have their own computed hashes.

**License blocker:** the [converter's pinned LICENSE](https://huggingface.co/Xenova/mobileclip_s0/blob/757d59c9c6870a76a4b0306f05f5061bca15c39f/LICENSE) is an Apple software grant. The [upstream pinned model LICENSE](https://huggingface.co/apple/MobileCLIP-S0/blob/71aa3e13dda93115871afbd017336535ba29886c/LICENSE) restricts use/derivatives to research and excludes product development. The [official repository](https://github.com/apple-aiml-research/ml-mobileclip#license) explicitly distinguishes software from model terms. This does not substantiate product-use and weight-redistribution clearance for the exact conversion. No claim is made that later terms automatically revoke older grants, or that this audit resolves historical rights. The supplied evidence is insufficient to clear this product's exact export, so the user's no-integration rule applies. This is not a request to accept restrictive terms or to download research-only weights for product development.

**Dataset/protocol disposition:** no candidate passed eligibility, so the explicit stop rule was applied before collecting twelve new test images, freezing a scoring protocol, fitting category thresholds or running held-out inference. Image access or licensing was not tested and is not alleged to have failed. No new test set exists; none of the original eight test images was reused for tuning or claimed independent. Therefore fresh relevance, accepted precision, coverage and unsupported-acceptance rates are **not evaluated**, not zero or perfect. The unchanged gates (>=80% relevant supported predictions, >=90% accepted precision, >=50% covered-example acceptance, zero observed accepted unsupported predictions, nontrivial independent support) remain unsatisfied by new evidence. There is no fabricated calibration or rejection-all success.

Evidence: `evidence/second-attempt/candidate-audit.json`, pinned API snapshots, two license files, processor/config and source/converter cards. `scripts/audit-phase03-focused.mjs` retrieves only metadata/small text and verifies local asset checksums. No app, inference, taxonomy, threshold, dependency or production-asset code changed. The architecture, verification and handoff reports record the bounded stop and current safety checks.

## Final Completion Assignment — Verified Evaluation

**BLOCKED: both assigned candidates fail useful accepted coverage. No production model selected.** The question evaluated is supported visible content/scene classification, permitting mixed labels and abstention. No identity, location, authenticity or quality claim is made.

**A — TinyCLIP:** `onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX` revision `9463a9c508a344c837ffefe9d724f3827bf2dc79`; source `wkcn/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M` revision `a2a8c6eaa2549ad66eb7c31b85022bf58273a26c`. Source and export cards declare MIT and identify the same model; the [original project license](https://github.com/microsoft/Cream/blob/main/TinyCLIP/LICENSE) supplies the MIT grant and attribution. This goes beyond relying on the converter's metadata alone. No differing checkpoint restriction was found; source/card/license evidence is retained. Preserve Microsoft copyright and MIT text. Training-photo copyrights are not a license to redistribute the training dataset. Only `model_int8.onnx` was downloaded:24,281,512 bytes, SHA256 `844d1a46ab18acf50c989e541b12fe3b6dc7f8d6004725b4e992d142788e0600`. Full model/tokenizer/config/runtime/license payload **54,842,232 bytes**, before application JS. It is above the50MB preference but within80MB; size was not used to reject it.

Exact processor: bicubic shortest-edge224, center224 crop, RGB/white alpha composite,1/255 and saved CLIP normalization. Native CLIP dual encoder (10 vision layers/3 text layers,256 hidden,512 projection) produces cosine ranking over six frozen text descriptions: nature, built streets, indoor room, animals, food and transport. No cosine percentage is displayed.24 fresh originals (21 photographs+3 artwork/document challenges) are split12/12; each half has6 supported and6 unsupported. Single visual annotator; no independent adjudication, sparse class evidence and convenience sampling are explicit limits. Source/license/author/hashes and annotation rationale are in `tests/fixtures/phase03-final/`; no prediction-based selection occurred.

**B — Places365:** official `CSAILVision/places365` repository revision `8a953ed56438726dc98bdef3796d042e7f1f171e`, `resnet18_places365.pth.tar`, downloaded SHA256 `2f4759217d470da2b803f8f66cd4488a066406b555a5fb95ee9a4663f9f05588`. The [official repository](https://github.com/CSAILVision/places365#acknowledgements-and-license) explicitly licenses pretrained models CC BY (version unspecified), distinct from MIT software; attribution to Zhou et al./project is retained. Source checkpoint was delivered over official HTTP because HTTPS failed; no independently published publisher hash was obtained, so this is not certified end-to-end artifact delivery. It was not promoted. A local strict365-class torchvision ResNet18 load and deterministic eval export used PyTorch2.11.0, ONNX1.23.2, opset17, no retraining. Graph45,445,545 bytes, SHA256 `41e578f4fa3bb8b7dfde16ebd3e066cab4a81575528342b74de3d8aff5effb91`; tested graph/labels/reference/notice/runtime payload **72,373,047 bytes**, before application JS. Development checkpoint is not part of that delivery calculation. No third candidate was sought.

All365 official labels preserve index ordering. Preprocessing uses shorter-edge256/center224 equivalent geometry, ImageNet normalization and browser canvas resampling; interpolation is not certified identical to torchvision for natural images. Browser logits for the same all-zero normalized tensor passed the saved PyTorch reference tolerance1e-4; that validates this reference only, not full upstream benchmark equivalence. Full365-way softmax is not a correctness probability. B uses A's12 calibration originals only as development, and12 separately selected new test originals (6 supported/6 unsupported), not A's known test results. Sources/annotations are in `tests/fixtures/phase03-places/`.

For each candidate, vocabulary/annotations/preprocessing/scoring/gates were frozen before fresh test inference. Per-predicted-class score and top-two-margin thresholds were fitted on calibration only, requiring>=90% observed accepted precision and zero unsupported calibration acceptances. Classes without safe support abstain. Policies were written before the single held-out pass. No tuning followed either test outcome. Gates remain>=80% supported top-one relevance,>=90% accepted precision,>=50% supported coverage, zero unsupported accepts, and at least4 correct independent acceptances (nontrivial support).

| Final held-out result | TinyCLIP | Places365 |
| --- | ---: | ---: |
| Supported top-one relevance |5/6 (83.3%)|3/6 (50%)|
| Accepted predictions / correct |0 /0|0 /0|
| Accepted precision |undefined; gate fails|undefined; gate fails|
| Supported coverage |0/6 (0%): FAIL|0/6 (0%): FAIL|
| Unsupported accepted |0/6|0/6|
| Nontrivial correct acceptance |0: FAIL|0: FAIL|

Reject-all is not success. Raw unfiltered matching accepted all6 unsupported examples in each test set. TinyCLIP ranked a sailboat as scenery, a portrait as animals and a manuscript as an indoor room. Places365 ranked a façade as nursery, a portrait as museum/indoor, and a jewelry closeup as jewelry_shop. Full rankings, primary descriptive confusion counts, policies and decisions are in `evidence/final/{tiny,places}-{quality,decision}.json`. Sparse per-class counts do not justify macro-F1/class certification or probability calibration. Original/repeat/dark/blur calibration diagnostics preserve each model's top class, but that stability does not repair failed quality. No test image or threshold was revised after observing failures. Both model searches stop here.

## Qwen Local Companion — Implementation and Verification

**PHASE 03: BLOCKED on grounded-output quality.** This is a new approved local-companion scope, not a rerun of rejected browser classifiers. No additional model was researched, downloaded, substituted or quantized.

The reference was inspected directly at the sibling OUAHAD AI repository, including its application Ollama provider, extracted package, manifests, embedded template, runtime config, launcher and image verifier. The extracted native path genuinely ran again on its existing licensed cat photograph: 7.094s load, 40.235s inference, a completed cat/blue-blanket description, actual project language-GGUF mapping and copied libmtmd.dll confirmed, owned server stopped. This is smoke evidence, separate from held-out quality.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| weights/model-q4_k_m.gguf | 1,108,016,576 | bd2179e37645d5435e0214e5399e5997408a7e9685ba527cbb60726e6a32fd99 |
| vision/mmproj.gguf (vision encoder + projector) | 822,540,352 | 4dc7bc5863d7fc3ad784acf677f72f009ab5fd3758855f1996b678b621817190 |
| runtime/windows-x64-cpu/llama-server.exe | 22,920 | bb3d2f86e3d8907c4febc3d7a299a8d13d95ddc281c5f81fe496e0d32b12dca3 |

Exact installed conversion provenance: Ollama qwen3-vl:2b-instruct, parent dhiltgen/qwen3-vl:2b-instruct-q4_K_M-llamacpp; installed manifest digest afc393e3572c07db0bc84aa460d928a16c75f3fbb9ca9e0dccc4fbd2dafb573e. Original upstream checkpoint repository revision is **not established** by these files. Do not invent a Hugging Face revision. Exact GGUF identity is pinned by the hashes above. Runtime: installed Ollama 0.40.6 llama.cpp build 0.7.0-dev, build1, commit620d2225c, Clang18.1.8 Windows AMD64. Quantization Q4_K_M; projector retains its existing F16/F32 tensors. Model Apache-2.0 and all copied runtime/vendor license notices are retained in companion/licenses; the importer validates the pinned 55 weight/runtime/license artifacts. No re-export or conversion occurred.

Frozen generation: embedded chat template, actual JPEG image_url data block, fixed system/instruction/schema in companion/contract.json, temperature0/top_k20/top_p0.95/seed42/max_tokens384/cache_prompt=false. Four bounded fields: summary, visible objects, spatial relationships, uncertainties; no confidence percentage. The prompt tells the model to ignore instructions written in images and prohibits identity, exact-location, sensitive-attribute, health, intent, authenticity, metadata and out-of-frame claims. Strict JSON, duplicate-field, completion, shape and length checks precede display. Schema validity cannot establish semantic truth.

**Fresh held-out evaluation:** six distinct licensed Commons natural photographs (market cart/person, tools, perched bird, mountain panorama, distant kayaks, restaurant meal), with source-query responses, author/license/source URLs and byte hashes in tests/fixtures/qwen. The fixed queries and first eligible distinct JPEG selection were independent of model outputs. evaluation.json froze visual expectations, prohibited claims, gates, contract/source hashes and dim/blur transforms before final outputs. The reference cat and prior classifier examples were not treated as held-out. All six original requests and four fixed transformations completed with valid JSON (128–180 output tokens), without post-hoc prompt tuning or a universal accuracy percentage.

Visual review is recorded claim-by-claim in evidence/qwen/quality-review.json. Main subjects were recognized, but the frozen gate failed: market output guessed age and selling activity; its person/cart relationship changed from standing behind to sitting on to standing on across transforms. Lake/kayak outputs twice asserted ocean without visual support. Several originals added unsupported specifics or generic/conflicting uncertainties. No named identity, exact geographic location, authenticity, camera-metadata or health claim was observed in these ten responses; that small count is not a safety certification. The reviewer was the coding agent with image access; **no independent human review is claimed**.

companion/promotion.json remains false and bound to frozen contract SHA-256 2d7341f0dc44ad31f837ee29a6dc30661ed5e8b5ec912f6254e51b275e3bce21. The shipped gateway rejects observation requests before decoding/inference; pairing advertises observationsEnabled:false and the normal website disables Analyze. This prevents a disclaimer from being used to waive failed quality. Further model search, prompt tuning against these held-out cases and Phase04 were not started.


## Cloud Vision API Integration — Final Product Architecture

Date: 2026-10-22. This section supersedes local-model selection as the product strategy; previous experiments are retained as history. No new model research cycle was started.

| Provider / exact model | Credential and inference evidence | Production and cost decision |
| --- | --- | --- |
| Google Gemini / `gemini-3.5-flash-lite` | Model discovery authenticated. A real 1-pixel red PNG returned a correct red description. The final adapter returned schema-valid, correct quadrant observations on a synthetic 40 × 24 JPEG in 6,863 ms; 1,213 input / 97 output tokens. | Technical vision support VERIFIED. Published free tier exists. Actual project billing tier, remaining free quota and invoice attribution cannot be established from this API key: cost safety UNVERIFIED. Disabled pending owner verification. |
| NVIDIA / `meta/llama-3.2-11b-vision-instruct` | `/v1/models` authenticated and lists this image-understanding model. No hosted inference was made. Embedding/retrieval models in the listing are not vision-description fallbacks. | DISABLED: Developer Program access is for prototyping/research/development/testing, not serving production end-users. No free production entitlement was established. No paid license sought. |
| Cloudflare / `@cf/meta/llama-3.2-11b-vision-instruct` | Token verification active; account model discovery succeeds and advertises this vision model. Subscription inspection returns 403/code 10000; D1 listing returns 401/code 10000. No inference made. | DISABLED: account plan/payment status and model-license acceptance unverified. No `prompt: agree` or billing change was made. A model listing is not account-level eligibility. |

Actual enabled production routing today: **none**. Implemented priority: Gemini → NVIDIA → Cloudflare, skipping disabled providers. Gemini is the technically proven candidate; neither optional fallback is empirically qualified. One eligible provider would suffice, but key validity and successful inference are not a billing attestation.

`gemini-2.5-flash-lite` metadata advertised generation and 1,048,576 input / 65,536 output tokens, but the one actual inference probe returned 404/NOT_FOUND. It is not used. Current Google documentation restricts legacy 2.5 access. No cycling of keys/accounts, OpenRouter, file-upload API, paid models, tools/grounding/search, cache or top-up was introduced.

Five bounded Gemini generation requests occurred: one legacy-model 404, one successful red-image probe, two rejected 400 schema requests, and one successful final structured-adapter call. The 400 exposed unsupported `responseSchema.additionalProperties`; it was removed while server validation continues rejecting extra properties. Setup-only TypeScript module-loading failures sent no API requests. No genuine quota exhaustion was deliberately induced. Fallback/quota/error tests use clearly identified mocks.

### Eligibility, limits and terms

- Gemini: fixed HTTPS `v1beta/models/gemini-3.5-flash-lite:generateContent`, server `x-goog-api-key`, inline JPEG, structured JSON, 480 output tokens, no tools. Provider model limits are larger than application limits; no guessed per-project RPM/RPD or remaining balance is claimed. A request succeeding does not reveal free-vs-paid billing. Google applies limits per project, not key; RPD reset is midnight Pacific. Only actual Retry-After / RetryInfo is used for automatic Gemini cooldowns. Unknown reset suspends until explicit operator verification.
- Google unpaid terms permit product-improvement processing and human review and prohibit sensitive/confidential/personal submissions. API clients are restricted to adults and professional/business purposes in supported regions, with paid-only access required for EEA/Switzerland/UK users. The implementation is an owner-invited MA professional pilot, with owner vetting and on-action attestation. It is not qualified for unrestricted worldwide consumer access.
- NVIDIA: fixed hosted `https://integrate.api.nvidia.com/v1/chat/completions`, Bearer credential, explicit VLM model ID. Generic adapter scaffolding has mock normalization coverage only. Provider production-use rights, current hosted request limits, remaining credits, account-specific reset and retention are unqualified because eligibility failed; do not enable this adapter under free trial access. Meta's model license alone does not grant NVIDIA hosted production access.
- Cloudflare: fixed account-scoped `ai/run/@cf/meta/llama-3.2-11b-vision-instruct`, Bearer token, image bytes plus prompt, 480 output tokens. Official model documentation explicitly supports captioning/image questions and requires prior Meta license/AUP agreement. Standard Workers AI rate guidance lists 300 text-generation requests/minute, with model-specific limits able to differ; no account allowance is inferred. Published Workers Free allocation is 10,000 neurons/day, hard failure rather than overage; reset 00:00 UTC. Paid Workers can incur overage. Internal error 3036 means daily free exhaustion; 3040 means temporary capacity, not daily exhaustion. Official Workers AI data terms describe no training and standard-inference retention only as necessary, subject to listed exceptions. No blanket zero-retention promise is made by the UI.
- Our accepted cloud input is stricter than provider limits: oriented, newly encoded JPEG only, <=768 KiB, each dimension <=1024. The official image-input guide limits inline requests to 20 MB total. Our base64 request is at most about 1 MiB plus the fixed prompt. The actual smoke verified only its small request, not the provider maximum. Cloudflare's numeric-byte representation is also bounded, but no claim of an empirically tested maximum or real fallback support is made. NVIDIA limits remain irrelevant while disabled. The [current exact-model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) lists 1,048,576 input / 65,536 output tokens and image/structured-output support; the adapter enforces its own 480-token cap.

### Primary sources reviewed

- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [image input](https://ai.google.dev/gemini-api/docs/image-understanding), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [terms](https://ai.google.dev/gemini-api/terms), [legacy model access](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite), [supported regions including Morocco](https://ai.google.dev/gemini-api/docs/available-regions).
- [NVIDIA production/developer-access FAQ](https://docs.api.nvidia.com/nim/docs/product), [exact vision model](https://docs.api.nvidia.com/nim/reference/meta-llama-3_2-11b-vision-instruct).
- [Workers AI vision model](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [limits](https://developers.cloudflare.com/workers-ai/platform/limits/), [error codes](https://developers.cloudflare.com/workers-ai/platform/errors/), [data handling](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

AI Grounding is **EXPERIMENTAL**. Two simple synthetic successes do not establish held-out photo accuracy, safe coverage, calibrated uncertainty, legal certification or scientific validity. The earlier local-model grounding gates do not transfer to cloud models. Raw structured inference is retained in `evidence/cloud-vision.json`; it contains only a synthetic fixture description, bounded observations and safe usage metadata.

## Centralized AI Routing, Shared Quotas and Owner Control Center — Finalization

Date: 2026-10-22. Engineering **BLOCKED** / Cost Safety **BLOCKED** / Production Readiness **BLOCKED** / Phase 04 **NO**. This section supersedes the older three-provider order and 10-action global quota; prior model research and inference evidence remain historical.

### Exact registry and eligibility

| Priority | Exact API model | Current evidence | Production state |
| --- | --- | --- | --- |
| 1 | Gemini `gemini-3.5-flash-lite` | Fresh authenticated model GET 200; generation supported; official reference confirms image input and structured output. Prior two real synthetic-image inferences remain valid technical history. | Disabled: current account billing is not attested; shared D1 and the admitted release check are unavailable. |
| 2 | Gemini `gemini-3.1-flash-lite` | Fresh authenticated model GET 200 with generation support; official reference confirms image input and structured output. | Disabled: no exact-model real vision smoke or current free-billing attestation. `CLOUD_AI_GEMINI_31_VISION_UNTIL` must remain absent until a bounded successful smoke. |
| 3 | Cloudflare `@cf/meta/llama-3.2-11b-vision-instruct` | Registered existing adapter. Token/model discovery succeeds. Subscription inspection remains 403 and D1 listing 401 with the Workers AI token. | Allocation zero: no verified free plan/license/actual inference or measured Neurons envelope. Environment flags alone cannot bypass the zero compiled ceiling. |
| 4 | NVIDIA `meta/llama-3.2-11b-vision-instruct` | Registered existing development adapter; model discovery works. | Hard excluded by the production router, zero allocation. No free hosted production entitlement established. |

No model selector exists. Every authorized participant shares the same registry/settings/counters and highest-priority currently eligible model. A second Gemini model is a separate routing entry, not a separate assumed project budget. Default project-wide safeguards cover both Gemini entries.

### Owner-reported project limits and internal ceilings

The prompt reports an AI Studio inspection, not a balance API or immutable provider contract:

| Displayed model | Owner-reported RPM / TPM / RPD | Internal daily / rolling RPM / reserved TPM |
| --- | --- | --- |
| Gemini 3.5 Flash Lite | 15 / 250,000 / 500 | 300 / 10 / 200,000 |
| Gemini 3.1 Flash Lite | 15 / 250,000 / 500 | 300 / 10 / 200,000 |
| Gemini 2.5 Flash Lite | 10 / 250,000 / 20 | Not registered for production; disabled |
| Gemini 2.5 Flash | 5 / 250,000 / 20 | Not registered for production; disabled |
| Gemini 3 Flash (display label only; no exact ID verified) | 5 / 250,000 / 20 | Not registered for production; disabled |

The prior reported two daily Gemini 3.5 requests are historical owner evidence, not a live remaining-balance measurement. Do not display 498 remaining or treat 300 internal requests as guaranteed free capacity. Shared Gemini project ceilings are **300 attempts/Pacific day, 10 attempts/rolling minute, 200,000 reserved tokens/rolling minute, 1,000,000 reserved tokens/Pacific day**. This is a conservative application policy, not a claim about independent provider quotas. Outside usage can consume account capacity; provider errors remain authoritative.

Both exact Gemini metadata responses list 1,048,576 input / 65,536 output tokens. The app retains one <=1024-side JPEG, a fixed short prompt and 480 maximum output tokens, and reserves **4,096 tokens/attempt** conservatively. Published Gemini 3 image token guidance is approximately 1,120 at default image resolution; the reservation covers the fixed text, bounded image and output with margin, not an exact tokenizer balance. The existing request payload and successful primary-adapter contract are preserved. If reported usage ever exceeds its reservation, SQL charges the excess and triggers an audited global stop. Unknown/failed usage never refunds the reservation.

### Cost and actual inference qualification

No new generation request was made during finalization. API discovery is read-only; deterministic router/admin/SQL/browser harnesses are not live inference. The earlier real Gemini successes remain in `evidence/cloud-vision.json`; they do not prove a real admitted D1/browser flow. Google AI Studio and Cloudflare dashboards are signed out in the available browser, so invoice/free-tier status could not be inspected. No login credential, payment or subscription was changed.

The bounded adapter smoke script now requires a fresh owner free-billing attestation before any generation, supports only the two exact Gemini IDs, and appends evidence without erasing earlier history. The new admitted smoke script requires a real configured D1 connection, owner invitation and local production server; it captures actual consent/upload → admission → provider → validated DOM and checks the completed D1 record. Both remain blocked rather than bypassing cost/shared enforcement.

Current enabled production models: **none**. Published free pricing plus displayed rate limits does not certify this project's billing setup. NVIDIA's free Developer Program restriction is not overridden by Meta's model license. Cloudflare requests are not estimated from 10,000 Neurons/day; with no measured conservative envelope, its safe request allocation stays zero. A paid transition needs a separate reviewed policy/migration and explicit owner approval; no admin switch activates it here.

Sources: [Gemini 3.5 model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Gemini 3.1 model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [rate-limit semantics](https://ai.google.dev/gemini-api/docs/rate-limits), [media token guidance](https://ai.google.dev/gemini-api/docs/media-resolution), [data/use terms](https://ai.google.dev/gemini-api/terms), [NVIDIA access restrictions](https://docs.api.nvidia.com/nim/docs/product), [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Cloud grounding remains **EXPERIMENTAL**. No new quality study, calibration claim, local-model strategy, model substitution or research cycle was started.

## Final Remote Verification and Git Cleanup

Date: 2026-10-22. No provider/model research or inference was repeated. Exact order and internal ceilings remain as recorded above; enabled production models remain **none**. Remote D1 migration and quota/accounting verification now pass, including eight concurrent reservation calls, but those synthetic SQL fixtures are not vision/model-quality evidence.

Both Cloudflare credentials return subscription inspection **403/code 10000**. D1 query authorization proves database access, not Workers Free. No usable Google Cloud OAuth CLI credential is available to establish billing securely from the Gemini key. The owner explicitly confirmed that billing/tier pages still need inspection. Published prices and owner-reported 15 RPM / 250K TPM / 500 RPD are not substituted for account verification.

Per [Google's billing guide](https://ai.google.dev/gemini-api/docs/billing), inspect the correct AI Studio project's Billing Tier and billing status without activating setup/payment. Until Workers Free and Gemini Free/no paid billing are confirmed, free attestations remain absent and the admitted smoke is **NOT RUN**. No new image/provider call, paid fallback, extra account or key rotation occurred. The prior two Gemini 3.5 successes remain historical only. Gemini 3.1, Cloudflare and NVIDIA are not relabeled as qualified.

Downloaded historical model/runtime assets are ignored by Git but preserved locally with their manifests, provenance, hashes, preparation scripts and notices. The change does not promote or retest a rejected local model. Grounding stays **EXPERIMENTAL**; Phase 03 **BLOCKED**, Phase 04 **NO**.

## Owner-Only Admitted Verification

Date: 2026-10-22. Billing/tier inspection is now complete by explicit owner confirmation: Workers Free active with no payment method, and Gemini project `hidden-data` Free with billing setup offered. A 24-hour local attestation records that evidence without changing provider accounts or enabling paid use. No further model discovery or selection research was performed.

One synthetic quadrant image was submitted through the actual browser/consent/Next/remote D1 path to `gemini-3.5-flash-lite`. It exceeded the configured **12-second adapter deadline** and was recorded remotely as uncertain/timeout. **No successful output or new vision qualification is claimed.** Actual token usage is unreported; the 4,096-token reservation remains charged. Earlier two successful direct adapter probes remain historical and do not substitute for an admitted browser success.

No second call, Gemini 3.1 smoke, Cloudflare inference, NVIDIA inference, model substitution or paid fallback occurred. Optional providers remain unqualified/disabled; all models were disabled again after owner testing. The timeout does not establish a model-availability, billing or image-support failure. Grounding remains **EXPERIMENTAL**; Phase 03 **BLOCKED**, Phase 04 **NO**, with successful admitted inference the remaining critical gate.

## Gemini Timeout Alignment — Final Verification

Date: 2026-10-22. Under a separate explicit one-test authorization, Gemini's allowance was increased to 45 seconds within aligned API/browser/route budgets. The same exact `gemini-3.5-flash-lite` model, fixed prompt/schema, conservative output cap and small synthetic quadrant fixture were used; no model research, substitution or optional-provider smoke occurred.

The single new admitted browser/remote-D1/Gemini flow succeeded: validated observations appeared in the browser, one attempt completed, reported input/output/total tokens were **1,213 / 128 / 1,341**, and API processing elapsed was **2,227 ms**. This response was faster than the earlier cutoff; it does not prove that every latency event is resolved by the longer timeout. Focused simulated delayed-response tests separately verify the new 45-second allowance and cancellation behavior.

The earlier uncertain attempt remains charged and is preserved as failed history, not relabeled as a success. Only the primary has this new admitted evidence. Gemini 3.1, Cloudflare and NVIDIA remain disabled; their eligibility gates and zero allocations where applicable are unchanged. The owner-confirmed free attestations remain expiring and no paid fallback is enabled. Phase 03 passes for the restricted configuration, while broad grounding remains **EXPERIMENTAL**. No Phase 04 work or deployment occurred.


## FINAL READINESS AUDIT — EXIT REVIEW

**2026-10-22 — Phase 03 Completed; Final Readiness Audit CONDITIONAL; Phase 04 READY as an engineering gate only; public deployment NOT YET AUTHORIZED.** No Phase 04 work, deployment, staging, commit, push, merge, paid billing or Vercel setting change occurred. No critical application defect remains in the exercised scope. Conditional means experimental quality with limited evidence, optional providers still unqualified, an unpatched development dependency advisory, and local Git temporary garbage whose deletion automatic approval blocked. It does not authorize public inference.

Current safety is verified remotely: emergency stop ON; every model disabled; zero active owner sessions; zero unreleased actions; temporary owner invitation revoked (actual local production HTTP 403); public-release flag absent. Production D1 retains **3 attempts: 2 completed, 1 uncertain**. Both primary-model and shared-project Pacific-day counters retain **3 reservations / 12,288 charged tokens / 2,743 reported tokens**. The uncertain request still has unknown actual usage; it was never refunded. Free billing remains the owner's expiring manual attestation, not a billing status inferred from an API key.

Fresh evidence is consolidated in [cloud-vision.json](evidence/cloud-vision.json), under `finalReadinessAudit`. Earlier failed calls and historical evaluation records remain intact. The authoritative exact proposed Git scope is [commit-scope.json](evidence/commit-scope.json).

The only genuine inference added by this audit was the admitted Gemini 3.5 contact-sheet request. It used six attributed, non-sensitive previously approved Commons fixtures: landscape, empty room, workshop bottles, sleeping dog, furnished room and a dimmed distorted-window reflection. Assistant expectations were frozen before inference; neither prompt nor acceptance rule was tuned. One 960×640 composite produced one structured response, not six independent trials. The browser displayed the validated description and observations; D1 reserved 4,096 tokens and reports 1,218 input + 184 output = 1,402 total. API elapsed time was 4,361ms; no retry or real fallback occurred.

Visual review found all six broad subjects described, with detailed observations only for A–D. No obvious fabricated object/relationship or exact identity/location/metadata claim was detected. Bottle contents and dog breed were explicitly uncertain. Complex and ambiguous scenes received limited detail; consistency, hard abstention/refusal, physical mobile and general accuracy were not established. These are assistant judgments on reused fixtures, not independent human ground truth or a population benchmark. **AI grounding remains EXPERIMENTAL.**

Fresh metadata calls return HTTP 200 for the exact Gemini 3.1 and Cloudflare IDs. [Gemini 3.1 documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) and [pricing](https://ai.google.dev/gemini-api/docs/pricing) support image input and free input/output, but genuine qualification was not performed: the existing visitor cap allowed one remaining action, used for the quality check. Its vision attestation remains absent. [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) states a 10,000 Neurons/UTC-day free allowance and model-specific input/output conversion; actual per-image Neurons and account balance are unknown. No license/Neuron attestation was manufactured and zero quota stays zero. NVIDIA remains development-only. All models finish disabled.

Fallback order, bounded serial visits, temporary-provider errors, cooldown/expiry, refusal/no-fallback and quota constraints pass deterministic simulations. Those tests do not establish live multi-provider fallback or promote an unqualified provider. No new model search, research inference, tuning or local-model promotion occurred. Full current verification and Git qualifications are in [the handoff exit review](PHASE-03-HANDOFF.md#final-readiness-audit--exit-review); machine-readable plans, output and review are in `evidence/cloud-vision.json` under `finalReadinessAudit.quality`.
