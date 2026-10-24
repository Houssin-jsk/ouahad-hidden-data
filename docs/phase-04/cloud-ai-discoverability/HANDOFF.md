# Cloud AI discoverability correction

Verified 2026-10-23. **READY for owner review and deployment authorization.** No commit, push, deployment, cloud activation, model enablement or persistent configuration change was performed.

## Exact cause

The feature was retained. The verified rendering path was:

- `src/components/image-lab.tsx:558–560`: `Results` mounts after a valid local result and source exist.
- `src/components/results.tsx:80` and `:178`: `CloudObservations` is inside the Overview branch, after essential facts and palette actions. Color, Light and Metadata intentionally omit it.
- Pre-correction `src/components/cloud-observations.tsx:96–100`: the root was a closed `<details>` with its entire access flow behind `<summary>`. Its subdued entry point could also require scrolling below the essentials.
- There was no release/provider/invitation/owner condition controlling mounting, no unavailable-state `return null`, and no responsive CSS hiding the root. The component never loaded server availability; it always presented an invitation flow, even when requests were unavailable.

A read-only visit to [production](https://hidden-data.ouahad.space) on 2026-10-23 confirmed one closed `DETAILS.cloud-observations` on Overview after real local analysis. The live hero was “Every image has a story.”, while the uncommitted local Phase 04 hero differs. [Live desktop](evidence/before-live-1280.png) · [live mobile](evidence/before-live-390.png). No upload or inference request occurred during that inspection.

Thus the implementation was **conditionally omitted outside Overview and insufficiently discoverable within Overview**, rather than deleted or hidden by provider configuration. The owner's particular screenshot was not supplied, so its precise tab/scroll state cannot be proven. Deployed and local secret settings were not compared; they did not control the old component's rendering.

## Targeted change

`CloudObservations` now renders a visible editorial heading, short description, experimental badge and current availability after the same deterministic essentials. Only code entry and the consent flow remain disclosed. The four tabs, palette exports, optional maps, instant results, pixel algorithms and GPS handling are preserved; `Results` and `ImageLab` needed no further edits.

A new read-only `GET /api/cloud-vision/status` adapts existing runtime release/invitation/provider rules and shared policy to four small public states. It checks current invitations, runtime origin, release authorization (including the existing owner-only test exception), provider qualification, shared emergency stop, enabled model policy and cooldowns. Responses contain only `schema` and `status`, use `no-store, private`, and expose no provider names, balances, quotas, credentials or operational reasons.

This status adapter calls only SELECT methods. It never admits/reserves a job, updates counters/logs, prunes data, creates a session or calls an inference provider. The existing inference endpoint, router, adapters, ledger, policy, access checks and admin code remain unchanged. SHA-256 comparison verified **32 original analysis/inference/admin source files unchanged** from the start of this correction.

| UI state                            | Verified behavior                                                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unavailable                         | Visible title and compact explanation; no code form or start/retry action. Errors, missing configuration and unsupported status responses fail closed.                     |
| Restricted pilot                    | Visible invitation explanation and “Use a pilot access code” disclosure. Code checking sends only the code in an Authorization header; no image is sent.                   |
| Eligible invitation                 | Server-confirmed access reveals the original privacy terms, eligibility attestation and explicit image-processing consent. Start remains disabled until both are accepted. |
| Invalid/expired invitation          | Safe error, no inference action; editing the code clears eligibility, consent and prior observations.                                                                      |
| Start denied by quota/configuration | The start/retry action is removed and unavailable status is shown; internal error text is not displayed.                                                                   |

Access checking preserves keyboard focus on the status message. Availability requests are bounded (4-second server database budget; 6-second browser budget). The original 45/50/65-second provider/API/browser inference deadlines remain unchanged. A status snapshot is **not quota admission**: the original POST handler authoritatively rechecks access, consent, current policy and reservations at submission time.

## UI and actual-state evidence

Screenshots were captured and visually inspected from the final filtered production artifact using the existing CC0 landscape fixture ([provenance](../../../tests/fixtures/discovery/README.md)).

| State                                                       | 390 px                                    | 1280 px                                    |
| ----------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Unavailable, actual no-environment filtered build           | [Overview](evidence/disabled-390.png)     | [Overview](evidence/disabled-1280.png)     |
| Restricted, local server-policy simulation                  | [AI section](evidence/restricted-390.png) | [AI section](evidence/restricted-1280.png) |
| Eligible, local server-policy simulation, consent unchecked | [AI section](evidence/eligible-390.png)   | [AI section](evidence/eligible-1280.png)   |

The restricted/eligible examples use the real read-only handler with an in-memory SQLite policy store and fake adapters. They do **not** indicate that a real provider was enabled or qualified. Six captures had zero image POSTs, provider calls, page errors or horizontal overflow. Six axe-core 4.14.0 WCAG A/AA scans had zero violations or incomplete items. Keyboard disclosure, focus, code changes and consent behavior also passed Chrome tests. These are viewport checks, not physical-device or live assistive-technology testing.

## Fresh checks

| Check                                                                                   | Result                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full `npm run test:all`                                                                 | 160 passed; 0 failed / skipped                                                                                                                                                                           |
| Full production `npm run test:browser -- --workers=2 --reporter=json`                   | 79 passed; 0 failed / skipped / flaky                                                                                                                                                                    |
| Strict `npm run typecheck` and `npm run lint`                                           | PASS                                                                                                                                                                                                     |
| Workspace `npm run build`                                                               | PASS                                                                                                                                                                                                     |
| Independent filtered checkout `npm ci`, `npm run build`, `npm run typecheck:production` | PASS; 57 local source files and no ignored imports                                                                                                                                                       |
| Release isolation via both postbuild hooks                                              | PASS; 132 output/trace files; no model weights, companion runtime or research routes                                                                                                                     |
| `node scripts/audit-cloud-secrets.mjs`                                                  | PASS — 0 findings in 672 Git candidates, 983 working text/build files and 673 history blobs; 1 history blob over 10 MB skipped. Known configured values/common key patterns; not forensic certification. |

Server/UI simulations cover global unavailability, emergency stop, missing release authorization, valid restricted invitation, invalid/expired/revoked invitation, qualified adapter with enabled policy, no enabled qualified model, cooldown/suspension, missing database, successful mocked observations, provider/browser timeout, quota denial, declined consent, malformed status/output, cross-site/origin mismatch, and both requested viewport widths. Status tests compare every local table before/after and verify SELECT-only queries and zero provider invocations. Unauthorized/missing-consent POSTs remain rejected without reservation. Existing metadata stripping, EXIF orientation, cancellation, late-response rejection, deterministic measurements, maps and palette exports remain in the full suite.

The independent checkout started clean at `465a451`, with **520 of 631 tracked files physically removed** by the unchanged `.vercelignore`. Only the final production changes were overlaid; source SHA-256 values match the working tree. No environment file was copied. Research, companion, tests and docs contained zero surviving files. The release allowlist adds only the new exact status route. Dependencies and lockfile are unchanged; the existing ESLint EOL and nested-checkout outer-lockfile notices did not block the build.

No real inference, billing inspection/activation, remote D1 counter/log reconciliation, settings change or public AI release was performed. The read-only status path can inspect configured shared policy; it cannot modify the existing usage ledger. Physical devices, Safari/Firefox and live screen readers remain unverified.

## Exact correction scope

These **22 files** differ from the snapshot at the start of this correction. Earlier uncommitted Phase 04 work is retained. `next-env.d.ts` was regenerated by Next.js from development to production type imports and has no remaining Git diff; it was not manually edited.

```text
docs/phase-04/PHASE-04-HANDOFF.md
docs/phase-04/cloud-ai-discoverability/HANDOFF.md
docs/phase-04/cloud-ai-discoverability/evidence/before-live-1280.png
docs/phase-04/cloud-ai-discoverability/evidence/before-live-390.png
docs/phase-04/cloud-ai-discoverability/evidence/disabled-1280.png
docs/phase-04/cloud-ai-discoverability/evidence/disabled-390.png
docs/phase-04/cloud-ai-discoverability/evidence/eligible-1280.png
docs/phase-04/cloud-ai-discoverability/evidence/eligible-390.png
docs/phase-04/cloud-ai-discoverability/evidence/restricted-1280.png
docs/phase-04/cloud-ai-discoverability/evidence/restricted-390.png
docs/phase-04/cloud-ai-discoverability/evidence/verification.json
scripts/verify-release.mjs
src/app/api/cloud-vision/status/route.ts
src/app/globals.css
src/cloud-vision/availability.ts
src/cloud-vision/server/availability.ts
src/components/cloud-observations.tsx
tests/browser/cloud-discovery.spec.ts
tests/browser/cloud-vision.spec.ts
tests/browser/product.spec.ts
tests/cloud-availability.test.ts
tests/fixtures/cloud-availability.ts
```

[Machine-readable evidence](evidence/verification.json) also records the complete combined working-tree Git scope, protected-source comparisons, clean-build overlay hashes and test statistics. Raw local logs/reproduction scripts remain under ignored `.cloud-ai/discoverability-*` paths.
