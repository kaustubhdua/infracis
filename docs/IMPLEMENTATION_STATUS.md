# Infracis Implementation & Verification Status

**Last updated:** 29 October 2026  
**Latest CI-verified main commit:** `275b97e7ad582033054810a3788e9c789598de20`  
**Current status:** Feature-rich MVP with green repository CI. Production readiness is **not established**.

This document separates code and automated-test evidence from operational evidence. A green build does not prove provider availability, deployment health, cloud persistence, accessibility conformance, or that the product is useful to real users.

## 1. Implemented product capabilities

- Explicit user-submitted location geocoding through OpenStreetMap Nominatim, with conservative multi-candidate query-token relevance checks, rejection of weak/tied matches, and a class/address-type guard against nearby POIs being substituted for locality searches; the heuristic is not a guarantee of semantic correctness.
- Real provider adapters for Open-Meteo weather and air-quality model data.
- OpenStreetMap/Overpass amenity adapter, but production amenity retrieval is deliberately unavailable unless a verified HTTPS endpoint is configured. Up to three operator-configured HTTPS endpoints can be tried sequentially after timeout, upstream error, or malformed response; no public endpoint is assumed reliable.
- Evidence records with source URLs, retrieval/observation timestamps where supplied, geographic resolution, and limitations.
- Deterministic proximity/completeness calculations and explicit unknowns when providers fail.
- Two-location comparison with preference profiles and incomparable states when data is missing; unsupported preference values return a validation error.
- Interactive Leaflet map with resize-aware lifecycle, separate marker-layer updates, retry handling, and fallback to OpenStreetMap tiles if a custom tile endpoint fails.
- Optional NASA GIBS VIIRS true-colour Earth-observation imagery overlay, with a recent imagery date and NASA attribution. It is contextual imagery only, not parcel-level hazard evidence.
- Explicit browser geolocation flow with user-triggered permission, cached Nominatim reverse-geocoding, and preservation of the exact browser coordinates in the report.
- Groq-backed AI interpretation panels for individual location reports and comparisons, with server-side-only `GROQ_API_KEY`, allowlisted report projection, rate limits, payload bounds, timeout handling, and cautious evidence-only prompting. Default model is `openai/gpt-oss-20b`.
- Private browser-local locality reviews with an overall 1–5 rating plus optional walkability, public-transport, noise-comfort, street-lighting, and cleanliness ratings; notes are capped at 1,200 characters, malformed browser records are validated, legacy overall-only records are read without inventing dimensions, and cookie/localStorage opt-in gates the feature. These are personal observations only, not public community reviews or aggregate scores, and they do not affect provider evidence or personal-fit calculations.
- Preference-based locality fit panel with balanced, family, transit-first, healthcare-first, and quietness profiles. It transparently weights only available deterministic access metrics, persists the preference on the user's device, and returns an unscored state for quietness because validated noise evidence is not available. This is a personal fit indicator, not a property rating or recommendation.
- Due-diligence checklist, evidence-led decision brief, methodology/source details, and print styling.
- Browser-local saved reports with export, reopen, and delete; full reports are stored in `localStorage` (cookies are used only for small preferences because of their size limits). The saved-reports modal and report/compare/methodology/map/review sections are lazy-loaded.
- Explicit location-resolution disclosure asking users to verify the resolved label and pin before relying on distance metrics.
- Accessible saved-report dialog semantics, keyboard focus management, Escape-to-close behavior, storage error states, and malformed saved-record filtering.
- Race-safe comparison UI that discards stale responses and clears outdated results when the locations or preference change.
- Stable empty-amenity fallback for the Leaflet map so unavailable amenity data does not cause needless map reinitialization.
- Privacy page describing provider data flows, browser-local storage, and current operational limits.
- Shared Redis-backed rate-limit counters, Nominatim request-slot reservation, and provider cache implementation. Production analysis/comparison fail closed when shared Redis is absent or unavailable; automated tests cover Redis command shape, key namespacing, expiry, malformed cached JSON, and outage cache misses, but not real multi-instance behavior.
- Separate FastAPI backend source under `backend/`, with tests and CI. It is not deployed or connected to the active Next.js frontend; the Next.js route handlers remain the active API.
- Supabase migration source exists, but it has not been verified as applied and does not constitute a working cloud-save flow. No dedicated Infracis Supabase project is connected. Shared cross-user reviews/ratings and cloud report persistence remain blocked until a dedicated project, Auth, RLS policies, migration verification, and cross-user isolation tests are completed.
- The separate backend now has a version-pinned Linux/container dependency file (`backend/requirements-lock.txt`); Backend CI installs it, verifies compatibility with the declared ranges, runs `pip check` and `pip-audit`, and passes 21 tests. The lock is version-pinned but not hash-pinned; the backend is still not connected to the frontend or deployed.

## 2. Current repository verification

The `main` commit `275b97e7ad582033054810a3788e9c789598de20` passed [GitHub Actions CI](https://github.com/kaustubhdua/infracis/actions/runs/40817124962) on 29 October 2026:

- Locked dependency installation succeeded.
- Production and full npm audits each reported zero vulnerabilities.
- Unit tests passed (see the linked run for the exact job output).
- ESLint passed.
- TypeScript type-check passed.
- Production build passed.

The tests include route-level request validation, rate-limit responses, sanitized provider errors, forwarded-IP trust boundaries, request-body size handling, geospatial calculations, evidence provenance, comparison behavior, provider response schema validation and configured Overpass failover, local saved-report parsing, HTML escaping, and Redis-backed rate-limit/cache command behavior.

These are repository checks. The Redis tests use mocked REST responses and do not establish true multi-instance concurrency or outage recovery. Provider schema tests do not establish live provider availability or location relevance.

## 3. Real provider pilot (28 October 2026)

A bounded [20-location Delhi NCR live-provider pilot](https://github.com/kaustubhdua/infracis/actions/runs/40660404776) was run. Its measured results were:

- **Nominatim:** 18/20 valid-shaped geocoding responses (90%); two had no valid match. Some valid responses resolved to nearby POIs rather than the requested neighbourhood, so semantic relevance remains unverified.
- **Open-Meteo forecast:** 11/18 valid responses (61.1%); seven failed in this run.
- **Open-Meteo air quality:** 11/18 valid responses (61.1%); seven failed in this run.
- **Overpass amenities:** 0/18 valid responses; requests timed out or returned HTTP 502.

This was a single point-in-time probe, not an SLA or a claim about provider-wide availability. Its weather/air-quality pass criteria were looser than the current script (at least one requested numeric field rather than all requested fields), so those historical percentages are not comparable with future pilot runs. The current pilot script now uses strict all-field validation and supports the configured bounded Overpass failover list. It demonstrates that real provider reliability is still a release blocker. The UI must continue to show failed/disabled sources as unavailable; do not impute values or turn a failed amenity request into a zero-amenities result. The temporary workflow artifact has limited retention, so the measured findings are also recorded in the production runbook.

## 4. Provider and data caveats

| Provider | Role | Remaining constraints |
|---|---|---|
| OpenStreetMap Nominatim | Explicit text-query geocoding | Public endpoint is limited to one request/second app-wide, must be identified and attributed, and must not be used for autocomplete or systematic high-volume queries. Returned labels still need relevance verification. |
| Open-Meteo | Weather and air-quality model outputs | These are model/grid products, not on-site sensor readings. The free API is non-commercial; commercial use needs a suitable subscription or a compliant alternative. |
| OpenStreetMap via Overpass | Nearby mapped amenities | Production requests remain disabled until a verified HTTPS endpoint is configured. Up to three operator-verified HTTPS endpoints can be tried sequentially; public instances are best-effort, and mapped features may be incomplete, stale, or missing. |
| OpenStreetMap tiles | Interactive map | Use compliant tile hosting, visible attribution, and normal caching; public tile service has no production SLA. |

Infracis does **not** verify legal title, structural condition, crime rates, flood safety, property valuation, or guarantee neighborhood safety. Do not infer these claims from available data.

## 5. Remaining release gates

### P0 — operational reliability and security

- Configure a dedicated Infracis Redis store in the eventual hosting environment.
- Test aggregate Nominatim pacing against at least two independent running instances; verify outage, timeout, recovery, and cache behavior with real Redis.
- Test deployed request limits under concurrent load and verify that client-IP identity comes only from trusted hosting infrastructure.
- Complete secret scanning and review runtime logs for sensitive location-query retention.
- Run live provider failure/recovery tests after selecting and verifying a suitable Overpass endpoint; re-run and review geocoder relevance.

### P0 — provider terms and capacity

- Confirm the Open-Meteo plan is appropriate for the product's actual commercial/non-commercial use.
- Confirm endpoint-specific terms, attribution, quotas, and operational expectations for geocoding, tiles, and amenities.
- Do not enable a production provider just because it appears in a public endpoint list; test it with bounded queries and document its policy first.

### P1 — product workflow and user experience

- Perform real mobile-browser QA at 360px and wider, desktop QA, keyboard-only navigation, screen-reader review, contrast checks, reduced-motion checks, and an automated accessibility scan.
- Exercise the complete journey: location search/map selection → source evidence → unknowns → compare → decision brief → local save/reopen/delete → JSON export/print.
- Conduct the 5–8 user research sessions in [Product Validation](PRODUCT_VALIDATION.md). Do not claim user validation until sessions actually happen and anonymized results are recorded.
- Independently spot-check location matches and record false/ambiguous results with clear recovery UI.

### P1 — persistence and architecture

- Keep local browser saving clearly labeled until a dedicated Infracis Supabase project is authorized, migration history/schema/RLS are verified, authenticated CRUD is implemented, and cross-user isolation tests pass.
- Before integrating the separate FastAPI service, align its response contract with the frontend `LocationReport`, add contract tests, choose a single canonical provider path, and verify its authentication and hosting setup.
- Improve the backend lockfile with artifact hashes before treating it as maximally reproducible; the current Linux/container lock pins package versions and is CI-tested, but is not hash-pinned.

### Release / deployment

- **No deployment was performed as part of this work.**
- After the operational gates above are satisfied and deployment is authorized, deploy a specific green SHA, then smoke-test the real domain, health endpoint, valid/invalid analyze requests, compare requests, provider failure states, and rate limiting.
- Record the deployed SHA, runtime configuration, provider plan/endpoint choices, test results, rollback procedure, and incident contact before calling the hosted service production-ready.

Until these gates have evidence, describe Infracis as a functional, tested MVP under operational verification—not a production-proven service.
