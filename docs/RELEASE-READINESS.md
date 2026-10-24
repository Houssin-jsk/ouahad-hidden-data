# OUAHAD Hidden Data — final implementation and release handoff

Verified 2026-10-24 against base commit `465a451`, on the existing `main` working tree. **READY WITH BLOCKERS.** The tested local release candidate is ready for review. Production domain verification and deployed environment inspection remain blocked; public AI activation remains intentionally closed. No commit, push or deployment was performed.

## A. Completed work and exact files

The assignment began with uncommitted Phase 04 product, loader, availability and browser-test changes. Those changes were preserved, inspected and included in the regression; they were not discarded or represented as newly authored in this pass. [Complete candidate inventory](release-readiness/files.json) includes both the inherited changes and this pass. [Machine verification and source hashes](release-readiness/verification.json) records the current scope.

| Files modified in this pass | Completed behavior |
| --- | --- |
| `src/app/globals.css`, `src/components/image-lab.tsx` | Dark coffee design tokens, amber controls, official white logo, readable status text, focus styling, accessible active markers and matching owner surfaces |
| `src/components/results.tsx`, `src/components/cloud-observations.tsx` | AI requests/results survive tab changes; explicit consent remains mandatory; failures remain visible after access becomes unavailable; manual availability recovery resets consent; successful analysis cannot be accidentally repeated |
| `src/cloud-vision/contract.ts` | Known error validation, allowlisted response normalization and bounded numeric processing/usage fields; untrusted extra fields are discarded |
| `src/cloud-vision/server/router.ts` | No automatic fallback after timeout/outage/uncertain execution; cancellation after reservation cannot start provider work; explicit rejection fallback remains serial and bounded |
| `src/cloud-vision/server/handler.ts`, `src/cloud-vision/server/ledger.ts` | Bounded independent settlement window after client cancellation; D1 response-body reads obey their deadline, including stalled streams |
| `src/cloud-vision/server/admin.ts`, `src/components/admin-ai.tsx` | Actual UTC-day uncertain/expired reservations and reserved/reported token totals; per-event token reporting preserves unknown usage |
| `next.config.ts` | Shared no-sniff, no-referrer, anti-framing, object/form/base restrictions and camera/microphone/geolocation restrictions |
| `scripts/cloud-readiness.ts`, `.vercelignore` | Reusable read-only production inspector, excluded from release uploads; no authentication session, inference, migration or setting mutation |
| `tests/cloud-vision.test.ts`, `tests/central-ai.test.ts` | Response normalization, stalled D1 body, reservation/cancellation and uncertain-debit/no-fallback regressions |
| `tests/browser/cloud-vision.spec.ts`, `tests/browser/cloud-discovery.spec.ts`, `tests/browser/theme.spec.ts`, `tests/browser/readiness.spec.ts` | Tab lifecycle, failure recovery/consent, dark theme, security headers, automated accessibility and native touch/mouse/keyboard slider verification |
| `README.md`, `docs/loading-presentation.md`, `docs/phase-03/PHASE-03-ARCHITECTURE.md` | Current architecture/privacy/AI/environment/operations/testing/release instructions, with historical statements clearly superseded |
| `docs/RELEASE-READINESS.md`, `docs/release-readiness/verification.json`, `docs/release-readiness/files.json`, `docs/release-readiness/evidence/*` | This handoff, exact inventory, sanitized safety snapshot and reviewed visual evidence |

Retained image features passed their real fixture assertions: validation, oriented decoding, EXIF/GPS disclosure, palette families/order/copying, area/alpha weighting, linear luminance and distributions, Sobel maps, deterministic sampling/DNA, preview comparison, cancellation and memory cleanup. The validated mathematical engine was preserved. No CSV tools, new provider, paid service, infrastructure migration or dependency migration was introduced.

Visual evidence: [desktop landing](release-readiness/evidence/welcome-desktop.png), [mobile landing](release-readiness/evidence/welcome-mobile.png), [desktop results](release-readiness/evidence/overview-desktop.png), [mobile results](release-readiness/evidence/overview-mobile.png), [explicitly mocked AI result](release-readiness/evidence/ai-mocked-result-desktop.png). Screenshots use existing test fixtures, not private user images. The AI screenshot is a deterministic transport fixture and is not evidence of fresh real inference.

## B. Issues fixed

1. **Lost AI results and repeated processing on navigation.** Overview conditionally mounted the entire AI component. Switching tabs destroyed its result, invitation/consent state and active controller. The component now stays mounted in a hidden container across navigation; replacement still unmounts and resets it. The active-request and completed-result browser cases each assert exactly one submission.
2. **Invisible rejection reasons.** Messages were inside the eligible-only disclosure, which disappeared on quota/configuration rejection. Status now lives outside that conditional branch, uses controlled public error copy and offers a read-only availability recheck. Consent must be selected again after recovery.
3. **Potential duplicate provider work after uncertainty.** Timeout and outage could trigger another eligible provider, while the first execution might still complete. These categories now stop routing with one conservatively charged uncertain reservation. Tests assert one attempt, zero fallback calls, 4,096 reserved tokens and unknown actual usage. Existing tests for explicit quota/rejection fallback still pass; assertions were strengthened to encode the new safety requirement.
4. **Cancellation race after reservation.** A signal could abort while awaiting reservation, then still enter the provider adapter. A second abort check before provider entry closes that boundary and records cancellation.
5. **Unbounded D1 response-body wait.** The fetch deadline covered response headers, but was not passed to the bounded JSON stream reader. Both now use the same signal. A stalled-body test verifies cancellation.
6. **Cancellation interrupting settlement.** Production ledger access shared the browser's signal, so a disconnect also cancelled uncertain-debit recording/release. Ledger operations now have a separate 58-second outer bound inside the unchanged 60-second route budget; inference still obeys the combined browser/API signal and 50-second deadline. Each D1 operation retains its four-second bound. Failed settlement never refunds quota; lease reconciliation remains conservative.
7. **Incomplete operational visibility.** Added real D1 aggregates and per-event reserved/reported values. Unknown actual usage is shown as unknown, with no invented provider balance.
8. **Visual identity and contrast mismatch.** The inherited light beige interface did not match the requested dark identity. Existing tokens/components were adapted; no dashboard rewrite occurred. Automated review caught and led to correcting the amber active-step marker's text contrast. The comparison slider remains a native range input.
9. **Weak client envelope validation and conflicting docs.** Response fields are normalized and errors/numbers validated. The README and loading guide now describe the current immediate-result, separately consented AI experience instead of conflicting historical milestones.

## C. Verification evidence

| Command/check | Result |
| --- | --- |
| `npm run typecheck` | PASS, strict full repository |
| `npm run typecheck:production` | PASS; 57 local production graph files; no excluded imports |
| `npm run lint` | PASS |
| `npm run test:all` | **165 passed, 0 failed, 0 skipped**; pure math plus real SQLite security/quota/admin/traffic integration and retained history fixtures |
| `npm run build` | PASS, including production TypeScript and postbuild isolation |
| `node scripts/verify-release.mjs` (postbuild) | PASS; 132 output/trace files; no model assets, companion runtime or research endpoints |
| `npm run test:browser -- --workers=2 --reporter=json` | **84 passed, 0 failed/skipped/flaky**, production Chrome; approximately 126 s |
| Automated axe-core checks | **10 scans, 0 violations**: landing and four tabs with disclosures open, at 320 and 1280 px |
| Responsive and input checks | Seven product widths from 320 to 1440 px, six additional theme viewport cases; touch, mouse, arrows, Home/End slider checks; keyboard tabs; reduced motion; no horizontal overflow |
| `npm audit --json` | **0 vulnerabilities**, including development dependencies |
| `node scripts/audit-cloud-secrets.mjs` | 0 findings; 685 candidate files, 999 working text/build/log files, 710 history blobs; one historical blob over 10 MB excluded by the existing scanner |
| `git diff --check` | PASS |
| Filtered candidate reproduction | 115 deployable source/config files copied according to `.vercelignore`; no env files. Independent `npm ci --ignore-scripts --no-audit --no-fund`, production build and strict production typecheck PASS |
| Read-only remote D1 inspection | PASS; migrations 1 and 2 present; production state described below |
| Production custom-domain fetch | FAIL: Node, PowerShell, web tool and Chrome cannot reach the HTTPS application; Chrome reports connection refused |
| Vercel project metadata | Project/domain association and latest existing production deployment READY visible; Node 24.x. This is not a claim that the domain or current candidate is deployed |
| Vercel environment metadata | BLOCKED: authenticated connector returned team-scope 403; no values requested or exposed |

Chrome assertions retain exact known-value pixels/histograms, EXIF orientations 1–8, alpha weighting, invalid and oversized files, worker errors/timeouts, retry/cancel/replacement, URL cleanup, GPS concealment, no image uploads in local analysis, disabled/emergency-stop behavior, authorization/CSRF denial and real SQL quota concurrency. AI success/failure transports use mocks. **No fresh live-provider quality or billing claim is made.**

Performance observations from the concurrent full browser run: the landscape fixture became visible in 1,075 ms at 320 px and 1,617 ms at 1280 px; main-page script encoded response bodies totaled 160,326 bytes in each observation. These are individual localhost observations under test load, not a controlled hardware benchmark, total artifact size or physical-device guarantee. No artificial processing minimum is active. No browser runtime errors were observed in the checked flows.

Axe reports a few incomplete decorative-glyph checks for manual consideration; zero violations is limited to its rule coverage. Keyboard, semantic and screenshot review complement it. Physical devices, Safari/Firefox and live screen-reader sessions have not been verified. The installed ESLint 9 EOL notice remains a maintenance item; a migration was intentionally not bundled into this release. Vulnerability scanning reports zero current findings.

## D. Production safety

The [sanitized read-only snapshot](release-readiness/evidence/production-safety.json), collected at **2026-10-24 20:01 UTC**, independently confirms:

- Emergency stop **ON**; all four models **OFF** and unverified.
- **0 active owner sessions**, **0 active jobs**, **1 uncertain reservation**.
- Three completed attempts retain **12,288 reserved / 4,071 reported tokens** in total. The separate uncertain attempt retains **4,096 charged reserved tokens**, with actual usage unknown. No refund, reset or reconciliation mutation was performed.
- Global limits remain **60 analyses/UTC day, 6/minute, 2 concurrent**. Participant limits remain **3/day, 1/minute**. Gemini shared limits remain **300/day, 10 RPM, 200,000 reserved TPM and 1,000,000 reserved tokens/Pacific day**. Optional provider allocations remain zero.
- Schema migration versions **1 and 2** are present. This pass requires no migration.

Local provider/admin/D1 credential names are present. Local D1 and Gemini free-tier attestations are **expired or invalid**; invitations, owner-test exception, release-ready attestation and optional provider qualifications are absent. These local observations are not substituted for deployed environment inspection.

There were **zero inference requests**, **zero production setting/secret/DNS/billing changes**, **zero owner logins/session creations**, **zero reservation refunds**, and **no deployment or push**. The read-only D1 inspector uses SELECT-only application queries. SQLite tests activate models only in isolated local fixture databases. Ordinary local measurements never send image bytes to the API.

## E. Remaining blockers

1. **Production domain availability.** Public DNS via Google's resolver returns A **198.54.117.242** for `hidden-data.ouahad.space`; HTTPS requests refuse connections. The Vercel project still lists the domain. The owner must inspect authoritative DNS and the domain's current Vercel-recommended records, correct the mismatch if confirmed, and verify TLS/application responses. No DNS records were changed and no unverified replacement IP is prescribed.
2. **Deployed environment verification.** Vercel environment metadata inspection returns 403 for the project's team scope. Restore authorized team access or verify environment names in that exact project's Production settings. Existing key names are documented; do not rotate or expose values as part of this review. Project metadata access alone does not establish provider operation.
3. **Controlled AI activation remains intentionally closed.** Expired local attestations cannot authorize inference. Future activation requires a separate owner decision, current account billing/terms verification, qualified model/invitation/release settings and the existing D1 protections. These are blockers to activation, not defects in browser-local analysis. This task did not authorize resolving them by renewal, enablement or a real smoke test.

## F. Deployment readiness

**READY WITH BLOCKERS.** The code and isolated release build pass all requested automated checks within the tested Chrome scope. No known critical functional defect remains in that scope. The current custom domain is unreachable and the deployed environment has not been independently revalidated. The working tree is intentionally uncommitted and includes pre-existing work; do not equate a tested local candidate with a completed production release.

## G. Minimum next owner actions

1. Review this candidate/inventory and resolve the production domain routing/TLS failure using the project's current recommended DNS configuration.
2. Restore Vercel team access or confirm required Production environment names, origin and paused configuration in the dashboard. Keep emergency stop ON, every model OFF, and existing uncertain debits untouched.
3. Explicitly authorize release of the reviewed candidate. Commit/push/deploy only after that decision, because pushes may trigger deployment. Then verify root HTTP 200, read-only availability `unavailable`, anonymous admin API 401 and inference GET 405, without issuing an inference POST.

No AI activation is required to release the local image tools. If AI is later desired, treat account verification and a bounded restricted-pilot activation as a separate authorized operation. Rollback instructions and environment setup are in [the README](../README.md).
