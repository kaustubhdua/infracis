# Implementation status

Last updated: 28 October 2026.

This document separates code present in the repository from behaviors that have actually been executed and verified.

## Implemented in source

- Next.js App Router application scaffold with responsive landing page.
- User-submitted location search form; no autocomplete.
- Server route resolves a location through OpenStreetMap Nominatim.
- Server route requests current Open-Meteo weather-model values for the resolved coordinate.
- Server route requests a bounded sample of mapped amenities from Overpass.
- UI renders source names, links, retrieval timestamp, status, and source limitations.
- Provider failures render an unavailable state instead of fake values.
- Basic in-process cache and per-instance request throttling.
- Health endpoint that clearly does not imply upstream services are healthy.
- CI workflow configured for dependency installation, ESLint, TypeScript, and production build.

## Not verified in this environment

The execution environment could not resolve github.com for a clone, so dependencies could not be installed locally and no local build or test run could be completed. A GitHub status lookup returned no check statuses for the inspected latest commit at the time of the check. Treat build and deployment as unverified until GitHub Actions produces a successful run.

## Important production blockers

1. **Shared rate limiting and caching:** the current in-memory map is per process/instance and can be lost on cold start. It is not a sufficient production abuse-control mechanism for a horizontally scaled deployment. Use a shared cache/rate limiter or a provider whose terms and capacity support the deployment.
2. **Upstream capacity:** Nominatim and Overpass are community-operated public services, not an uptime guarantee. Confirm current usage policies and switch to a suitable hosted or self-hosted service before meaningful public traffic.
3. **Input/IP trust:** deployment-specific trusted proxy behavior must be reviewed before relying on forwarded IP headers for throttling.
4. **Real integration tests:** test live requests, timeouts, 429/5xx responses, malformed payloads, empty geocoding results, and partial source failure.
5. **Persistence/auth:** reports are not saved; Supabase auth, database schema, and row-level security are not implemented.
6. **No AI report yet:** no model is connected, so the product currently reports retrieved context rather than generating an AI due-diligence conclusion.
7. **No hazard or legal analysis:** no flood, crime, pollution, title, structural, or property-price claims are implemented.
8. **Deployment:** no live production URL has been verified from this repository work.
9. **Accessibility/performance:** the source uses semantic labels and reduced-motion styling, but automated and manual audits remain outstanding.
10. **Licensing/attribution review:** OpenStreetMap and Open-Meteo attribution is displayed, but final data retention, caching, and redistribution decisions require a review of current terms for the intended use.

## Release gate

Do not describe Infracis as production-ready until:
- GitHub Actions passes lint, type-check, and build.
- An end-to-end smoke test succeeds against a deployed preview.
- Both partial and total provider failure paths have been tested.
- Shared rate limiting and upstream-service usage compliance are addressed.
- Privacy, data retention, attribution, and security behavior are reviewed.
- A real user test validates the report's usefulness.
