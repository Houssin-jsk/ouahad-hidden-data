# Phase 4.3 fixed photograph benchmark

`benchmark.json` is the selection, attribution, byte-hash and pre-inference judgment manifest. There are 24 new photographs, separate from the six Phase 4.2 examples. Sixteen are the first published COCO training rows, without model-based selection; eight fixed Wikimedia photographs fill food, indoor, landscape, cultural and abstract gaps. Alternating order within each source assigns 12 audit and 12 held-out images. Neither split was used to tune prompts after inference.

The stored JPEGs are development-only fixtures, outside `public/`. COCO photographs have individual Flickr licenses that have not been resolved here; do not redistribute them as product assets or claim that the annotation/dataset license licenses every photograph. Commons author, source and license metadata is in the manifest. Tajine and coast are 960-pixel Commons thumbnails; other Commons fixtures are original files. The thumbnails resize the source photograph; this benchmark is not a native-resolution detector evaluation.

Accepted description IDs were recorded by one evaluator before inference. They judge the principal subject/scene, including explicit wording qualifiers. A secondary vase, road or building does not establish that the principal flower, clock or aircraft scene is covered. An empty list means no adequate description for the principal scene, not that no candidate mentions anything visible. These labels are fallible qualitative judgments, separate from cosine similarities, not independently adjudicated ground truth.

`node scripts/prepare-readiness-benchmark.mjs` verifies existing bytes and attempts to restore missing files using pinned URLs. Changed bytes fail hash verification instead of silently altering the benchmark. Source servers may rate-limit or remove an image. Keep the existing fixtures to reproduce the test without any external photo downloads. Model inference itself fetches only same-origin model assets and never uploads pixels.

This is a small convenience/coverage benchmark, not a representative estimate of real-world accuracy. COCO row order overrepresents animals/vehicles. Pretraining overlap with CLIP is unknown. “Held-out” means held out from prompt development, not guaranteed absent from model pretraining. Geographic coverage is limited; three Moroccan subjects are not a cultural validation study.

## FINAL READINESS AUDIT — EXIT REVIEW

The sixteen COCO originals are preserved locally and excluded from Git pending individual photographic rights clearance. The frozen manifest and all assertions remain. `prepare-readiness-benchmark.mjs` documents byte-checked restoration for authorized historical evaluation; it is not part of production setup and was not rerun during this audit. The eight attributed Commons fixtures remain Git candidates. No benchmark result is relabeled as independent validation of the cloud model.
