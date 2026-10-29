# Infracis architecture

## Product boundary

Infracis is an evidence-first location due-diligence tool for people comparing residential locations. It reports sourced observations, deterministic calculations, model-derived values, and explicit unknowns. It is not a property valuation engine, legal-title service, engineering inspection, crime/flood predictor, or safety guarantee.

## Active implementation

### Web application
- Next.js App Router, TypeScript, Tailwind CSS, React, and Leaflet.
- Main analysis workflow: `app/analyze-client.tsx`.
- Evidence, comparison, methodology, map, checklist, decision brief, and saved-report UI live under `components/`.
- Saved reports and JSON export are browser-local. There is no working cloud-sync workflow or user account system.

### Active API
The current frontend calls the Next.js route handlers:
- `POST /api/analyze`
- `POST /api/compare`
- `GET /api/health`

They validate request bodies and query/coordinate bounds, use bounded upstream requests, and preserve partial provider failures as unavailable/unknown. Analysis and comparison use a shared Redis-backed request limiter in production and fail closed with HTTP 503 if the shared limiter is missing or unreachable.

The separate `backend/` directory contains a FastAPI service prepared for later hosting. It is **not deployed and is not connected to the current frontend**. Its response schema differs from the frontend's `LocationReport`; do not switch traffic until a canonical contract and contract tests are agreed and the service has passed its own real-provider and operational checks.

## Provider adapters and evidence

| Source | Current use | Reliability and policy constraints |
|---|---|---|
| OpenStreetMap Nominatim | Explicit user-submitted text geocoding | Shared Redis slot reservation aims to enforce at most one uncached request/second app-wide. No autocomplete. Public endpoint is best-effort; returned labels still need relevance verification. |
| Open-Meteo forecast | Weather model output at resolved coordinates | Model output, not a property-site sensor. Free API is non-commercial and requires attribution; confirm the appropriate plan before commercial use. |
| Open-Meteo air quality | Grid/model-derived air-quality output | Not a street-level monitoring station. Some live pilot requests failed; failures remain unknown. |
| OpenStreetMap/Overpass | Mapped amenities around the point | Production retrieval is disabled unless a verified HTTPS endpoint is configured. The 20-location pilot had no valid Overpass responses. Mapped features are incomplete and can be stale. |
| OpenStreetMap raster tiles | Street map background | Use visible attribution, compliant endpoint and caching; public tile hosting has no production SLA. |
| NASA GIBS | Optional VIIRS true-colour satellite overlay in the interactive map | Uses public Earthdata GIBS tiles; this map layer does not read `NASA_API_KEY`. The imagery date is deliberately lagged to reduce missing-tile errors and can still be unavailable. NASA imagery is contextual imagery, not a property-level hazard classification. |

The provider adapters are in `lib/providers/`. Shared Redis cache and Nominatim request-slot reservation are in `lib/shared-provider-cache.ts`; API rate limiting is in `lib/distributed-rate-limit.ts`. The Overpass adapter supports up to three configured HTTPS endpoints with bounded sequential failover, but the default public endpoints did not produce valid amenity responses in the latest Delhi NCR pilot. Treat mapped amenities as unavailable until a terms-appropriate endpoint is configured and passes the pilot.

### Evidence contract
Reports distinguish:
- **Observed**: a source-returned record, with the source's own limitations.
- **Provider model**: weather/air-quality model outputs and other gridded products.
- **Calculated**: deterministic metrics derived from identified inputs and documented formulas.
- **Rule-based interpretation**: deterministic explanatory text assembled by `lib/synthesizer.ts` from evidence IDs.
- **AI interpretation**: optional Groq narrative via `POST /api/ai-insight`, with the `GROQ_API_KEY` read only on the server. The route sends a bounded, sanitized summary of the report to Groq; the narrative does not replace source records or supply new facts. Missing configuration or provider failure leaves the deterministic report available.
- **Unknown**: unavailable, malformed, stale, or unverified evidence.

A missing amenity is not evidence that the service does not exist. A successful HTTP response is not proof that a geocoded label matches the intended neighbourhood. No synthetic substitute values are allowed for unavailable real providers.

## Request flow

1. User submits a location query or selects coordinates on the map.
2. The API validates the payload and applies shared rate limiting.
3. Nominatim resolves text queries; user-selected coordinates are labelled as user-supplied rather than provider-verified addresses.
4. Weather, air quality, and configured amenity providers are queried with bounded timeouts.
5. Provider responses are schema-checked and normalized.
6. The evidence engine calculates transparent metrics and produces explicit unknowns for unavailable layers.
7. The UI renders source, retrieval/observation timestamps when supplied, coverage, limitations, and next checks.
8. The user can compare locations, print/export a report, or save a copy in the current browser.

## Caching and privacy

When configured, shared Redis temporarily stores:
- normalized geocoding query/result data for up to 24 hours;
- weather data for up to 5 minutes;
- air-quality data for up to 10 minutes;
- mapped amenities for up to 1 hour;
- rate-limit counters and the global Nominatim request-slot timestamp.

The privacy page documents these behaviors. The actual deployment operator must verify access controls, retention, deletion, and telemetry settings before public launch. Do not include names or personal details in location searches. Locality ratings and notes are private browser/device records after explicit opt-in; they are not sent to a server and do not create a public aggregate or community rating.

## Persistence

A Supabase migration exists in the repository, but no dedicated Infracis project or successful migration application has been verified. Cloud persistence must remain disabled until a dedicated project is authorized, the migration and RLS policies are verified, authentication and owner-scoped CRUD are implemented, and cross-user isolation tests pass. Browser-local saves must continue to be labelled as local.

## Security and operational controls

Implemented in source:
- request body size limits and JSON shape validation;
- query length and coordinate range validation;
- provider timeout and response-shape/range validation;
- escaped provider-sourced text in map HTML;
- shared Redis-backed request limiting and cache helpers;
- production fail-closed behavior when shared rate limiting is unavailable;
- explicit source-unavailable states instead of fabricated data.

Still requiring operational proof:
- real Redis concurrency testing across independent instances;
- outage and recovery testing;
- trusted client-IP behavior on the eventual hosting platform;
- real provider failure/recovery and semantic geocoding relevance tests;
- review of logs, secrets, retention, and monitoring;
- deployed browser, accessibility, and end-to-end smoke tests.

## Release principle

A code path or unit test is not proof of a live service. A green CI run verifies the repository candidate only. Production readiness requires a green exact SHA, verified provider terms/configuration, live-provider reliability, real Redis operational tests, accessibility/product validation, and a deployed smoke test after deployment is authorized.
