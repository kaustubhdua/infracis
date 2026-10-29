# Production release runbook

This file is the source of truth for release gates. A checkbox is complete only when a run, output, URL, or reproducible evidence is linked here. Never mark a gate green based on code presence alone.

## Requested website feature audit — 2026-10-29

This table separates implementation visible in the repository from live-service verification. A green CI run does not prove third-party services are currently available.

| Area | Current implementation | Verified status | Remaining release work |
|---|---|---|---|
| Interactive map | Leaflet map is dynamically imported client-side; location pin, amenity markers, coordinate picking, retry/error states, tile fallback for configured custom tile URL, and visible OpenStreetMap attribution are implemented. | Code and automated build/CI; public tile/service uptime not guaranteed. | Manual mobile/desktop pan/zoom/pick tests and tile attribution/security review on the deployed origin. |
| Location analysis | Next.js API calls Nominatim, Open-Meteo weather/air-quality, and Overpass through bounded adapters; source provenance, timestamps, missing-data states, input limits, and request rate limits are implemented. | Unit/route tests pass; the latest strict-relevance pilot accepted 8/20 geocoding queries, measured 5/8 weather and 4/8 air-quality responses, and returned 0/8 valid amenity responses. | Select a terms-appropriate hosted/self-hosted Overpass source, then repeat a controlled live pilot; independently spot-check locality relevance and measure timeout/outage recovery. |
| UI and navigation | Responsive forest/cream/saffron UI, accessible focus states, investigation flow, evidence, comparison, methodology, decision brief, and report views. | Production build, lint, type-check and unit tests run in CI. | Complete the release-runbook manual responsive and assistive-technology QA on real browsers. |
| Lazy loading | Interactive map is client-only dynamically loaded; heavy report sections and saved-report modal use dynamic imports and loading placeholders. | Source inspection and production build. | Confirm real-browser bundle/loading behavior and no layout regressions in the manual QA pass. |
| Map theme and preferences | Street tiles plus NASA GIBS imagery overlay; selected style is remembered in a small SameSite=Lax cookie. A hydration-order bug that could overwrite a saved satellite choice was fixed. | Feature branch CI passed; main-branch CI for the merge is tracked separately. | Test preference persistence with cookies enabled/blocked, across reloads, and when NASA tiles fail. |
| Save and export | Reports are saved/reopened/deleted in browser localStorage, export to JSON, and gracefully handle storage errors. Small preferences use cookies. | Parser/storage tests and CI; storage is device/browser-local. | Cloud sync is intentionally unavailable until dedicated Supabase, Auth, migration and RLS isolation tests exist. Never describe browser-local saves as cloud backup. |
| User-based locality analysis | User-selected Balanced, Family, Transit-first, Healthcare-first and Quietness profiles; weighted score uses only documented available access metrics, with missing data excluded and quietness unscored without verified noise evidence. Preference is saved on-device. | Calculation and component tests are included in CI. | Usability-test profile labels/weights; do not imply this is a property safety, legal, structural or investment assessment. |
| Reviews and ratings | Overall 1–5 star rating plus walkability, public transport, noise comfort, lighting and cleanliness dimensions, with optional note, explicit opt-in and delete. | Input validation/migration tests; records are private to the current browser/device. | This is not a public review platform and produces no aggregate neighbourhood rating. Public/user-shared reviews require authenticated identity, moderation/abuse controls, privacy rules, persistence and RLS tests before being built or advertised. |

### Release boundary

Current main candidate `92b52378ea835d8f25c8cbec8d5ab856be9ca632` passed [main-branch CI](https://github.com/kaustubhdua/infracis/actions/runs/40812805296): 16 test files passed, lint, type-check, production build, and production/full dependency audits each completed successfully with zero reported vulnerabilities. The latest merge adds bounded best-effort Overpass failover for low-volume evaluation, stops retries after HTTP 429/406, and explicitly documents the no-SLA boundary. This is repository evidence only, not proof of live provider or deployed-host behavior.

The current repository is a tested MVP, not yet production-proven. Live provider reliability (the latest strict-relevance pilot accepted only 8/20 queries and returned 0/8 amenity responses), cross-instance Redis behavior, deployed-domain checks, browser QA, and any cloud persistence remain explicit release gates below. No deployment was performed.

## P0 — dependency/security verification
- [x] Record release candidate SHA and GitHub Actions run URL.
- [x] Green on the exact candidate SHA: `npm ci`, production and full dependency audits, tests, lint, typecheck, production build.
- [ ] Review dependency audit findings including development dependencies; resolve or document accepted risks.
- [ ] Confirm the lockfile was generated by npm and matches package.json independently.
- [ ] Review current Next.js advisories and the version actually deployed before release.

**Verified 2026-10-29:** current `main` candidate `92b52378ea835d8f25c8cbec8d5ab856be9ca632` passed [GitHub Actions CI](https://github.com/kaustubhdua/infracis/actions/runs/40812805296). The exact candidate completed locked dependency installation, production and full dependency audits (both reported zero vulnerabilities), all unit-test files (16 passed), lint, type-check, and production build. The latest change adds validated, private device-local locality experience ratings for overall experience, walkability, public transport, noise comfort, street lighting, and cleanliness, with compatibility for existing overall-only notes. This remains personal observation—not a public review system or an aggregate rating. The current candidate includes preference-based locality fit analysis with documented weights, device-local preference persistence, missing-evidence handling, and an intentionally unscored quietness profile until validated noise data exists. The run also emitted existing npm/Node deprecation warnings; those are recorded as maintenance work rather than hidden. Recent changes include accessible saved-report dialog focus management and malformed-storage handling; AI insight API tests for fail-closed shared rate limiting, missing server-side configuration, supported request kinds, allowlisted model payloads, sanitized upstream failures, and empty provider completions; cache contract tests for Redis GET/SET namespacing, TTL, malformed values, and production outage behavior; route tests for forwarded-IP trust boundaries and sanitized upstream errors; configured sequential Overpass failover across up to three verified HTTPS endpoints; and a pilot script that uses the same bounded endpoint list, records per-endpoint host/status/latency, avoids recording endpoint paths or query credentials, and describes strict all-requested-field validation accurately. The standalone backend now has a pinned Linux/container dependency set, `pip check`, and `pip-audit` in CI; the audit exposed an affected pytest release and the minimum version was raised to the patched line. [Backend CI](https://github.com/kaustubhdua/infracis/actions/runs/40687905494) passed the dependency audit and all 21 tests. These checks verify repository code only; they do not verify a live deployment, provider availability, operational Redis behavior, or replace human review of provider terms and deprecated development-tool warnings.
## P0 — current provider and framework policy review (reviewed 2026-10-28)

- Next.js official security advisories: https://github.com/vercel/next.js/security/advisories
- The repository pins Next.js 15.5.28, which is the patched Next.js 15 version named by the October 2026 advisories for the SVG image-optimization RCE and App Router Server Actions DoS. Re-check the advisory page and the installed lockfile version before every release; a patched version is not a substitute for reviewing all advisories and deployed artifacts.
- Nominatim public-service policy: https://operations.osmfoundation.org/policies/nominatim/ . Maximum 1 request/second app-wide, valid application-identifying User-Agent or Referer, visible attribution, caching, no autocomplete, and the ability to switch providers. Do not use the public service for unrestricted or systematic geocoding.
- Open-Meteo terms: https://open-meteo.com/en/terms and data licence/attribution: https://open-meteo.com/en/licence . The free API is non-commercial; subscriptions are required for commercial usage. The application owner must select a plan that matches the actual product use and traffic before public/commercial launch.
- OpenStreetMap attribution guidance: https://osmfoundation.org/wiki/Attribution_Guidelines . Verify attribution remains visible on every map/report surface that uses OSM data.
- Standard raster tile policy: https://operations.osmfoundation.org/policies/tiles/ . Use the exact `https://tile.openstreetmap.org/{z}/{x}/{y}.png` endpoint, visible attribution, normal browser Referer, and normal caching; do not prefetch or bulk-download. The map tile endpoint is configurable with `NEXT_PUBLIC_MAP_TILE_URL` so it can be switched to a compliant provider without a code change. The public tile service has best-effort availability and no SLA; select a suitable provider before commercial/high-traffic launch.
- Leaflet stylesheet is now bundled from the installed package rather than loaded dynamically from a third-party CDN at runtime. This removes a stylesheet CDN dependency; map tiles and external provider services still require network access.

## P0 — shared provider throttling and caching
- [ ] Configure a dedicated Upstash Redis REST URL/token for the actual Infracis deployment; do not reuse another app's store.
- [ ] Verify production requests fail closed with 503 when shared limiter credentials are absent or Redis is unavailable.
- [ ] Verify provider-specific shared caches, source-specific keys, TTL expiry, and cache-miss behavior.
- [ ] Run concurrent requests against at least two independent app instances; prove aggregate Nominatim outbound rate stays <= 1 request/second.
- [ ] Verify Redis outage, timeout, retry, and recovery behavior.
- [ ] Confirm logs/metrics do not retain unnecessary precise location searches or secrets.

The code for a shared Redis limiter, provider cache, and Nominatim slot reservation is present, and automated tests cover command construction and fail-closed behavior. The cache tests also cover namespacing, expiry commands, malformed cached JSON, and production cache misses on Redis outage. These tests use mocked REST responses and are not operational proof. Cross-instance concurrency and real Redis outage/recovery tests remain open.

Overpass responses are now explicitly marked as partial when the 100-element cap is reached; nearest-facility claims are withheld and comparisons treat capped amenity metrics as incomparable. The current adapter tries a bounded list of two public endpoints by default for low-volume evaluation and stops failover after HTTP 429/406 to respect backoff. These endpoints remain best-effort, with no product SLA; this is not proof of availability. The post-failover rerun completed at [provider pilot run 40812600499](https://github.com/kaustubhdua/infracis/actions/runs/40812600499). It still returned 0/18 valid amenity responses: Private.coffee timed out on sampled requests, while FOSSGIS returned HTTP 502 or timed out. This fallback did not resolve amenity availability; keep amenity-dependent claims disabled when both sources fail.

## P0 — API security
- [x] Route code uses `x-real-ip` and deliberately ignores arbitrary client-supplied `X-Forwarded-For`; regression test proves the fallback is `unknown-client` when the trusted header is absent. This is code/test evidence only; the deployed host must be verified before launch.
- [x] Automated request validation covers malformed JSON, oversized declared/streamed bodies, non-object payloads, missing comparison fields, unsupported preferences, out-of-range coordinates, and overlong queries; see [current CI run](https://github.com/kaustubhdua/infracis/actions/runs/40803085520).
- [ ] Run concurrent-flood and deployed rate-limit tests; automated unit/route tests do not establish behavior under real multi-instance load.
- [x] Provider adapters validate upstream response envelopes and relevant numeric/array fields; regression tests cover malformed weather, air-quality, Overpass, and Nominatim bounding-box responses.
- [ ] Add live integration checks for provider timeout, malformed payload, partial outage, and recovery.
- [x] API route regression tests verify upstream exception details are replaced with a generic client error. Deployed log and response review remains required.
- [ ] Confirm no credentials or private environment values are committed or exposed in NEXT_PUBLIC_* variables.
- [x] Configure baseline response headers in `next.config.mjs`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, DNS prefetch control, and production-only HSTS.
- [ ] Verify the actual deployed domain returns the intended headers and review a CSP/security-header scan; source configuration alone is not runtime proof.
- [ ] Test the deployed API's rate-limit behavior, not just unit tests.

## P0 — saved report persistence
**Current release decision: cloud save is deferred.** Browser-local saves and JSON export are not cloud persistence. Do not enable a cloud-save UI until a dedicated authorized Supabase project exists, the migration is applied, authenticated CRUD is implemented, and cross-user RLS tests pass.
- [ ] Dedicated Infracis Supabase project approved and selected.
- [ ] Apply migration and verify migration history, tables, indexes, policies, grants, and ownership.
- [ ] Authenticated create/read/update/delete integration tests.
- [ ] Cross-user isolation tests for SELECT, UPDATE, DELETE, and attempts to change owner.
- [ ] Keep UI labels explicit: reports are stored in this browser only until cloud persistence ships.

## P1 — real-data pilot
- [x] Run a bounded [Delhi NCR live-provider pilot](https://github.com/kaustubhdua/infracis/actions/runs/40810236672) against 20 varied location queries on the current provider-pilot code and retain the measured [workflow artifact](https://github.com/kaustubhdua/infracis/actions/runs/40810236672).
- [x] Re-run the bounded pilot after the Overpass failover change; [run 40812600499 and its artifact](https://github.com/kaustubhdua/infracis/actions/runs/40812600499) checked out `main` at code commit `8e87f8b9ea8cb2f36424b14e4950c3381c981153`.
- [ ] Independently spot-check geocoder relevance against source pages/maps; a valid response shape does not prove the resolved label matches the requested neighbourhood.
- [ ] Select a terms-appropriate, capacity-matched hosted provider or managed self-hosted Overpass instance, verify its policy and availability, then rerun a controlled pilot before relying on amenity data.
- [ ] Report coverage only as measured counts/rates with denominators; do not invent a completeness percentage.
- [ ] Document failed, ambiguous, stale, and partial results, and confirm provider terms/attribution.

**Measured pilot A, 2026-10-29 (20 requested locations; artifact from run [40810236672](https://github.com/kaustubhdua/infracis/actions/runs/40810236672), SHA `97f8272f4e4720aad854c27d2e7f3cd05cffe2af`):**
- Nominatim: 18/20 valid-shaped geocoding responses (90%); two returned no valid match. Shape validation is not semantic locality verification.
- Open-Meteo forecast: 12/18 field-complete responses (66.7%) for successfully geocoded locations.
- Open-Meteo air quality: 13/18 field-complete responses (72.2%) for successfully geocoded locations.
- Overpass amenities: 0/18 valid responses; requests timed out or returned HTTP 502.

The pilot workflow uses an isolated trigger branch but checks out `main` explicitly for the actual script. The figures above are a single point-in-time probe, not an SLA or a claim about provider-wide availability. The validator requires every requested numeric field to be present and finite, supports the same bounded sequential endpoint list as the app, and records per-endpoint host/status/latency without endpoint paths or query parameters. Weather and air-quality provider flakiness remains visible and must not be hidden with imputation. The Overpass adapter now has bounded best-effort public failover for low-volume evaluation; the prior 0/18 result remains a warning until the post-change pilot shows otherwise. Open-Meteo failures must stay unknown rather than be imputed. The run artifact expires 2026-11-27; retain its findings in this runbook and avoid relying on the temporary artifact link alone.

**Measured pilot B — after bounded Overpass failover, 2026-10-29 (20 requested locations; [run and artifact 40812600499](https://github.com/kaustubhdua/infracis/actions/runs/40812600499), trigger SHA `8467e2f046e55517a16f6434311f31412e549684`; workflow checked out main code commit `8e87f8b9ea8cb2f36424b14e4950c3381c981153`):**
- Geocoding: 18/20 valid responses (90.0%); Anand Vihar and Mayur Vihar Phase 1 did not resolve to valid matches.
- Weather: 10/18 valid responses (55.6%).
- Air quality: 10/18 valid responses (55.6%).
- Overpass amenities: 0/18 valid responses (0.0%). Private.coffee timed out on sampled requests; FOSSGIS returned HTTP 502 or timed out. Sequential fallback increased latency but produced no valid amenity response in this sample.
- The artifact was uploaded at 2026-10-29T03:38:22Z; digest: `sha256:41bf24e8d7b28285d520ab9cad7a309cc1c2047f844ad2ab7a4452762abe9fa8`.

**Decision:** public Overpass endpoints are not validated as a dependable source for this app. Do not present empty amenity results as zero amenities or enable claims that depend on nearby amenities. Next, configure and test a terms-appropriate, capacity-matched hosted provider or managed self-hosted instance; simply adding more public endpoints is not evidence of reliability. Weather and air-quality responses also showed significant transient fetch failures and need a controlled repeat after network/provider diagnosis.
 
**Measured pilot C — using the production geocoder relevance selector, 2026-10-29 (20 requested locations; [run and artifact 40813727336](https://github.com/kaustubhdua/infracis/actions/runs/40813727336), trigger SHA 2b82c6291e91dc4ce37d8960a1a979a68158fa4f; workflow checked out main code commit 0b363572149ed8ae955afad867f7042fba2e0f02):**
- Geocoding: 8/20 accepted (40.0%). This is lower than the earlier raw response-shape pilot because the conservative selector rejects uncertain matches; the failures cluster around Delhi locality labels and are not proof that the localities do not exist.
- Weather: 5/8 field-complete responses (62.5%).
- Air quality: 4/8 field-complete responses (50.0%).
- Overpass amenities: 0/8 valid responses (0.0%); requests timed out or returned HTTP 502.
- Artifact digest: sha256:63a0a8ddaf3206b60631e85129bd149c8d28f8627fbe100e934a5158689e26c3.

**Geocoder follow-up:** PR #114 adds a narrowly scoped New Delhi/Delhi city-context normalization while retaining locality and numeric-sector checks. It must pass CI and be re-piloted before the relevance acceptance rate can be considered improved. Do not relax the guard to accept nearby points of interest just to increase the pass rate.



## P1 — full user journey and accessibility
- [ ] Mobile (at least 360px wide) and desktop: search, map pick, evidence detail/source links, comparison, export, local save/reopen/delete, provider failure.
- [ ] Keyboard-only navigation and visible focus; screen-reader labels; contrast; reduced motion.
- [ ] Automated accessibility scan and manual review with evidence attached.
- [ ] Verify no horizontal overflow, clipped text, broken links, empty states, and loading/error states.

## P1 — deployment
- [ ] Identify the authorized hosting project and verified live URL.
- [ ] Record deployed commit SHA and ensure it equals the release candidate SHA.
- [ ] Configure dedicated Redis credentials in the actual deployment without exposing them to the browser.
- [ ] Smoke-test health, analyze, compare, real provider-backed queries, invalid input, throttling, and upstream outage.
- [ ] Configure monitoring/alert routing, define rollback triggers, and prove the rollback path.
- [ ] Verify provider terms: public Nominatim <=1 request/second app-wide with attribution; confirm Open-Meteo plan permits the intended use and attribution is correct.

The connected-account check previously found no dedicated Infracis Vercel project. This does not prove that no deployment exists elsewhere; it means a deployment URL and deployed SHA are not verified here.

## P2 — product validation
- [ ] Interview at least five target buyers/renters; record anonymized notes and observed pain points.
- [ ] Define a primary success metric and guardrails (for example, the share of pilot users who identify and correctly cite an actionable due-diligence check).
- [ ] Run a small usability test and publish results including failures, not only positive quotes.
- [ ] Create a feedback intake path, owner, review cadence, and decision log.

## Architecture check
The repository contains the active Next.js app with server-side TypeScript API routes and a separate FastAPI source tree under `backend/`. The FastAPI service is not deployed and is not connected to the current frontend; the Next.js routes remain the active API. Before switching traffic, verify the backend API contract against `LocationReport`, choose one canonical provider implementation, run live provider and operational tests, and verify hosting/security configuration. Backend source presence is not evidence of deployment or frontend integration.

A dedicated Supabase migration file exists, but that does not prove a database project is provisioned or migration applied. Do not modify unrelated projects or use their credentials to satisfy a checklist.

## Release decision
Until the P0/P1 gates above have evidence, describe Infracis as a functional MVP under release verification, not a production-proven service. Never claim that data coverage, cloud persistence, a separate backend, or a live deployment exists unless it has been independently verified.


## Standalone backend source preparation (not a deployment)

**Status: source files added; not deployed and not connected to the frontend.** The separate FastAPI service is in `backend/`, with a Dockerfile for a future hosting step, environment template, API-key guard, Redis-backed shared rate limiting, Nominatim slot reservation, real provider adapters, health/readiness endpoints, and tests. This is not evidence that the service has been run, that Redis is provisioned, or that providers have been exercised from a deployed instance.

Before a future backend upload/hosting step:
- [x] Run `cd backend && pip install -r requirements.txt && pytest -q` in a clean Python 3.12 environment; [Backend CI passed 21 tests on merged candidate `2586e1bbd9e9a7fda5d5ed741556a540b627737c`](https://github.com/kaustubhdua/infracis/actions/runs/40671914079).
- [x] Confirm the backend CI workflow passes on the exact merged branch commit: [Backend CI run](https://github.com/kaustubhdua/infracis/actions/runs/40671914079).
- [x] Add `backend/requirements-lock.txt`, install it in Docker/CI, verify declared ranges remain compatible, run `pip check`, and audit the resolved environment with `pip-audit`; [Backend CI passed 21 tests and reported no known vulnerabilities](https://github.com/kaustubhdua/infracis/actions/runs/40687905494). The lock pins versions but does not yet pin artifact hashes.
- [ ] Review security settings and trusted-proxy configuration for the selected host.
- [ ] Contract-test the FastAPI response against the frontend. It currently does not return the full TypeScript `LocationReport` schema.
- [ ] Decide which API implementation is canonical before switching frontend traffic; avoid maintaining divergent provider logic.
- [ ] Add Supabase Auth and RLS-protected persistence only as a separate reviewed feature. No cloud-save behavior is claimed by this backend.

No deployment was performed as requested.
