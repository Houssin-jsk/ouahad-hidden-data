# Phase 04 handoff

Follow-up: the [Cloud AI discoverability correction](cloud-ai-discoverability/HANDOFF.md) supersedes the collapsed AI entry point and verification totals below. This document retains the original Phase 04 evidence.

Verified 2026-10-23. Base commit: `465a451`. Frontend product refinement is complete; the local production artifact is ready for owner review and deployment authorization.

| Exit gate            | Result                                                   |
| -------------------- | -------------------------------------------------------- |
| Product UX           | PASS — internal product review and functional acceptance |
| Visual consistency   | PASS                                                     |
| Mobile readiness     | PASS — viewport verification                             |
| Accessibility        | PASS — automated, semantic and keyboard checks           |
| Technical regression | PASS                                                     |
| Deployment readiness | READY — filtered clean-checkout build reproduced         |

These verdicts apply to the tested scope below. They do not claim physical-device, human usability or live screen-reader verification.

## What changed for users

| Before                                                                      | After and practical benefit                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic story slogan, repeated promises, public phase and experiment labels | A clear color/light proposition, short selection guidance and useful three-step workflow. Development labels are removed from the rendered product; historical evidence is retained.                    |
| One dense Image DNA paragraph combining unrelated numbers                   | Leading color family, measured light character and meaningful transparency, with dimensions, proportions, size and format nearby. The original exact summary remains in Technical details.              |
| Individual swatch copying only                                              | Individual HEX, whole-palette and usable CSS-variable copying, visible confirmation and selectable manual text when clipboard permission is unavailable. Export preserves measured colors and order.    |
| Light/detail buttons competing with the original image                      | Original preview first; optional “Explore light & detail” beneath it, with real comparison slider, concise interpretation and full technical caveats. Closing exploration restores the original.        |
| Detailed numerical distributions dominating exploration                     | Color, Light and Metadata remain direct tabs. Means, spread, ranges, coverage, sampling, distribution evidence and formulas remain accessible through disclosures.                                      |
| A six-second minimum and six staged loading scenes                          | Genuine worker stages with the selected image; results release on actual completion. Cancellation, stale-result rejection and blob cleanup remain verified. Historical illustration source is retained. |
| Small or inconsistent controls and motion                                   | Consistent 44 px primary controls and disclosure targets, keyboard tabs, focus transfer to results, ordered workflow semantics, reduced-motion animation removal and stronger secondary text contrast.  |

Information architecture: **Overview essentials → Color / Light / Metadata exploration → optional maps and exact technical evidence**. The warm coffee canvas, blue/green/amber accents, editorial serif, logo and OUAHAD SPACE attribution are preserved. No dependencies were added or upgraded.

Cloud AI stays a separate invitation-only disclosure, explicitly experimental, restricted and off by default. Existing consent, eligibility, privacy terms and uncertainty copy remain intact. No cloud activation, live inference, remote D1 operation, credential, environment, quota, billing or owner-setting change was performed. All validated pixel calculations and metadata/GPS handling are unchanged.

## Actual visual evidence

Baseline: [desktop landing](evidence/before-desktop.png), [desktop results](evidence/before-results-desktop.png), [390 px results](evidence/before-results-mobile.png), [read-only public production landing](evidence/before-live.png).

Final screenshots, captured from the filtered production checkout and visually inspected:

[welcome-320](evidence/after-welcome-320.png) · [overview-320](evidence/after-overview-320.png) · [color-320](evidence/after-color-320.png) · [overview-375](evidence/after-overview-375.png) · [welcome-390](evidence/after-welcome-390.png) · [overview-390](evidence/after-overview-390.png) · [light-390](evidence/after-light-390.png) · [overview-430](evidence/after-overview-430.png) · [overview-768](evidence/after-overview-768.png) · [welcome-1280](evidence/after-welcome-1280.png) · [overview-1280](evidence/after-overview-1280.png) · [color-1280](evidence/after-color-1280.png) · [maps-1280](evidence/after-maps-1280.png) · [overview-1440](evidence/after-overview-1440.png)

The seven widths are 320, 375, 390, 430, 768, 1280 and 1440 px. No horizontal overflow or clipped controls was observed. Screenshots use the existing CC0 landscape fixture by Karthika Manikandan; provenance is retained in [the fixture README](../../tests/fixtures/discovery/README.md). No user image is stored in this evidence.

On unthrottled localhost Chrome 156.0.8078.47, this single fixture changed from **6512 ms** before to **403 ms** at 1280 px after; the seven final observations ranged **403–911 ms**. These are individual analyze-to-visible observations, including browser/test scheduling, not a controlled device benchmark. The artificial minimum is zero. Initial same-origin JavaScript encoded response bodies totaled **161,101 bytes** in the separate recorded browser performance check; this is not total build size.

## Fresh verification

| Command / check                                            | Result                                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:all`                                         | 148 passed; 0 failed / skipped, including research unit regressions                                                                |
| `npm run test:browser -- --workers=2 --reporter=json`      | 67 passed; 0 failed / skipped / flaky, production Chrome                                                                           |
| `npm run typecheck`                                        | PASS — strict full project                                                                                                         |
| `npm run lint`                                             | PASS                                                                                                                               |
| `npm run build`                                            | PASS — workspace and filtered checkout                                                                                             |
| `npm run typecheck:production` in filtered checkout        | PASS — 54 local files, no ignored transitive imports                                                                               |
| `node scripts/verify-release.mjs` via both postbuild hooks | PASS — 124 output/trace files; no model assets, companion runtime or research routes                                               |
| `npm audit --omit=dev --json`                              | 0 production vulnerabilities                                                                                                       |
| axe-core 4.14.0, WCAG A/AA rule tags                       | 10 scans, 0 violations: landing + four result tabs at 320/1280 px, disclosures open                                                |
| `node scripts/audit-cloud-secrets.mjs`                     | PASS — 0 findings across 656 Git candidates, 962 working text/build files and 629 history blobs; 1 history blob over 10 MB skipped |

The complete browser suite retains actual pixel/histogram assertions, EXIF orientations 1–8, alpha weighting, large/tiny/malformed files, worker failures/timeouts, retry/cancel/replacement, URL cleanup, keyboard navigation, GPS concealment, no-upload/local-storage checks and production route isolation. It also verifies clipboard values, actual CSS parsing, denied-clipboard fallback, map comparison/reset, collapsed technical details, touch targets and reduced motion. Cloud tests use mocked responses/local test stores; they make no real provider request.

Automated accessibility review items are limited to three decorative, aria-hidden bullet glyphs on each landing scan; these convey no information. Keyboard focus, semantic landmarks, labels, selected-tab state, contrast checks and reduced motion passed. Full WCAG certification, NVDA/VoiceOver sessions, Safari/Firefox and physical touch devices remain outside this verification. Product UX verdict is an internal review, not a human usability study.

## Clean deployment reproduction

A new independent Git clone started clean at `465a451`. Of **631 tracked files**, **520** matching the unchanged `.vercelignore` were physically removed using the installed ignore 5.3.2 matcher. Only the **10 changed production source files** were overlaid from the working tree; their SHA-256 values match the final source. No environment file was copied. Research, companion, tests and docs contained zero surviving files.

The clone used its own `npm ci --no-audit --no-fund` installation, then `npm run build` and `npm run typecheck:production`. Its server supplied the final screenshots and real browser-local analysis. The protected source graph, strictness and release isolation remain intact. The existing ESLint 9 EOL notice and a nested-checkout outer-lockfile warning appeared; no peer-dependency conflict or build failure occurred. No deployment was attempted.

Machine-readable results, source hashes and exact Git scope: [verification.json](evidence/verification.json). Raw logs and local reproduction scripts remain under the ignored `.cloud-ai/phase04-*` paths.

## Exact Git files changed

44 files; no commit, push or deployment has been performed.

```text
docs/phase-04/PHASE-04-HANDOFF.md
docs/phase-04/evidence/after-color-1280.png
docs/phase-04/evidence/after-color-320.png
docs/phase-04/evidence/after-light-390.png
docs/phase-04/evidence/after-maps-1280.png
docs/phase-04/evidence/after-overview-1280.png
docs/phase-04/evidence/after-overview-1440.png
docs/phase-04/evidence/after-overview-320.png
docs/phase-04/evidence/after-overview-375.png
docs/phase-04/evidence/after-overview-390.png
docs/phase-04/evidence/after-overview-430.png
docs/phase-04/evidence/after-overview-768.png
docs/phase-04/evidence/after-welcome-1280.png
docs/phase-04/evidence/after-welcome-320.png
docs/phase-04/evidence/after-welcome-390.png
docs/phase-04/evidence/before-desktop.png
docs/phase-04/evidence/before-live.png
docs/phase-04/evidence/before-results-desktop.png
docs/phase-04/evidence/before-results-mobile.png
docs/phase-04/evidence/verification.json
src/app/globals.css
src/components/analysis-loading.tsx
src/components/cloud-observations.tsx
src/components/evidence-insight.tsx
src/components/image-lab.tsx
src/components/loading-status.tsx
src/components/results.tsx
src/components/spatial-preview.tsx
src/lib/image-summary.ts
src/loading/presentation.ts
tests/browser/accuracy.spec.ts
tests/browser/discoveries.spec.ts
tests/browser/helpers/disclosures.ts
tests/browser/helpers/held-analysis.ts
tests/browser/lab.spec.ts
tests/browser/loading-visuals.spec.ts
tests/browser/loading.spec.ts
tests/browser/phase01.spec.ts
tests/browser/phase02.spec.ts
tests/browser/product.spec.ts
tests/browser/release.spec.ts
tests/browser/theme.spec.ts
tests/loading.test.ts
tests/product.test.ts
```
