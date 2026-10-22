# Phase 02 implementation

This task preserves all pre-existing uncommitted Phase 01 and research work. Changes below are specific to Phase 02; package dependencies, deployment configuration, research code and prior phase evidence were not modified by this phase.

| Path | Implemented behavior |
| --- | --- |
| `src/analysis/insight-types.ts` | Plain serializable discriminated available/unavailable insight contract, versioned methods, literal units, source weighting/coverage and descriptive rule IDs. |
| `src/analysis/insights.ts` | Pure bounded weighted empirical quantiles, encoded-RGB HSV saturation distribution, deterministic descriptions, explicit input/statistics validation and unavailable states. Includes uniform quantile fast path, scratch cleanup and independent copies of method metadata. |
| `src/analysis/types.ts` | Additive optional `AnalysisResult.analytics`; all prior result fields retained. |
| `src/analysis/analysis.worker.ts` | Calculate evidence from the existing native sample immediately after unchanged pixel statistics. Catch optional insight failures without discarding core statistics. Same stage/message/transfer/cleanup protocol. |
| `src/components/evidence-insight.tsx` | Stateless editorial insight renderer. Missing/invalid insights are unavailable, not zero measurements. Native details/summary discloses method/version, structured evidence and source basis with units; plain React text rendering. |
| `src/components/results.tsx` | One Color insight and one Light insight inside existing four tabs. Preserve old result measurements, clipboard, navigation, Image DNA and metadata. |
| `src/components/spatial-preview.tsx` | Clarify texture/noise/resizing effects and why map responses cannot establish focus/retouching/authenticity/quality. Algorithms and slider unchanged. |
| `src/app/globals.css` | Small scoped editorial typography/divider/evidence-list rules using the existing color tokens. Repair verified wide-preview overflow by giving its frame a definite 100% width; retain at least 68px for the 44px clear control plus 12px insets on mobile. Original/comparison images share an absolute, contained frame. No new animation, layout framework or visual redesign. |
| `tests/insights.test.ts` | 18 new unit tests: independent references, weighting/CDF definitions, exact boundaries, counterexamples, finite/unavailable/serialization/input ownership/legacy rendering. |
| `tests/browser/phase02.spec.ts` | Six additional real production browser tests, including 320/768/1440 widths, keyboard methodology, actual worker values, alpha, cancellation/replacement, local-only traffic, legacy missing analytics, sampled mode and worker/presentation timing. |
| `scripts/benchmark-phase02.mts` | Reproducible seven-iteration pure-function benchmark on unchanged Phase 01 statistics versus insights and combined calculations. No canvas/presentation time conflation. |
| `scripts/record-phase02-evidence.mjs` | Summarize actual final browser output, hardware/timings/initial resource measurements, aggregate chunk deltas, release scan, screenshots and unchanged Phase 01 fixture hashes. |
| `docs/phase-02/` | Design, implementation, verification, handoff and actual evidence. |
| `README.md` | Link the new analytics handoff alongside the preserved Phase 01 reliability history. |

## Preserved contracts

No edits to `files.ts`, `sampling.ts`, `pixels.ts`, `dna.ts`, `metadata.ts`, `maps.ts`, loading logic, lifecycle component, input limits, original tests or research route/configuration were needed for Phase 02. Existing native decoded orientation, alpha × source-cell-area weights and deterministic palette remain the authoritative base. New results are optional and additive; old consumers and legacy payloads remain usable.

The insight layer cannot delay the worker by the six-second presentation minimum: that existing UI mechanism remains separate. The analysis worker still owns transferred ImageBitmap, clears sample/map/metadata buffers and closes resources. The existing generation token, AbortController, timeout and URL revocation paths remain intact. No processing moves to a server. No new HTTP call, storage write, third-party script or runtime package was introduced.

Screenshot inspection exposed a pre-existing aspect-ratio/min-height interaction with a very wide 256×32 ramp: the desktop preview's automatic width extended over results despite no document-level overflow, blocking the clear control after scrolling. Mobile's zero minimum height also clipped the 44px control. The focused frame repair above is justified by that concrete input. New browser assertions check preview-to-workspace bounds, full control containment and identical original/compare overlay boxes, beyond a document scroll-width check. `evidence/wide-preview-before-fix.png` retains the observed failure; final screenshots document the repaired layout. Map pixels and numerical algorithms are unchanged.

## UI and accessibility review

Applied the Vercel React checklist to the changed components: static explicit imports; algorithm only in the worker; type-only client imports of the contract; a stateless renderer with no derived-state effect; no listener or timer additions; stable list keys; native disclosure interaction; existing focus styles and tab semantics; text uses existing contrast tokens. Computed data is formatted during render only for a small number of fields, with no sort/canvas/scan on the main thread. Tests exercise keyboard activation, collapsed/expanded evidence and wrapping at 320–1440 px.

Observation text states values; Meaning uses named descriptive rules; Limitation explains what does not follow. The sample basis remains visible and full details describe count/coverage. Percent values are measured area proportions, not confidence. Methods/versions remain in disclosure because they help users trace a result rather than cluttering the default reading view.

## Limits and decisions

Quantiles are exact for the weighted **sample**, approximate for a sampled source. Small or uniform inputs remain valid and do not imply a well-characterized scene. Discrete median deliberately selects an observed lower endpoint when cumulative mass hits 50%; it does not use the average of middle observations. Zero-width percentile span is allowed, not a quality verdict. Tail events and sample extrema may be missed; no confidence interval/representativeness claim is added.

HSV saturation is explicit encoded-RGB geometry, with black-zero convention and product-defined .10/.60 bands. Dark red is a counterexample to treating saturation as perceived vividness or brightness. Palette cluster means/proportions are unchanged. Existing Sobel normalization is not upgraded into a sharpness/forensic measure. Metadata remains as recorded, not evidence of genuine dates/locations. Research remains isolated and unevaluated for this product scope.

No new binary fixture was necessary: the 25 synthetic Phase 01 files are unchanged, while new deterministic arrays and browser canvas patterns provide the ramp, saturation/alpha/boundary/CDF references. See the design and verification documents for all reference definitions and actual results. No commit, push, merge or deployment was performed.
