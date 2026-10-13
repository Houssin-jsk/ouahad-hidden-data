# Staged loading presentation — before Phase 4

## Timing logic

`src/loading/presentation.ts` owns the presentation independently of the worker. Its configurable defaults are:

```ts
MINIMUM_LOADING_MS = 6000;
PRESENTATION_REFRESH_MS = 80;
```

The six stage offsets and helper messages are defined in `PRESENTATION_STAGES` in the same file. Results are released when **both the genuine result is available and at least the minimum duration has elapsed since Analyze**. Fast results are buffered locally; their worker is terminated normally and their presentation continues. Work lasting longer than six seconds remains visible until its actual result arrives. There is no fixed 15-second wait or upper presentation deadline. Existing real decoding/worker failure timeouts remain intact, and errors exit immediately instead of being held for presentation.

The clock uses monotonic `performance.now()`. Updates advance smoothly but are capped by observed worker milestones. Palette/light share the existing `calculating` milestone; their numerical code is not split or slowed. The progress bar explicitly describes **result presentation**, with stage ordinals rather than invented computational percentages. It stays below completion until genuine results are ready and the minimum duration is satisfied. Timer throttling or a busy UI can make the visible handoff slightly later; it can never release early based on a presentation timer alone.

The live status reports actual decoding/sampling/statistics/metadata/map/encoding work. If the engine finishes early, it explicitly says **“Calculations ready · completing the presentation”** rather than pretending computation is still running. The highlighted stage and educational helper text then walk through the completed work. This minimum elapsed-time policy also applies if the user backgrounds the tab; returning to an already-finished analysis does not restart a fresh six-second wait.

## UX

The dedicated panel sits next to the preview, with the existing warm surfaces, editorial typography, blue active stage, green privacy dots and restrained orange accents. Reading image → Sampling native pixels → Extracting palette → Measuring luminance → Building detail map → Preparing results.

The central illustration now evolves through the selected image and actual computed artifacts: a thin reading sweep, a schematic sampling grid, real HEX palette bars, the real 32-bin luminance histogram and light map, the generated Sobel detail map, and a compact measured report assembly. The grid is explicitly schematic, not a claim to show the exact sampled coordinates. Before computed outputs are available, the illustration shows waiting states rather than fabricated swatches or histogram data. A uniform detail map stays black, with an explanation rather than invented contours.

The current stage is the main editorial heading, and a compact numbered rail replaces the long checklist. Scan/grid/reveal motions are subtle presentation cues. Results still appear with a short fade/settle transition. Reduced motion preserves gentle opacity changes and readable progression, disables moving sweeps and edge masks, and removes scale/translation; final result opacity returns to 1. No spinner is used as the main experience, and the old ruler illustration/styles were removed.

On activation the loading panel comes into view (mobile scrolls to its start; desktop scrolls only as needed). Reduced-motion scrolling is immediate. Programmatic focus enters the loading region; if the user stays there, the final handoff focuses the selected result tab and positions its row in the upper viewport. This prevents the loading scroll position from causing tablet page clamping when a shorter result tab is selected. Cancel restores the Analyze control. There is no focus trap, and replacement remains available in the preview controls.

## Cancellation and privacy

Cancel, replacement, errors and unmount stop the presentation timer and release its buffered result reference. Existing generation tokens also discard stale decode/worker messages. Map object URLs are created once genuine outputs are ready, used for the loading illustration, then reused for the final report. Cancellation of a buffered result revokes these URLs as well; existing revocation handles replacement/clear/unmount. Loading illustrations select only statistical and map fields, and never render GPS or camera metadata. There is no added upload, analytics, storage or server processing. The actual Phase 3 worker and all analytical calculations are unchanged. No new dependencies were added.

## Validation

Passed: 38 unit tests, 29 Chrome browser tests, ESLint, strict TypeScript and production build.

New deterministic clock tests verify exact six-second release for fast work, genuine completion at nine seconds for slow work, cancellation of buffered results, independent replacement timing and a custom 250ms setting. They also verify no completion while actual work is unfinished and no pending timers after cancellation/release.

New browser cases verify:

- A genuine tiny-image result becomes ready before the minimum but remains hidden until six seconds, with correct RGB values after release.
- An eight-second delayed **test-only transport** of a real worker result remains hidden at 6.5 seconds, with no premature completion. Production code contains no simulated delay in computation.
- Replacement after real computation finishes but before presentation ends discards the old result and starts a fresh minimum interval.
- Desktop/mobile layout, no overflow, cancellation after pending completion and a lighter reduced-motion variant.

All existing Phase 3 metadata, GPS privacy, map accuracy, replacement, native statistics, network and responsive regressions still pass. Browser expect/test deadlines were expanded to accommodate the requested minimum duration for workflows that analyze multiple images. Desktop/mobile screenshots were visually inspected. Browser coverage remains Chrome viewport emulation rather than physical devices or other engines.

The image-led redesign adds browser checks for sequential illustration views, actual blue/orange HEX swatches, normalized histogram shares, real detail-map URLs, early URL revocation on cancellation, and desktop/mobile palette/detail screenshots. Captioned waiting/unavailable states avoid pretending that an output has been produced.

## Files changed

Added across the loading work: `src/loading/presentation.ts`; `src/components/analysis-loading.tsx`, `loading-stages.tsx`, `loading-status.tsx`, `loading-illustration.tsx`; `tests/loading.test.ts`, `tests/browser/loading.spec.ts`, `tests/browser/loading-visuals.spec.ts`; this report.

Modified: `src/components/image-lab.tsx`, `src/app/globals.css`, `playwright.config.ts`, and `README.md`.

Replaced/removed: the previous `src/components/analysis-progress.tsx` and its unused styles. All work stays local. No commit, push or deployment was performed.
