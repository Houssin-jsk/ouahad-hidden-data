# OUAHAD Hidden Data

A browser-local image intelligence workspace by OUAHAD SPACE, with separately consented, invitation-only AI observations.

**Current release candidate: 2026-10-24.** Production AI remains paused. The final implementation report, current verification evidence, production blockers and owner release steps are in [Release readiness](docs/RELEASE-READINESS.md). Older phase documents record history and must not be used as current operational status.

## Local development and verification

Use Node.js 24.x (matching Vercel; unit integration tests use built-in SQLite) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No credentials are needed for local image analysis. A fresh checkout fails closed for Cloud AI and the owner dashboard until its server environment is configured.

```sh
npm run typecheck
npm run typecheck:production
npm run lint
npm test
npm run test:all
npm run build
npm run test:browser -- --workers=2
npm audit
```

Build before browser tests. Playwright launches installed Google Chrome and an isolated production server at http://127.0.0.1:3001; that port must be free. Browser tests use mocked AI transports and isolated SQLite fixtures. They never activate production AI or invoke a real provider. Screenshots and accessibility/performance attachments are under ignored `test-results/`. axe-core comes from the locked lint dependency tree. `npm test` is the production suite; `test:all` also checks retained research fixtures, which are not shipped.

## Image tools

- JPEG, PNG and WebP selection or drag-and-drop, signature/MIME validation, a 20 MiB file limit and a 40 MP encoded-dimension guard before decoding.
- Oriented preview, dimensions, aspect ratio, exact file size and format.
- Deterministic Image DNA, six approximate dominant RGB color families, weighted shares, average RGB, individual HEX copying and whole-palette/CSS copying with a manual fallback.
- Linearized sRGB / Rec. 709 luminance, tonal shares, 32-bin histogram, standard deviation, range, weighted percentiles and HSV saturation distributions, with traceable methods and limitations.
- Local EXIF/camera/software inspection. GPS is concealed until explicitly revealed and can be hidden again.
- Original, luminance and Sobel detail maps with a native comparison slider supporting touch, mouse and keyboard. Maps are bounded to 512 px on the longest edge and are separate from native statistical sampling.
- Actual worker milestones, immediate completed results, cancellation/replacement, stale-result rejection and blob/bitmap cleanup. See [loading behavior](docs/loading-presentation.md).
- Dark coffee surfaces, amber `#F3A339`, responsive preview/results, keyboard tabs, reduced motion and accessible status/error states.

## Architecture and numerical contract

`src/app` uses the Next.js App Router. `src/components/image-lab.tsx` owns selection, decoding, a dedicated worker and cancellation. `src/components/results.tsx` organizes Overview / Color / Light / Metadata. The AI panel remains mounted while navigating tabs so a request or completed result is not lost. Replacement clears the entire previous analysis.

`src/analysis` contains pure calculations, file validation, native-pixel sampling, metadata inspection and maps. Up to 262,144 pixels are sampled deterministically without interpolation, with each sample weighted by its source cell area and alpha. Smaller images use every pixel. Fully transparent pixels are excluded; partial alpha contributes proportionally. Color families are stable RGB k-means centroids, not necessarily literal source pixels. Luminance linearizes sRGB first, then applies 0.2126/0.7152/0.0722 weights. Tonal bands are below 0.2, 0.2 to below 0.7, and at least 0.7. Standard deviation describes tonal spread, not image quality or an accessibility contrast ratio. Sampling can miss rare colors, sparse details and extrema.

Client modules never import server credentials. `src/cloud-vision/server` owns provider configuration, request validation, routing, response normalization, D1 accounting and owner operations. Inference routes explicitly use Node.js; the image worker remains browser-only. Next.js-specific changes must follow the installed `node_modules/next/dist/docs/` guides, as required by `AGENTS.md`.

## Privacy and AI behavior

Ordinary image analysis stays in the browser: there is no image upload, remote decoder or external analytics. After local results appear, one same-origin, read-only `/api/cloud-vision/status` request checks availability; it carries no image, filename, EXIF or GPS. Navigation does not repeat this check. Explicit access verification sends only the capability in an Authorization header.

AI processing requires a current owner invitation, adult/professional/Morocco/non-sensitive eligibility attestation and a separate unchecked external-processing consent box. The browser creates a fresh JPEG with a maximum 1024 px side and 768 KiB, composites transparency on white and excludes the original filename and EXIF/GPS. The backend independently checks and strips JPEG metadata. This copy goes to the backend and an authorized provider. Cancellation cannot recall content already received. Google unpaid service may use submitted content for product improvement/human review; the UI links current provider terms. Do not submit personal, sensitive or confidential images.

The real adapters are Gemini 3.5 Flash Lite, separately qualified Gemini 3.1 Flash Lite and a separately qualified Cloudflare vision model. NVIDIA remains hard-disabled. Merely configuring a key does not make a provider eligible. Owner/D1 authorization, current free-tier attestations, release authorization, quotas and emergency stop all apply. No demo observations are displayed as real results.

Provider responses are schema-checked; descriptions, observations and limitations are separated from deterministic measurements. No automatic client retry occurs. Server routing is serial and bounded to three distinct, explicitly enabled/qualified models. Only explicit quota/rate/credential/billing/model rejections may use an eligible fallback. Timeouts, connection failures, refusals, malformed results and cancellation stop routing. Uncertain work stays charged. A completed result cannot be submitted again from the same panel. API/body/deadline budgets remain 768 KiB, 45 s Gemini, 50 s API, 60 s Node route and 65 s browser.

## Server environment

Keep values in ignored `.env.local` for local administration and in Vercel Production for deployed routes. Never use `NEXT_PUBLIC_` credentials or commit env files. This application does not require an OpenAI key or an AI gateway.

| Names | Purpose |
| --- | --- |
| `CLOUD_AI_ORIGIN` | Exact allowed HTTPS production origin; localhost is permitted only outside Vercel |
| `CLOUD_AI_ADMIN_SECRET` | High-entropy owner credential; signed, HttpOnly, Secure, SameSite=Strict sessions expire after one hour |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_API_TOKEN` | Shared D1 REST connection |
| `CLOUD_AI_D1_DATABASE_ID`, `CLOUD_AI_D1_API_TOKEN` | Supported legacy aliases; conflicting aliases reject |
| `CLOUD_AI_D1_FREE_UNTIL` | Expiring owner D1/free-plan attestation |
| `GEMINI_API_KEY`, `CLOUD_AI_GEMINI_FREE_UNTIL` | Gemini configuration and current free-project attestation |
| `CLOUD_AI_GEMINI_31_VISION_UNTIL` | Additional exact-model qualification for Gemini 3.1 |
| `CLOUDFLARE_API_TOKEN`, `CLOUD_AI_CF_FREE_UNTIL`, `CLOUD_AI_CF_LICENSE_ACCEPTED` | Optional Cloudflare inference qualification, separate from D1 access |
| `NVIDIA_API_KEY` | Historical adapter configuration; does not enable NVIDIA |
| `CLOUD_AI_INVITES` | Server-only SHA-256 capability allowlist with country and expiry |
| `CLOUD_AI_RELEASE_READY_UNTIL` | Expiring authorization for the restricted release |
| `CLOUD_AI_OWNER_TEST_INVITE_HASH` | Existing bounded owner-test exception; leave absent unless separately authorized |

Attestations must be current and at most seven days ahead. They are manual operator evidence, not proof obtained from an API key. Do not renew them without the relevant billing/eligibility review. Local env availability is not proof of deployed configuration.

## D1 and owner operations

`server/ledger.ts`, `schema.ts` and `policy.ts` implement atomic admission, unique request identifiers, model and shared-project limits, conservative 4,096-token reservations, rolling request/token windows and Pacific-day Gemini quotas. Settlement records provider-reported usage but never refunds reservations. Unknown usage remains unknown. Expired leases reconcile as uncertain; a report above the reserved safety bound triggers an audited stop. Metadata-only retention never stores images, prompts or generated observation text.

`/admin/ai` presents a public sign-in shell; operational data and all changes require an owner session. `/api/admin/ai` rejects unauthenticated requests. Writes require exact-origin/CSRF validation and matching revisions; SQL triggers audit changes. The dashboard shows actual D1 status, UTC-day attempts/outcomes/uncertainty/token totals, model quota use, recent events, fallback reasons and administrative history. Reported tokens are not provider balances. Gemini quota days reset in Pacific time, which differs from the UTC overview.

Read-only inspection (no login, inference, renewal, migration or writes):

```sh
npx tsx scripts/cloud-readiness.ts
```

An optional first argument saves the sanitized JSON report to an existing local directory. The command exits nonzero if remote DB inspection or expected production HTTP responses fail. It prints names/presence and attestation status, never secret values. Migrations 1 and 2 already exist in the inspected production DB; do not rerun migrations as a smoke test. Setup history is in [the architecture record](docs/phase-03/PHASE-03-ARCHITECTURE.md).

## Release and rollback

`npm run build` verifies the strict production import graph, builds the app and runs `scripts/verify-release.mjs`. `.vercelignore` excludes research, models, companion runtime, tests, docs, local env and owner scripts. The release contains only approved image-analysis and protected admin/AI routes. Security headers deny framing, object embedding, external form submission, browser camera/microphone/geolocation access and MIME sniffing; no provider keys enter browser chunks.

Do not push or deploy automatically: Git integration can trigger a release. Review the prepared changes and [current blockers](docs/RELEASE-READINESS.md) first. Keep stop ON and every model OFF through release. Verify the domain, environment names, anonymous API denial and paused UI after an explicitly authorized deployment. AI activation is a separate owner decision and is unnecessary for releasing the local image tools.

For an authorized future pilot, verify account billing/terms and expiring attestations, inspect D1 without mutating its debits, issue short-lived invitations, authorize the restricted release, and enable only the explicitly approved model/caps. Never clear an uncertain reservation. For emergency rollback, turn the stop ON first, disable models, revoke invitations and owner sessions, then restore the last reviewed deployment if required. Existing already-received provider work may finish; reservations remain charged. Do not use a real inference request as an unapproved deployment check.

Physical-device, Safari/Firefox and assistive-technology user testing are not claimed by the Chrome-based verification. Semantic AI remains experimental.
