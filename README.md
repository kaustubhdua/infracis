# Infracis

**Evidence-first location due diligence for property decisions.**

Infracis helps a home buyer or renter investigate a location before committing to a property. It brings together sourced location evidence, transparent analysis, and explicit unknowns in one decision report.

> **Product principle:** No unsupported risk claims. Every material finding must be traceable to a source, a timestamp, and a method—or be labeled as an inference or unknown.

## The initial product

The first release focuses on **one user: a home buyer/renter evaluating a specific location**.

A user searches for a place, reviews nearby amenities and available environmental/hazard context, compares it with a second location, and receives a report that separates:

- **Observed facts** — retrieved from a named source.
- **Calculated metrics** — derived using documented formulas.
- **Model-assisted interpretations** — AI-generated explanations grounded in retrieved evidence.
- **Unknowns** — unavailable, stale, incomplete, or unverified information.

The first release is not a property valuation engine, legal title verification service, safety guarantee, or investment recommendation.

## Why this matters

Property listings usually optimize discovery of properties. Infracis focuses on the location-specific questions a buyer needs to investigate before deciding: what is known, what could matter to my preferences, how current is the evidence, and what should I verify next?

Existing products already offer real-estate analytics and location/risk layers. Infracis must differentiate through **auditable evidence, uncertainty-aware comparison, and actionable due-diligence gaps**, not simply by combining maps with an AI summary.

## MVP scope

1. Search for a real location or choose a point on a map.
2. Collect evidence from a small, documented set of real data sources.
3. Display source, observation time, retrieval time, coverage, and limitations.
4. Calculate simple, deterministic proximity/amenity metrics.
5. Compare two locations using the same criteria.
6. Generate an evidence-linked report with findings, unknowns, and next checks.
7. Persist reports only after the core flow works reliably.

## Non-goals for the first release

- Nationwide completeness.
- Builder/site-development scoring.
- Unsupported crime or flood predictions.
- Fake live metrics, synthetic property records presented as real, or invented source coverage.
- AI-generated scores without visible formulas and evidence.
- Legal, financial, or engineering certification.

## Documentation

- [Product roadmap](docs/ROADMAP.md)
- [Research and competitive landscape](docs/RESEARCH.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data provenance and scoring policy](docs/DATA_POLICY.md)
- [Provider source registry and launch gates](docs/SOURCE_REGISTRY.md)
- [MVP acceptance and test plan](docs/TEST_PLAN.md)
- [Production release runbook](docs/PRODUCTION_RUNBOOK.md)
- [Product validation protocol](docs/PRODUCT_VALIDATION.md)

## Proposed stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Map: Leaflet with properly attributed OpenStreetMap data
- Backend/data: Supabase (Postgres, Auth, Storage, Row Level Security)
- Geospatial utilities: PostGIS where enabled, otherwise well-tested geospatial helpers
- AI: optional provider adapter for evidence-grounded explanations; deterministic calculations remain outside the model
- Deployment: Vercel or another supported host after local build and environment configuration are verified

## Current implementation status

The repository now includes an interactive location-analysis flow backed by real public services:
- OpenStreetMap Nominatim for user-submitted location geocoding.
- Open-Meteo for current weather-model output at the resolved coordinate.
- OpenStreetMap via Overpass for a bounded sample of mapped amenities around the coordinate.

The UI shows source URLs, retrieval time, source availability, and limitations. If weather or amenity retrieval fails, the UI shows an unavailable state instead of substituting synthetic values. This is a working initial integration, **not proof of production readiness**: build/CI, live end-to-end tests, multi-instance rate limiting, provider reliability, security review, accessibility QA, and deployment still need to be verified.

The public Nominatim service is rate-limited and must not be used for autocomplete or high-volume traffic. Production API requests now require a configured shared Redis limiter; geocoding slot reservations and provider caches use the same dedicated Redis service. The implementation remains unverified until Redis-backed concurrent and multi-instance tests pass.

Weather values are model output, not on-site measurements. Mapped amenities are not guaranteed to be complete, open, accessible, or high-quality. This version does not make flood, crime, pollution, title, structural, or property-value claims.

## Production release warning

This repository is a functional MVP, not yet verified as production-ready. Before public or commercial launch:

- Verify the branch-pinned Next.js 15.5.28 dependency and npm-generated lockfile using a green GitHub Actions run on the exact release candidate SHA; do not infer success from package metadata alone.
- Confirm the Open-Meteo service plan matches the intended use. Its free API tier is for non-commercial use; commercial use requires an appropriate plan or a compliant self-hosted alternative. Attribute data under CC BY 4.0.
- Configure a dedicated Upstash Redis REST store for the deployment. The API now fails closed in production if the shared limiter is absent or unreachable; Nominatim request-slot reservations and provider cache are shared through Redis. Prove aggregate limits under concurrent requests and across instances before launch.
- Confirm GitHub Actions is green for the exact release commit and verify the actual deployed domain. A manual 20-location Delhi NCR live-provider pilot is available via `.github/workflows/provider-pilot.yml`; its artifact is evidence only after the workflow is actually run and reviewed.
- Saved reports are explicitly browser-local; cloud save is deferred. No dedicated Infracis Supabase project was found in the connected account, and the migration is not considered applied. Do not use unrelated projects.

References: [Next.js support policy](https://nextjs.org/support-policy), [Next.js security advisories](https://github.com/vercel/next.js/security/advisories), [Open-Meteo terms](https://open-meteo.com/en/terms), [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Development principles

- Real data or clearly labeled demo fixtures only.
- Cite sources inline for consequential findings.
- Fail visibly when a provider is unavailable; do not silently substitute fabricated data.
- Keep secrets server-side and out of committed files.
- Test failure paths and data freshness as first-class behavior.
- Use accessible UI patterns and mobile-first responsive layouts.


## Standalone backend source (prepared, not deployed)

A separate FastAPI backend now lives in `backend/` for the later hosting step. The existing Next.js route handlers remain the active API; this standalone service is **not yet connected to the frontend and has not been deployed**.

- [Backend README and local run instructions](backend/README.md)
- [FastAPI service](backend/app/main.py)
- [Backend configuration example](backend/.env.example)
- [Backend tests](backend/tests/test_api.py)
- [Backend CI workflow](.github/workflows/backend-ci.yml)

The backend integrates real Nominatim, Open-Meteo, and Overpass endpoints. It validates inputs, requires server-to-server authentication when configured, uses Redis for shared request limiting and Nominatim request pacing, and reports provider failures explicitly rather than generating substitute data. It does not yet implement Supabase report persistence or user authentication. Do not expose backend secrets in browser variables. See the backend README for the local setup and verification commands.
