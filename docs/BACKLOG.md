# Infracis prioritized backlog

**Status reviewed:** 28 October 2026  
**Current classification:** Functional MVP; production readiness is blocked by measured provider reliability and unverified operational configuration.

This backlog distinguishes code already present from operational work that requires real infrastructure, provider decisions, or human testing. A checkbox is only complete when the corresponding evidence exists.

## P0 — Trust and core correctness

### Implemented and CI-verified
- [x] Location analysis with user-submitted query or map-selected coordinates.
- [x] Source-linked evidence records and explicit unknowns for provider failures.
- [x] Deterministic proximity/completeness metrics with documented calculation formulas.
- [x] Two-location comparison and preference profiles; missing metrics can be incomparable.
- [x] Reject invalid comparison preference values rather than silently changing the user's selection.
- [x] Interactive Leaflet map, evidence cards, methodology, decision brief, due-diligence checklist, and print styling.
- [x] Browser-local saved reports, JSON export, reopen/delete, validation of persisted report structures, and replacement of stale copies for the same location.
- [x] Shared Redis rate-limiter, cache and Nominatim request-slot code; production analysis/comparison fail closed if shared Redis is unavailable.
- [x] Request body size, JSON shape, query length, and coordinate bounds validation.
- [x] Provider response schema/range validation for malformed upstream payloads.
- [x] Saved-report dialog keyboard behavior and storage-error feedback.
- [x] Race-safe comparison results and stable Leaflet behavior when amenity data is unavailable.
- [x] Privacy disclosures for conditional provider availability and temporary shared-cache retention.
- [x] Exact main candidate `d8d5784d6fdf4be5bd646a2eb71e2c4afc039e1a` passed [CI](https://github.com/kaustubhdua/infracis/actions/runs/40687905463): 83 tests across 13 files, lint, type-check, production build, and both npm audit checks (zero reported vulnerabilities). The geocoder ranks up to five Nominatim candidates and rejects weak/tied matches, plus rejects unqualified POIs as substitutes for locality searches using Nominatim class/address-type metadata. This reduces known mismatches but does not replace semantic spot-checks or a fresh provider pilot. The report UI asks users to verify the resolved place and map pin before relying on distance metrics.
- [x] Added route regression coverage for invalid inputs and 429/503 fail-closed rate-limit responses.
- [x] Added regression coverage for malformed Nominatim bounding-box data and Redis slot-reservation command construction.
- [x] Added shared provider-cache tests for namespaced GET/SET commands, TTL, malformed cached values, and production outage cache misses.
- [x] Added API route tests for ignoring untrusted `X-Forwarded-For` when no trusted proxy IP is present and sanitizing upstream provider errors.
- [x] Added bounded sequential Overpass endpoint failover (up to three operator-verified HTTPS endpoints) and regression tests for 502, malformed envelopes, and invalid endpoint configuration.
- [x] Added a pinned backend dependency file, Docker/CI installation from the lockfile, compatibility check, `pip check`, and `pip-audit`; [Backend CI](https://github.com/kaustubhdua/infracis/actions/runs/40687905494) passes 21 tests with no known vulnerabilities. The lock is version-pinned but not hash-pinned.

### Still open — do not claim production-ready
- [ ] Configure a dedicated Infracis Upstash Redis store in the eventual hosting environment.
- [ ] Run concurrent requests across at least two independent instances and prove aggregate Nominatim pacing remains within the public-service policy.
- [ ] Exercise Redis timeout, outage, recovery, cache expiry, and cache-miss behavior with a real store.
- [ ] Review the hosting platform's trusted client-IP behavior and test deployed abuse/rate-limit cases.
- [ ] Complete secret scanning and review location-query retention in logs/telemetry.
- [ ] Perform manual keyboard/screen-reader, contrast, reduced-motion, mobile, and automated accessibility testing.

## P0 — Real provider readiness

### Measured 20-location Delhi NCR pilot (28 October 2026)
- Nominatim: 18/20 valid-shaped responses (90%); two had no valid match. Some returned nearby POIs rather than the requested neighbourhood.
- Open-Meteo forecast: 11/18 valid responses (61.1%); seven failed in that run.
- Open-Meteo air quality: 11/18 valid responses (61.1%); seven failed in that run.
- Overpass amenities: 0/18 valid responses; requests timed out or returned HTTP 502.

These are one-time measurements, not an SLA. See [the production runbook](PRODUCTION_RUNBOOK.md) and [pilot workflow](https://github.com/kaustubhdua/infracis/actions/runs/40660404776).

- [ ] Independently verify geocoder relevance for ambiguous/neighbourhood searches and provide a clear correction/retry path.
- [ ] Select and verify an Overpass endpoint or compliant amenity provider. Production amenity requests must remain disabled until this is done.
- [ ] Run a bounded pilot against the selected amenity endpoint and record actual results, latency, failure classes, and source timestamps.
- [ ] Repeat the Open-Meteo pilot after configuration/query changes and investigate the observed failures.
- [ ] Confirm Open-Meteo plan/terms match the intended non-commercial or commercial use; retain required attribution.
- [ ] Verify all OSM/Nominatim/Overpass/tiles attribution and usage-policy requirements on the final UI/report.
- [ ] Keep unavailable values explicitly unknown; never substitute synthetic values or convert a provider failure to zero amenities.

## P1 — End-to-end product quality

- [ ] Run the full user journey in a real browser: search/map selection → evidence/source links → unknowns → compare → decision brief → save/reopen/delete → export/print.
- [ ] Test narrow mobile widths (including 360px), tablet, desktop, keyboard-only navigation, screen readers, and zoom/reflow.
- [ ] Test loading, empty, partial-provider-failure, retry, malformed saved-data, and local-storage quota/privacy modes.
- [ ] Independently verify source timestamps, coordinate labels, map attribution, distance calculations, and report export contents.
- [ ] Conduct 5–8 user sessions using [the product validation protocol](PRODUCT_VALIDATION.md); record anonymized observations and do not claim validation before sessions occur.
- [ ] Track user task completion and source/limitation comprehension only after actual user tests.

## P1 — Persistence and backend architecture

- [ ] Obtain authorization for a dedicated Infracis Supabase project; do not use an unrelated project.
- [ ] Apply and verify the committed migration, schema, grants, indexes, RLS, and migration history.
- [ ] Implement authenticated owner-scoped create/read/update/delete and cross-user isolation tests before enabling cloud save.
- [ ] Keep current saved reports labelled browser-local until cloud persistence is actually working.
- [ ] Decide whether the active Next.js API or standalone FastAPI service is the canonical backend.
- [ ] Align the FastAPI response with the frontend `LocationReport` contract and add contract tests before any frontend switch.
- [ ] Pin/lock Python dependency resolution for reproducible backend builds.
- [ ] Run backend tests and a bounded live-provider pilot separately; mocked tests are not provider proof.

## Release and deployment (not performed)

- [ ] Project owner chooses and adds an explicit repository license. No top-level `LICENSE` file is present; public visibility alone does not grant others permission to reuse or redistribute the code. Do not choose a license on the owner's behalf.
- [ ] Confirm exact candidate SHA is green on CI after all changes.
- [ ] Review dependency advisories and deprecated development-tool warnings before release.
- [ ] Configure and verify environment variables and provider endpoints in the chosen host.
- [ ] Deploy only after operational gates pass and deployment is authorized.
- [ ] Run production smoke tests for the real domain, health endpoint, valid/invalid analyze requests, compare requests, rate limiting, and provider failure states.
- [ ] Record deployed SHA, rollback steps, incident ownership, and operational monitoring.

**Release rule:** Do not call Infracis production-ready until the live-provider, Redis, privacy/security, user-validation, accessibility, and deployment gates have their own recorded evidence.
