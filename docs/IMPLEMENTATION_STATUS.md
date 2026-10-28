# Infracis Implementation & Verification Status

**Last updated:** 28 October 2026  
**Current status:** Feature-rich MVP; release verification is not complete for the current HEAD.

This document separates implemented code and historical test evidence from checks that have not been independently rerun against the latest commits. Do not treat a committed test report as proof that the current deployment is healthy.

## 1. Implemented product capabilities

- Location analysis through explicit user-submitted geocoding.
- Real provider adapters for OpenStreetMap Nominatim, Overpass, and Open-Meteo weather/air quality.
- Evidence records with source URLs, retrieval/observation timestamps where supplied, geographic resolution, and limitations.
- Deterministic proximity and completeness metrics, plus explicit unknowns when feeds fail.
- Two-location comparison with preference profiles and incomparable states for missing metrics.
- Interactive map and location pin selection.
- Location-specific due-diligence checklist and print styling.
- Evidence-led decision brief that surfaces actual source availability, explicit unknowns, and highest-priority checklist actions without inventing a property verdict.
- Local browser saved reports and JSON export.
- Health endpoint that reports the web route response, not upstream health.
- Supabase saved-report schema with RLS policies committed as a migration; this is not proof the migration has been applied or that cloud persistence is wired into the UI.
- GitHub Actions workflow configured to run lint, typecheck, and production build on pushes and pull requests to `main`.

## 2. Security/reliability hardening committed on 28 October

- `/api/analyze` validates JSON shape, query length, and coordinate range; bounds the size of its per-process rate-limit map and in-memory report cache; avoids caching analysis responses at HTTP/CDN level; and returns generic upstream failure messages. Provider-level Nominatim and Overpass caches are also size-bounded.
- `/api/compare` validates JSON shape and both query lengths; validates supported preference profiles by normalizing unknown values to the balanced profile; distinguishes unresolved locations from upstream failures; disables HTTP caching; and now applies its previously defined bounded per-process request throttle.
- Leaflet map popups escape provider-sourced location and amenity text before HTML insertion; dedicated unit tests cover HTML metacharacter escaping.
- The report UI avoids the overstated “Live Audited Report” label and explains that source-linked findings are not independent ground-truth verification.

These are defensive improvements, not a complete security review. Both endpoints still rely on in-process controls and public data providers. The analysis route's IP-based throttling is best-effort only: a shared, trusted rate limiter and provider-compliant production data strategy are required before high-volume public use.

## 3. Test evidence and current verification status

The repository contains Vitest suites for geospatial calculations, evidence provenance, and location comparison. Earlier project notes recorded 13 passing tests and a local live smoke test. Those historical notes are not a substitute for rerunning checks against the current HEAD after the latest API changes.

| Check | Current status |
|---|---|
| Unit tests on current HEAD | Not independently rerun in this session |
| TypeScript typecheck on current HEAD | Not independently rerun in this session |
| ESLint on current HEAD | Not independently rerun in this session |
| Production build on current HEAD | Not independently rerun in this session |
| GitHub Actions status for latest inspected commits | No status checks returned by GitHub connector at inspection time |
| Live production URL and runtime smoke test | Not verified in this session |
| Supabase migration applied to a real project | Not verified; do not assume applied |
| Cloud authentication and server-side saved-report persistence | Not implemented/verified as a complete user workflow |
| Shared production rate limiting and provider capacity | Not implemented/verified |

## 4. Data source caveats

| Provider | Used for | Important caveat |
|---|---|---|
| OpenStreetMap Nominatim | User-submitted location geocoding | Public service has a strict usage policy; no autocomplete or high-volume traffic. |
| OpenStreetMap via Overpass | Mapped nearby amenities | Map coverage can be incomplete; amenities may be missing or outdated. |
| Open-Meteo | Weather model output and air-quality estimates | Model/reanalysis data, not measurements from sensors at the property. Confirm current provider terms and quotas before commercial scale. |

Infracis does not currently verify legal title, structural condition, crime rates, flood safety, property valuation, or a guarantee of neighborhood safety. Never infer those claims from the available data.

## 5. Release gate

Before describing this as production-ready, complete and record all of the following:

1. Run `npm ci`, `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` on the exact commit to be released.
2. Confirm GitHub Actions reports green checks for that commit.
3. Perform a deployed smoke test of the home page, `/api/health`, valid and invalid `/api/analyze` requests, and valid/invalid `/api/compare` requests.
4. Add a trusted shared rate limiter, bounded provider timeouts/retries, and monitoring appropriate to the chosen host and traffic.
5. Choose a production-compliant geocoding/amenity strategy, review provider terms, attribution, quotas, and commercial-use conditions.
6. If cloud accounts/saved reports are part of the promised product, apply the Supabase migration, wire authentication and database persistence, and test RLS with multiple users. Otherwise clearly market saves as browser-local only.
7. Run accessibility and mobile browser QA, including keyboard navigation, map alternatives, loading/error/empty states, and export/print behavior.
8. Verify deployment configuration and the actual production domain; a deployment config file alone is not proof of deployment.

Until these gates are evidenced, describe Infracis as a functional MVP under verification—not a fully certified or production-proven service.
