# Phase 01 synthetic corpus

All files are generated locally, contain no personal images, and require no downloads. Rebuild with `npx tsx scripts/prepare-phase01-fixtures.mts` using installed Chrome. Canvas encoder bytes can differ across browser versions; expected decoded values and geometric patterns are fixed. Initial generation used Chrome 155.0.8059.85.

| Files | Purpose and expected behavior |
| --- | --- |
| `red.png` | 40 × 24 opaque red. RGB 255/0/0; luminance 0.2126; zero spread; one family. |
| `quadrants.jpg` | 40 × 24 JPEG without EXIF; TL black, TR white, BL gray 128, BR red. Native decoding succeeds; allow JPEG rounding. |
| `red.webp` | 40 × 24 WebP; decode and detect signature as WebP; lossy RGB may differ from source. |
| `orientation-1.jpg` … `orientation-8.jpg` | Same quadrant JPEG with each EXIF orientation. Synthetic camera/settings/date and invented GPS (12.5, -30.25). Dimensions 40 × 24 for 1–4; 24 × 40 for 5–8. Preview/maps transform once, including mirrors. GPS stays hidden until explicitly revealed. |
| `gray.png` | Uniform grayscale 128; luminance 0.21586050011389923 and zero spread. |
| `dark.png`, `bright.png` | Black/white endpoints; luminance 0/1, zero spread, finite outputs. |
| `low-contrast.png` | Equal gray 127/129 halves; average RGB 128; luminance spread rounds to 0.004. |
| `tiny.png` | One red pixel; all-pixels mode and 1:1 aspect ratio. |
| `large.png` | 4000 × 3000 opaque red; stratified sample mode, same color/luminance, maps bounded to 512 px. |
| `transparent.png` | Fully transparent PNG; preview allowed, analysis fails clearly. Partial-alpha coverage also has browser-generated fixtures in `accuracy.spec.ts`. |
| `صورة.photo.png`, `photo.jpg.png` | Copies of red PNG with non-ASCII and multiple-extension filenames. Signature detection, safe text rendering, correct RGB. |
| `over-limit.png` | Red PNG with IHDR dimensions mutated to 100,000 each. Intentionally invalid CRC/payload: reject the 10 billion-pixel header before preview allocation. Not a valid large photo. |
| `empty.png` | Zero bytes; reject as empty. |
| `malformed.png` | PNG signature only; reject as corrupted before decode. |
| `spoof.png` | Plain text with PNG name; reject as unsupported. |
| `unsupported.svg` | Synthetic SVG; reject without rendering. |

Additional deterministic cases live in tests rather than binary files: a valid PNG truncated after IHDR (real browser decode failure), PNG bytes with JPEG MIME, >20 MiB buffer, lossless/extended WebP header bitfields, invalid JPEG segment lengths, 256-level ramp with all 32 reference bin counts, checkerboards, alpha weighting, cancellation, repeated uploads, capability failures and worker timeout. Sources: `tests/reliability.test.ts`, `tests/pixels.test.ts`, `tests/accuracy.test.ts`, `tests/discoveries.test.ts`, and `tests/browser/*.spec.ts`.
