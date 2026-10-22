# Phase 02 analytics design

The Phase 01 audit, handoff, fixes and verification were read before implementation. This phase adds **weighted luminance quantiles** and **encoded-RGB HSV saturation distribution** to the existing browser worker, then explains them in the Light and Color tabs. It does not change the verified palette, histogram, RGB/luminance means, variance, native sampling, metadata, Image DNA, ownership/cancellation, map algorithms or release/research separation. No new runtime dependency is needed.

## Contract and applicability

`AnalysisResult.analytics?: ImageAnalytics` is additive. Older consumers can ignore it; newer consumers display an explicit unavailable message when absent. The existing worker message protocol remains `{stage}`, then `{result}` or `{error}`. Types are in `src/analysis/insight-types.ts`; implementation in `src/analysis/insights.ts`.

```text
ImageAnalytics
  schemaVersion: "1.0.0"
  tonal: TonalInsight | UnavailableInsight
  color: ColorInsight | UnavailableInsight

Available insight
  id: "tonal-distribution" | "color-distribution"
  status: "available"
  method: { id, version: "1.0.0", description }
  basis: InsightBasis
  measurements: named, unit-tagged finite quantities
  observation: deterministic measured description
  interpretation: { ruleId, classification: "product-defined-description", text }
  limitations: string[]

Unavailable insight
  id, method, status: "unavailable", basis: null
  reason: { code, message }
  (no numerical measurements or interpretation)
```

`Quantity<Unit>` carries a numeric value and a literal unit. Tonal quantities use `relative-luminance` (dimensionless linear-sRGB relative luminance on 0–1); saturation uses `hsv-saturation` (dimensionless HSV S on 0–1); shares use `share` (dimensionless fraction, shown as percent); opacity-weighted source area uses `pixel-equivalents`. These are not radiometric measurements of the photographed scene.

`InsightBasis` records ID `native-srgb-v1`, representation `browser-decoded-8bit-srgb`, full/sample mode, source-pixel count, native sample count, nontransparent sample count, `alpha-byte-times-source-cell-area` weighting, mean-alpha coverage, opacity-weighted source pixel-equivalents and an approximation flag. Each available insight carries this basis. Pixel-equivalents are weighted source area, **not statistical effective sample size** or an opaque-pixel count. In sampled mode both coverage and source-area equivalents are estimates under the existing cell sampling.

Objects contain only plain strings, booleans, finite numbers, arrays and objects/null. No canvas, function, Date, NaN, Infinity, typed array, user filename, private EXIF or model confidence is in this analytics payload. Structured-clone and JSON round-trip tests verify the contract. Method descriptions are copied for each result to avoid shared mutable method state between runs.

Rules for availability:

| Condition | Behavior |
| --- | --- |
| Missing `analytics` on legacy result | UI says insights were not produced; original measurements remain available. Never invent zero-valued insights. |
| Empty/misaligned/over-budget sample, invalid cell weights or source dimensions, source-area mismatch | Both insights unavailable: `invalid-input`. |
| No visible weight | `no-visible-pixels`. Sampled case explicitly allows that sparse visible content may have been missed. The primary worker still preserves Phase 01's fully-transparent analysis error before it reaches this optional layer. |
| Missing/inconsistent existing statistics | `inconsistent-statistics`. Counts, coverage and tonal shares must agree with the same sample. No attempt to reinterpret a mismatched result. |
| Unexpected optional calculation exception | Worker catches it as `calculation-failed`; valid Phase 01 measurements still return. The message cannot echo image/metadata/parser contents. |
| Uniform/one-pixel/grayscale/black data | Valid, not unavailable. A percentile interval may be zero; HSV black is defined as zero saturation. No quality or semantic inference is added. |
| Valid but sampled/partial-alpha data | Available with explicit mode, weighting, coverage and limitations; no numerical confidence estimate. |

## Shared representation and weighting

Use the **same** native sampled RGBA buffer already allocated by `sampleBitmap`. Each point represents its source cell area `a_i`; alpha byte is `A_i` in 0…255. Weight `w_i = A_i × a_i`. In full mode `a_i = 1`. Zero alpha contributes no measurements. Partial alpha weights the uncomposited decoded color; no background is assumed. Source cell areas must sum to the declared source-pixel count; full mode requires one unit-area sample per source pixel. Maximum source size is 40 MP and sample length is at most 262,144. The 20 MiB encoded preflight remains upstream and unchanged.

`W = Σw_i`, coverage `W / (255Σa_i)`, opacity-weighted pixel-equivalents `W / 255`. All proportions use this same denominator. Coverage is not inferred from the count of nontransparent pixels.

## Tonal method: weighted-luminance-cdf / 1.0.0

Reuse the existing `relativeLuminance` function. For each encoded channel `c = byte/255`, linearize with `c/12.92` when `c≤0.04045`, otherwise `((c+0.055)/1.055)^2.4`. Relative luminance is `L = 0.2126R_linear + 0.7152G_linear + 0.0722B_linear`.

The weighted empirical CDF is `F(t) = Σ(w_i for L_i≤t) / W`. Quantile definition is **inverse empirical CDF**: `Q(p) = min observed L_i with F(L_i)≥p`, with p=0 defined as the observed minimum. Implemented probabilities are .05, .50, .95. There is no bin approximation and no interpolation between colors/light levels. With two equally weighted black/white pixels, the weighted median is **0**, not .5; that is the chosen explicit statistical definition, not an error in the original mean.

Returned quantities: P05, median, P95, P95−P05 span and the existing dark/midtone/bright shares. A uniform-valued sample returns its single value directly after validation. Otherwise an index vector is sorted by luminance (ties by original index), retaining weight association; a single cumulative scan returns quantiles. Values/weights are not modified by the quantile helper. Scratch arrays are zeroed after use.

Interpretation rule `largest-tonal-band-v1` compares existing shares. Bands remain exactly Phase 01's product-defined boundaries: dark L<.2, midtone .2≤L<.7, bright L≥.7. A leading tie is reported when shares differ from the maximum by at most 1e−12, explicitly qualified as calculation precision. Rounded percentages never decide a winner. Observation gives the measured median and 5th–95th percentile interval. The interval does not necessarily contain exactly 90% of discrete mass: ties can contain more. It helps distinguish an average from its distribution, but does not establish modality/skew, scene exposure correctness, source clipping or quality.

Independent references, calculated before assertions:

| Input | P05 / median / P95 |
| --- | --- |
| Uniform black / white | 0/0/0 and 1/1/1 |
| Uniform sRGB 128 | 0.21586050011389926 for all three |
| Uniform R/G/B primaries | .2126 / .7152 / .0722 respectively for every quantile |
| Equal 256-level encoded grayscale ramp | Indices ceil(.05×256)−1=12, ceil(.5×256)−1=127, ceil(.95×256)−1=243. L values .003676507324047436 / .21223075741405523 / .8962693533742664. |
| Values 0,.2,.8,1 with weights 1,2,1,6 | CDF .1,.3,.4,1; median=1, Q(.3)=.2, Q(.4)=.8. |

## Color method: weighted-hsv-saturation / 1.0.0

For **encoded sRGB** channels, let M=max(R,G,B), m=min(R,G,B). HSV `S=(M−m)/M` for M>0, otherwise S=0. Scaling byte channels to 0–1 cancels in this ratio. This is HSV saturation, not HSL saturation or perceptual chroma/colorfulness.

Mean saturation is `Σw_iS_i/W`. Product-defined concentration bands are low S≤.10, intermediate .10<S<.60, strong S≥.60. They partition all visible weight and their shares sum to one. Integer comparisons `(M−m)×10≤M` and `(M−m)×5≥M×3` implement exact .10/.60 boundaries without division-rounding classification drift. Black is explicitly low by convention.

Interpretation rule `saturation-band-comparison-v1` compares **integer** low/strong weights. It reports which has more weighted area or an equal split, including the intermediate share in the equal case. It does not declare the entire image dominated by a band when the intermediate band is larger. The existing palette table already explains family shares; no duplicate palette algorithm or added palette score is justified.

References/counterexamples: grayscale S=0; RGB primaries S=1; (100,90,90) S=.1 is low, (100,89,90) S=.11 intermediate, (100,40,40) S=.6 strong, (100,41,41) S=.59 intermediate. Together these four equally weighted pixels have mean S=.35, shares .25/.50/.25. Very dark (1,0,0) still has S=1 despite low luminance. Equal source-cell/alpha weights of red and gray give mean S=.5 even when their raw sample counts or cell areas differ. Saturation cannot establish mood, style, semantics, perceptual strength or correctness.

## Spatial explanations and excluded metrics

Keep fixed-scale light-map luminance and independently normalized Sobel detail maps unchanged. Explain that strongest-in-this-map is relative to each image, and that texture, noise and resizing can cause edges. Neither map proves sharp focus, image quality, retouching or authenticity. Comparison controls remain usable. No new spatial scalar is introduced because a calibrated quality/authenticity decision does not follow from these measurements.

Excluded deliberately: universal exposure/quality/sharpness scores, HDR/sensor clipping detection from rendered pixels, skew/modality labels from three quantiles, a second clustering algorithm, perceptual colorfulness claims from HSV, numerical statistical confidence without an estimator, scene/mood text, AI/model inference, server processing, exports and new routes. Synthetic references verify implementation and definitions, **not universal scientific validity** of descriptive bands.

## Cost and UI placement

One additional pass over at most 262,144 existing samples computes luminance values, HSV accumulators and cross-checks tonal shares. Quantiles are O(n log n) worst case; uniform values skip sorting. Explicit scratch storage is at most 4 MiB values/weights plus 1 MiB index vector (native sort may allocate implementation-dependent temporary storage). No additional image decode, full-resolution canvas, image sampling or model initialization occurs. Worker cancellation still terminates the worker and releases its owned sample/bitmap.

The two insights sit once each in the existing Light/Color tabs, with Observation / Meaning / Limitation and keyboard-operable native details for Method and evidence. Sampling and opacity weighting are visible. Detailed method IDs, versions, numeric evidence/units, source basis and limitations are progressively disclosed. Overview/Image DNA and Metadata/GPS do not repeat these insights. No fifth tab, new page, decorative graph, animation or redesigned dashboard is added.
