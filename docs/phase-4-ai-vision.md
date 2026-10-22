# Phase 4 — real local AI Vision

## Product behavior

AI Vision is optional, available after native pixel analysis. Opening its tab downloads no model; pressing **Run AI Vision** starts the dedicated worker and lazy runtime import. Base analysis, metadata, maps, warm brand tokens and the existing six-second presentation gate are preserved. AI adds no artificial duration.

The tab shows the top five ImageNet labels and softmax scores over all 1,000 classes. It labels a top score below 50% **uncertain**. This threshold is a product caution rule, not calibrated accuracy. Scores are rounded to one decimal percent and are not guarantees. Measured Image DNA appears under its own heading; AI suggestions cannot modify the measured statistics or generate narrative captions.

## Model and verified compatibility

- Original: [timm/mobilenetv4_conv_small.e2400_r224_in1k](https://huggingface.co/timm/mobilenetv4_conv_small.e2400_r224_in1k), Ross Wightman, 3.8M parameters, ImageNet-1k, approximately 0.2 GMAC at the reported input size.
- ONNX export: [onnx-community](https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k/tree/3ba07f12712fa58fd6b3d661f9909c9e332c5005), pinned revision `3ba07f12712fa58fd6b3d661f9909c9e332c5005`.
- Published stable Transformers.js **4.3.1**, pinned exactly in package.json and package-lock.json. Its installed model registry explicitly supports `mobilenet_v4` and `MobileNetV4ForImageClassification`.
- This stable Transformers.js release depends on ONNX Runtime Web **1.31.0-dev.20260914-8d85527a0**. Copy its exact Asyncify factory/binary; mixing the older JSEP binary with this release failed `webgpuInit` during verification.
- Explicit `AutoModelForImageClassification` + `AutoImageProcessor` initialization avoids a local-model discovery issue in the high-level pipeline helper, which returned a null processor.

### Accuracy changed the artifact choice

The 3,931,745-byte q8 export failed the known tiger smoke test. Browser inference ranked cello at 32.6%; native ONNX with official preprocessing ranked sidewinder, knee pad and cello. This was reproducible outside the browser preprocessing code. Its smaller download did not justify shipping those results.

The **15,086,122-byte fp32 export** correctly classified the same tiger in both native and browser runtime tests. Only fp32 ships. This is an empirical artifact suitability check, not a full ImageNet accuracy benchmark.

## Licenses and provenance

The original timm model card declares **Apache-2.0**. Transformers.js is also Apache-2.0; the included `public/ai/LICENSE-Apache-2.0.txt` supplies that license text. ONNX Runtime is MIT; its copyright/license text is included in `public/ai/runtime/LICENSE.txt`. `public/ai/NOTICE.txt` records the original author, converter, pinned revision and unchanged artifacts.

**Remaining provenance limitation:** the ONNX converter's model card does not independently declare a license. The Apache-2.0 claim is verified against the original model, not invented for the converter. Confirm the converter's redistribution provenance before a public release. The tiger fixture is an official documentation example, retained only under tests, with its own provenance note; its image-specific license was not verified.

## Assets, bandwidth and memory

| Asset | Bytes |
| --- | ---: |
| fp32 model.onnx | 15,086,122 |
| config.json (includes all labels) | 69,895 |
| preprocessor_config.json | 441 |
| Asyncify WASM | 26,861,777 |
| Asyncify factory module | 53,057 |
| Total model + explicit runtime | **42,071,292** |

That is approximately **42.1 decimal MB / 40.1 MiB**, plus lazy JavaScript and small notices. SHA-256 and sizes are recorded in `public/ai/manifest.json`. The network path is same-origin `/ai/…`; no inference service is involved.

Bundling public files requires no Vercel Blob account or database. They are static assets rather than function-processing inputs. Each uncached AI run can consume about 42.1 MB plus JavaScript of outgoing site bandwidth (roughly 42 GB for 1,000 cold users). Turbopack also emits an unused default Asyncify WASM asset under `.next/static/media`, so deployment output includes another approximately 26.9 MB even though the configured runtime loads `/ai/runtime/…`. Budget for this duplicate build asset and check hosting quotas before release. No hosting project was connected or deployed.

The [current Vercel limits](https://vercel.com/docs/limits#static-file-uploads) state a **100 MB Hobby / 1 GB Pro total source upload limit for CLI deployments**. The AI source assets consume approximately 42 MB of that allowance; assess the whole repository, including brand files, rather than confusing this with a per-image inference limit. Account-specific bandwidth allowance and deployment packaging were not tested because no deployment was authorized.

Download size is **not** peak memory. The runtime initially reserves 256 WASM pages (16 MiB) and can grow; weights, fetch/compile copies, tensors, GPU allocations and the original decoded bitmap add to this. The AI RGBA buffer is bounded at 200,704 bytes and the float input tensor at 602,112 bytes. Large source images can still dominate bitmap memory. Peak browser/mobile process memory has not been measured, and no fixed safe memory ceiling is claimed. The worker releases bitmaps, clears practical pixel buffers and disposes input/output tensors. A completed model stays warm for five idle minutes, then the worker is released.

## Preprocessing and numerical methods

Pinned official preprocessing specifies RGB, shortest edge 256, center crop 224, `/255` rescale, means `[0.485, 0.456, 0.406]`, standard deviations `[0.229, 0.224, 0.225]`.

To avoid large intermediate buffers for panoramas, the worker draws the native central square of side `min(width,height) × 224/256` directly to 224 × 224. This approximates resize-shortest-edge-to-256 then crop-to-224, with canvas high-quality filtering. It does not exactly reproduce Pillow bicubic filtering or integer resize rounding. The official image processor then applies rescaling, channel normalization and CHW layout; its resize/crop are explicitly disabled to prevent double cropping. Orientation follows the existing browser decoder. Alpha is composited on white; the model receives only RGB pixels, never original file bytes or metadata.

Softmax is computed stably as `exp(logit - max) / sum(exp(logit - max))` over all 1,000 finite logits. The top five are ranked afterwards; they are not renormalized to sum to 100%. This differs deliberately from the base engine's native, area/alpha-weighted color statistics. The crop may miss objects at the edges, small objects, multiple objects or unfamiliar/culturally specific subjects. Classification is not localization or object detection.

## Worker, backends and lifecycle

One reusable worker/session handles serialized inference. Concurrent initialization shares one promise. With an available worker WebGPU adapter, fp32 initialization first attempts WebGPU; initialization failures retry WASM. GPU inference errors dispose that session and retry once with WASM. WASM uses one thread and does not require cross-origin isolation. **Use CPU compatibility mode** bypasses WebGPU and releases a prior automatic worker if needed. A warm CPU model remains on CPU when reused.

Events identify real stages: model initialization/download, image preparation, inference and finalization. Progress bars use actual received bytes and a known total only; unknown totals remain a descriptive loading state. No progress reaches completion until actual results exist. The 120-second watchdog offers retry for stalled downloads/devices.

Tab changes retain current predictions. Image replacement/unmount cancels any active presentation, advances the generation token and terminates the active worker, so late results cannot appear. Completed idle models can be reused for subsequent images. Discarding a run releases the worker and rejects its result; GPU commands already submitted may still finish in the graphics driver. The UI states this explicitly. Failed AI does not affect pixel results.

## Privacy and cache behavior

`allowRemoteModels=false`; localModelPath and WASM paths use this site's origin. AI dependencies are lazy, and the homepage/base flow makes no model requests. Only a decoded ImageBitmap is transferred locally to the worker. There are no upload handlers, external AI endpoints, analytics, image persistence, EXIF/GPS inputs, localStorage writes or IndexedDB image writes.

Transformers.js Cache API use is disabled. Model/runtime responses may remain in ordinary browser HTTP cache under browser/server policy; offline reuse is not guaranteed, and a cold offline visit cannot load AI. In-memory model reuse lasts until idle release, active cancellation, page close or failure. Images and predictions are discarded on replacement/page close. Browser decoded-image and GPU memory cannot be guaranteed to be cryptographically erased.

## Actual validation

Chrome headless on Windows, local production build, 612 × 408 tiger documentation image:

| Rank | Label | Browser WASM score |
| --- | --- | ---: |
| 1 | tiger, Panthera tigris | 61.7% |
| 2 | tiger cat | 30.9% |
| 3 | tabby, tabby cat | 0.2% |
| 4 | lynx, catamount | 0.1% |
| 5 | Egyptian cat | 0.1% |

Observed first initialization about **1.7 s**, inference **0.08 s**, warm repeat **0.05 s**. These are local desktop observations, not mobile/network promises. Native reference preprocessing also ranked tiger first; numerical differences from canvas preprocessing are expected.

The full regression run, with two browser workers, observed WASM initialization **2.1 s** and inference **0.10 s**. Automatic selection also completed a real **WebGPU session**, with the same rounded top-five scores, initialization **2.0 s** and inference **1.52 s**. Headless acceleration may be software-backed; physical GPU speed was not certified. On this test system WebGPU was slower than WASM, so the CPU compatibility option is useful rather than assuming GPU always wins.

Validation passed: **44 unit tests**, **34 browser tests**, lint, standalone TypeScript check and production build. Desktop/mobile screenshots were inspected; the new tab wraps within the approved workspace. No brand tokens changed.

Final artifact verification confirmed all five model/config/runtime files match the manifest byte counts and SHA-256 hashes. After the final fallback-stage and stale-error guards, the five AI browser tests were rerun; observed cold WASM initialization varied up to 2.5 s and WebGPU inference ranged from 0.45 to 1.52 s across runs.

Automated coverage includes shared initialization, warm reuse, missing GPU, GPU initialization failure, GPU inference failure/fallback, failed-download retry, unsupported capabilities, standard full-vocabulary softmax, invalid output, stale-event rejection, actual browser inference, tab retention, reuse across images, download failure UI, replacement during download, and measured/predicted separation. Browser request inspection asserts same-origin GETs with no request bodies. Mobile viewport and desktop screenshots check wrapping/overflow. Existing Phase 2/3 and premium-loading regressions run alongside these tests.

## Browser support and remaining limits

Requires current browsers with WebAssembly SIMD, Workers, createImageBitmap and OffscreenCanvas; HTTPS or localhost is needed for WebGPU. WebGPU availability varies by browser, OS, hardware and policy. WASM remains the compatibility path. Chrome desktop is the tested environment; Safari/iOS, Firefox, physical Android devices, low-memory process termination and real offline-cache recovery have not been physically validated. A responsive mobile viewport test is not a mobile performance certification. Broader known-image fixtures and a quantization accuracy benchmark are recommended before considering a smaller artifact.

The dependency audit reports five existing high-severity advisories in the development ESLint/fast-glob/micromatch/braces chain; none are reported in the new AI production dependency tree. The suggested force-fix would downgrade the Next lint configuration, so no unrelated breaking dependency change was applied.

## Files and local verification

Added `src/ai/{types,engine,client,vision.worker}.ts`, `src/components/ai-vision.tsx`, model/runtime/license/manifest assets under `public/ai`, AI unit/browser tests and their fixture/provenance note, and this document. Modified Results tabs, additive AI CSS, package manifests, lint ignore for vendor runtime, and the existing keyboard End-tab expectation. No pixel-analysis or premium-loader algorithms were changed.

Run `npm install`, `npm run dev` and open http://127.0.0.1:3000. Select an image, Analyze image, open AI Vision, then Run AI Vision. Verification commands: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:browser -- --workers=2`.

No commit, push, remote initialization or deployment.
