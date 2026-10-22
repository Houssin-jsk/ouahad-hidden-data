# Hidden Data — Phase 02 handoff

Completion status: **PHASE 02: PASS**. Final verification: **78/78 unit tests**, **50/50 production Chrome browser tests**, zero failures/skips/flaky browser cases; production build, TypeScript, lint, privacy assertions and research isolation pass.

Measured impact: added insight functions take median 39.927/103.718/116.500 ms for 262,144-pixel uniform/ramp/texture buffers in the documented Node benchmark. Final browser worker wall times span 54.9–417.2 ms for the six recorded fixtures; visible results remain governed by the preserved six-second presentation. Aggregate emitted JS grows by 13,007 raw / 5,259 locally gzipped bytes versus Phase 01. Phase 02 initial JS resource bytes were measured separately; Phase 01 has no recorded initial-transfer or worker-time baseline, so those historical deltas are not claimed.

## Product value

Light now explains the weighted median and 5th–95th percentile interval alongside the existing histogram/mean/spread. Color explains HSV saturation concentration alongside the unchanged palette/RGB statistics. Users can distinguish measured quantities, product-defined descriptive bands, full versus sampled evidence, transparent weighting and conclusions that do not follow. Each insight has Observation / Meaning / Limitation with a keyboard-operable Method and evidence disclosure.

Spatial maps explicitly describe per-image detail normalization and the roles of texture/noise/resizing. They make no focus, authenticity, retouching or quality verdict. Screenshot testing also uncovered and repaired wide-preview overlap/control clipping; original and comparison images now share a constrained frame. No fifth tab, new route, model, server request, dependency, export, account or database was added.

## Stable analytics interfaces for Phase 03

| Interface | Contract to preserve |
| --- | --- |
| `AnalysisResult.analytics?: ImageAnalytics` in `src/analysis/types.ts` | Additive optional payload. Preserve original result fields and missing-analytics fallback. |
| `src/analysis/insight-types.ts` | Schema `1.0.0`; stable IDs `tonal-distribution`, `color-distribution`. Available/unavailable discriminant; versioned method; literal quantity units; full source basis; descriptive rule ID; observation/meaning/limitations. No model confidence fields. |
| `analyzeEvidence(pixels, areas, statistics, sampling)` | Pure TypeScript over the existing bounded 8-bit sRGB native sample. Alpha byte × original source-cell area is the denominator. Counts/coverage/tonal shares cross-check existing statistics; invalid/missing/inapplicable inputs return explicit unavailable objects. |
| `weightedQuantiles(values, weights, probabilities)` | Inverse weighted empirical CDF, minimum observed value with cumulative mass ≥p; p=0 minimum, p=1 maximum. No interpolation, no histogram-bin approximation. Values/weights remain unmodified; positive safe-integer weights and bounded length required. |
| `weighted-luminance-cdf` / `1.0.0` | P05, lower inverse-CDF median, P95, P95−P05 and existing <.2/.2–<.7/≥.7 shares. Do not silently change to an averaged/interpolated median. |
| `weighted-hsv-saturation` / `1.0.0` | Encoded-RGB S=(max−min)/max; black S=0. Mean and S≤.10 / .10<S<.60 / S≥.60 band shares. Do not confuse with HSL or perceptual chroma. |
| `InsightBasis` | `native-srgb-v1`, mode, source/sample/nontransparent counts, mean-alpha coverage, opacity-weighted source pixel-equivalents and approximation flag. Pixel-equivalents are not effective statistical sample size. |
| `unavailableAnalytics(code, message)` | Plain safe fallback without measurements. Do not convert unavailable to zero or silently omit core errors. Optional failure cannot discard valid Phase 01 results. |
| `src/analysis/analysis.worker.ts` | Existing stage/result/error protocol and transferable ImageBitmap ownership. New calculation stays in calculating stage and uses the same sample, not a second decode/canvas. |
| `src/components/evidence-insight.tsx` | Stateless safe text renderer. Missing result gets unavailable explanation; methodology remains progressive disclosure. Keep four tabs and original numerical displays. |

Definitions and exact independent references are in [PHASE-02-DESIGN.md](PHASE-02-DESIGN.md). Modified files and preservation decisions are in [PHASE-02-IMPLEMENTATION.md](PHASE-02-IMPLEMENTATION.md). Commands, counts, timings, release/privacy evidence and remaining limits are in [PHASE-02-VERIFICATION.md](PHASE-02-VERIFICATION.md).

## Boundaries and nonblocking limitations

- Quantiles are exact only for the weighted sample. Source estimates can miss rare colors/tails/sparse visible details; no representativeness guarantee or confidence interval is provided. Discrete quantiles/ties can make a zero span or a lower-endpoint median valid.
- HSV saturation and the .10/.60 descriptive bands are not perceptual or universally validated neutral/vivid standards. A nearly black red may have S=1. Neither colors nor histograms prove exposure correctness, mood, photographic style or scene content.
- Browser sRGB decode, color management, 8-bit alpha rounding and animated-frame timing remain Phase 01 limitations. No native heap/physical-mobile/Safari/Firefox verification is claimed. Desktop Chrome viewport emulation and a Node microbenchmark have explicit bounds in the evidence.
- Existing metadata is as recorded, not independently authenticated. GPS stays local and hidden until explicit reveal. Research AI/model provenance/inference limits and development-only braces audit advisory chain remain documented Phase 01 nonblockers, not production analytics capabilities.
- New analytical work may extend pure modules and the versioned payload, but must preserve baseline statistics, sample weights, field units, cancellation/cleanup and privacy. Bump method/rule/schema versions when semantics change rather than silently reusing IDs.

All pre-existing uncommitted work is preserved. No commit, push, merge or deployment occurred. The live Vercel deployment was not modified. Phase 03 and Phase 04 were not started.
