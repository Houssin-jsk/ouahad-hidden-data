# Phase 3 — Adaptive workspace and hidden details

## Scrolling audit and layout

Previously `.lab` used `align-items: stretch`, so the longer results panel stretched the preview column to the same height. The preview itself stayed 250px high, leaving unused space below its controls. The introductory headline also retained its welcome-page footprint after selection. Fixed minimum result heights prolonged short tabs.

The selected-image workspace now uses independent, content-sized panels with `align-items: start`, a compact introduction and an aspect-preserving, viewport-bounded desktop preview. A ResizeObserver permits sticky positioning only above 820px and only when the entire left panel fits within viewport height minus its margins. Taller panels remain in normal flow. The results use natural content height and the existing keyboard-accessible tab row. No inner results scroller, hidden overflow, forced viewport-height dashboard or remembered tallest-tab spacer is used.

Mobile and tablet layouts stack naturally, disable sticky positioning and remove preview height caps. The normal visible-tab click keeps the page position in tests; keyboard navigation retains focus. At the document bottom, the browser can necessarily clamp scroll position if a shorter tab reduces total document height. This normal browser behavior is preferable to artificially tall blank panels or nested scrolling; selecting an off-screen tab by keyboard/automation also legitimately brings the control into view.

The approved root color tokens, official logos and editorial fonts are unchanged. CSS modifications concern workspace layout and the new controls only.

## Development indicator diagnosis

The reported red “1 Issue” could not be reproduced. A fresh installed Chrome session at `http://127.0.0.1:3000/` showed no issue text, console errors, console warnings or uncaught page errors. A complete development flow (synthetic PNG → analysis → Metadata tab → Detail map) likewise reported zero browser errors/warnings. The computer-use inventory exposed no existing in-app browser tabs despite the ambient tab snapshot, so that specific session's issue contents could not be inspected.

No cause was invented, and no `devIndicators` setting, diagnostic suppression, unsafe origin allowance or CSS hiding was added. A reproducible issue message/stack from that specific session would be needed to identify its root cause.

## Local metadata discovery

ExifReader 4.50.0 is loaded in the worker. Only a local ArrayBuffer is passed to the library; its URL/file-path loading APIs are never called. The parser uses an allowlist for EXIF camera manufacturer/model, capture time/timezone offset, exposure, aperture, ISO, focal length, orientation, software and GPS tags, plus PNG Software text. Decompressed metadata is bounded to 2 MiB. Metadata input buffers are zeroed after parsing.

Metadata has three states: available, missing supported tags, or parser error. A metadata error does not invalidate successful pixel statistics. Values are escaped by React, bounded to 256 characters and presented as recorded, without asserting authenticity or assuming a timezone.

GPS fields are excluded from the normal field list. Coordinates are never rendered by default, placed in links, geocoded, sent anywhere or logged. A warning explains the on-screen privacy implication, followed by an explicit reveal button and a hide button. Changing tabs/remounting the metadata component resets disclosure; replacing the image clears the old result. Detected but invalid coordinates receive a separate message. Camera/metadata strings are never written to console or analytics by application code. The library may emit generic format/decompression diagnostics, without logging tag values.

The maintained library's [documentation](https://github.com/mattiasw/ExifReader) describes its grouped tag parsing. Proprietary maker notes, thumbnails, arbitrary XMP/IPTC fields and metadata authenticity verification are outside this phase.

## Spatial maps

Maps are separate from the Phase 2 statistics. The original `pixels.ts` and `sampling.ts` files were verified byte-for-byte unchanged by SHA-256; maps never feed resized data back into those calculations.

- **Resolution:** at most 512 pixels on the longest map edge, without enlarging small images. The browser-oriented bitmap is drawn at that bounded size. The image's aspect ratio is preserved within integer pixel rounding. Large-image maps therefore lose fine spatial detail and may blend small features.
- **Light:** use the same linearized sRGB relative luminance formula as Phase 2. Grayscale byte is `round(255 × L)` with fixed endpoints black = 0 and white = 1. There is no per-image normalization. This is a visualization of computed luminance, not exposure or an HDR measurement.
- **Detail:** apply the standard 3×3 horizontal/vertical [Sobel kernels](https://homepages.inf.ed.ac.uk/rbf/HIPR2/sobel.htm) to linear luminance, using Euclidean gradient magnitude. Boundaries replicate the nearest pixel. Pairwise differences eliminate floating cancellation artifacts on uniform images. Display strength is divided by the maximum gradient in that image; an all-zero gradient remains black. White means strongest gradient in that map, not an absolute sharpness/quality value. Images cannot be compared for quality using these separately normalized displays.
- **Transparency:** map alpha is preserved. Fully transparent RGB does not produce visible light. A Sobel kernel touching a fully transparent pixel is excluded so hidden RGB/alpha silhouettes do not become claimed image detail. Partially transparent pixels use uncomposited luminance and keep their original display opacity. Transparent edges can consequently have a one-pixel excluded neighborhood.
- **Interaction:** Original, Light, Detail and a keyboard/touch-accessible original/detail comparison slider. Maps and original use aligned, aspect-preserving image layers. On-screen captions explain endpoints, normalization, resolution and limitations. No composition/subject/location interpretation or universal score is produced.

Worker-produced PNG blobs use temporary object URLs. Old URLs are revoked on replacement, clearing or unmount. Map arrays and canvases are cleared, and ImageBitmaps closed. If maps fail, successful statistics and metadata remain available with a map error message.

## Genuine processing stages

Stages reflect actual operations: decoding; native pixel readback; statistics; metadata parsing; map generation; PNG preparation. The main thread handles asynchronous decoding and lightweight presentation. Native sampling, statistics, metadata, Sobel/luminance calculations and PNG encoding run in the worker. Each stage message is emitted immediately before its work, and completion clears the progress UI. There are no percentages, artificial delays or minimum loading durations; very quick stages may finish between visible frames.

Cancel terminates the worker and retains the selected preview for a retry. Replacement cancels old work, revokes URLs and advances the generation token; late decoding/results cannot overwrite the latest image. Errors and the existing 20-second worker timeout return to a usable input state. Progress uses an ordered stage list and a live status, with existing reduced-motion behavior preserved.

## Verification

Passed: **33 unit tests, 20 Chrome browser tests, ESLint, strict TypeScript and production build**. Production dependency audit reports zero vulnerabilities.

New unit cases verify synthetic camera/exposure/ISO/orientation/GPS tags, missing metadata versus parser errors, uniform light/detail maps, all 256 uniform gray values and primary colors (zero detail), exact black/white step edges, horizontal gradients, transparent/partial-alpha behavior, valid dimensions and malformed buffers.

New browser cases verify:

- Synthetic JPEG with actual EXIF APP1 data; decoded 90° orientation and aligned map dimensions.
- GPS absent from initial DOM, explicit warning/reveal/hide and removal on replacement.
- Missing metadata and PNG Software text discovery.
- Actual output PNG pixels for light and detail maps, comparison slider clipping and revoked map URLs.
- Genuine worker stage messages, a slow textured-image cancellation, quick-image completion and replacement without stale results.
- Desktop fit-based sticky preview, normal-flow mobile/tablet layouts, natural result heights, visible-tab scrolling, End-key navigation and no horizontal overflow.
- No image/metadata upload or external network requests during the monitored discovery flow, and no browser errors/warnings for the synthetic metadata flow.

All previous Phase 2 mathematical, validation, privacy and six-width responsive tests still pass (360, 390, 430, 768, 1366 and 1440px; prior 320px overflow check also remains). Desktop and mobile screenshots were visually inspected.

## Limits and files

Browser validation uses installed Chrome and viewport emulation, not physical mobile hardware or other engines. Bounded maps are spatial approximations; Sobel responds to noise/texture as well as boundaries. Native decode still requires original-image memory and the existing file/pixel limits remain. Compressed/unsupported metadata may be unavailable; metadata can be absent, stripped, spoofed or malformed. The earlier development-only ESLint dependency advisory remains. No deployment, commit, push or GitHub remote was created.

Added: `src/analysis/discovery-types.ts`, `metadata.ts`, `maps.ts`; `src/components/analysis-progress.tsx`, `metadata-results.tsx`, `spatial-preview.tsx`; `tests/discoveries.test.ts`, `tests/fixtures/exif.ts`, `tests/browser/discoveries.spec.ts`; this report.

Modified: `src/analysis/types.ts`, `analysis.worker.ts`; `src/components/image-lab.tsx`, `results.tsx`; `src/app/globals.css`; `package.json`, `package-lock.json`, and `README.md`. The core Phase 2 arithmetic and sampler are unchanged.
