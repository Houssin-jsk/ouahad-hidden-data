# Image processing progress

Current behavior as of 2026-10-24 supersedes the earlier six-second presentation experiment.

`src/loading/presentation.ts` separates display timing from the image worker. The public defaults are `MINIMUM_LOADING_MS = 0` and `PRESENTATION_REFRESH_MS = 80`. Completed results appear immediately. A nonzero minimum remains available for explicit experiments and is covered by deterministic clock tests; it is not used by the production workspace.

The six milestones describe opening the image, native-pixel sampling, palette grouping, luminance measurement, Sobel detail mapping and result preparation. Palette and luminance share the worker's calculating milestone because the validated engine combines their work. Short stages may pass between browser paints. The UI does not slow the engine or fabricate a percentage to make every stage visible. Metadata inspection has a separate actual-work status. A slow task stays pending until real completion, cancellation or an existing decode/worker timeout.

The current panel shows the selected image, a numbered stage rail, real worker status and cancellation. It never invents interim colors or maps. Historical illustration components are retained for the phase record but are not imported into the release workspace. Motion is disabled under reduced-motion preferences. The loader receives focus on activation; completion focuses the selected result tab. Results are not hidden behind an artificial six-second wait.

Cancellation, replacement, errors and unmount clear pending timers, terminate work and invalidate its generation. Bitmap/sample buffers and temporary blob URLs are released by the existing lifecycle. Map URLs are created from real final outputs and revoked on replacement/clear/unmount. Normal image processing remains entirely browser-local; the separate read-only AI availability check carries no image data.

`tests/loading.test.ts` covers immediate production release, a deliberately configured minimum, slow genuine work, cancellation and replacement without leaked timers. Browser loading tests hold delivery of a genuine worker result in test code only, allowing deterministic examination of transient UI without adding production delays. Pixel, map, metadata, network and memory-cleanup regressions remain in the full suite. Current counts and release evidence are in [Release readiness](RELEASE-READINESS.md).
