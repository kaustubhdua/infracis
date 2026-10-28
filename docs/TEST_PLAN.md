# Infracis Verification & Test Plan

## Overview
This document specifies the verification criteria and automated test suite for the Infracis location due diligence product.

---

## 1. Test Execution Commands

```bash
# Run unit and integration test suite
npm run test

# Run TypeScript type checker
npm run typecheck

# Run ESLint validation
npm run lint

# Run production build
npm run build
```

---

## 2. Test Coverage & Specifications

### A. Geospatial Calculations (`tests/geo.test.ts`)
- **Haversine Distance Accuracy:** Verifies great-circle distance calculation against known ground coordinates (e.g., Connaught Place to India Gate ~2.4km).
- **Zero Distance Check:** Confirms identical coordinates evaluate to 0 meters.
- **Amenity Categorization:** Tests mapping of raw OpenStreetMap tags to standardized due diligence groups (`transit`, `education`, `healthcare`, `essentials`, `civic`, `other`).
- **Proximity Step Function:** Verifies decay formula (100% within ideal radius, 0% at max threshold, linear intermediate). Verifies missing/undefined values return `null` instead of `0`.
- **Completeness Index:** Validates percentage of verified dimensions (coords, weather, AQI, amenities, elevation).
- **Weather and AQI Code Interpretation:** Tests WMO code mapping and European AQI severity boundaries.

### B. Evidence Provenance Integrity (`tests/evidence.test.ts`)
- **Evidence Record Schema:** Ensures every record has non-empty ID, provider, source URL, limitations, and valid classification (`observed`, `provider_model`, `calculated`, `model_interpretation`, `unknown`).
- **Provider-model classification:** Weather, air-quality and DEM outputs must not be labelled as direct observations; tests assert `provider_model`.
- **Strict Grounding Validation:** Asserts that 100% of generated findings cite only valid evidence IDs present in the report payload.
- **Explicit Unknown Detection:** Confirms that when upstream providers are unavailable, the engine generates explicit unknown statements rather than substituting synthetic placeholders.

### C. Location Comparison Engine (`tests/comparison.test.ts`)
- **Delta Calculation:** Verifies delta calculation for distance, retail count, AQI, and elevation.
- **Preference-Weighted Evaluation:** Tests transit-first, family-first, and healthcare-first summary branches.
- **Incomparable Flagging:** Asserts that when one candidate location lacks verified mapped data, the metric is labeled `incomparable` with an explicit reason.

---

## 3. Test Results and Evidence Status

**Verified repository candidate (2026-10-28):** commit `d8d5784d6fdf4be5bd646a2eb71e2c4afc039e1a` passed [GitHub Actions CI](https://github.com/kaustubhdua/infracis/actions/runs/40687905463). The run completed `npm ci`, production and full `npm audit` checks (zero reported vulnerabilities), unit tests, lint, type-check, and production build successfully. The suite passed 83 tests across 13 files. The geocoder uses Nominatim result metadata to reject unqualified POIs for locality searches, with regression coverage; live semantic accuracy still requires a fresh pilot and manual spot-checks.

| Check | Evidence/status |
|---|---|
| Vitest suite | 83 tests passed across 13 files on the candidate above |
| TypeScript typecheck | Passed on the candidate above |
| ESLint | Passed on the candidate above |
| Production build | Passed on the candidate above |
| Dependency audit | Both npm audit steps reported zero vulnerabilities; deprecated dev-tool warnings still need maintenance review |
| GitHub Actions | [Green CI for exact candidate SHA](https://github.com/kaustubhdua/infracis/actions/runs/40687905463) |
| Live-provider reliability | Not passed: see measured 20-location pilot and failures in the [production runbook](PRODUCTION_RUNBOOK.md) |
| Deployed end-to-end smoke tests | Not run; no deployment performed |

**Pilot metric correction:** the original live pilot counted weather and air-quality responses as valid if at least one requested numeric field was finite. The script now requires every requested numeric field to be present and finite, supports the same bounded configured Overpass endpoint list as the app, and records endpoint host/status/latency without writing endpoint paths or query credentials to artifacts. The historical pilot figures are not comparable to future runs under the stricter definition; rerun the bounded pilot before using provider pass rates for a release decision.

**Backend verification:** the standalone backend uses a version-pinned Linux/container dependency file. [Backend CI](https://github.com/kaustubhdua/infracis/actions/runs/40687905494) installs the lockfile, verifies declared constraints, runs `pip check` and `pip-audit`, and passes 21 tests with no known vulnerabilities. The lock pins versions but not artifact hashes.

Automated route tests now cover malformed request bodies, coordinate bounds, query lengths, missing comparison fields, unsupported comparison preferences, fail-closed 429/503 rate-limit behavior, untrusted forwarded-IP headers, and sanitized provider errors. Provider schema tests cover malformed weather, air-quality, Overpass, configured endpoint failover, and optional Nominatim bounding-box payloads. Cache tests cover Redis command construction, key namespacing, expiry, malformed cache entries, and production cache misses on outage.
This is evidence for repository correctness only. It does not establish live provider reliability, cross-instance Redis behavior, real browser accessibility conformance, user validation, cloud persistence, or deployment health. Do not claim those gates are complete until their own evidence is recorded.


## 4. Standalone FastAPI backend (prepared for later hosting)

The Python service under `backend/` is a separate source-only API and is not connected to the current Next.js UI.

Run locally with Python 3.12+ and Redis available:

```bash
cd backend
python -m pip install -r requirements.txt
pytest -q
```

Automated tests cover health/readiness separation, strict input validation, API-key enforcement, production fail-closed configuration, coordinate math, numeric response validation, oversized request bodies, and explicit provider-unavailable responses. The backend CI workflow runs these tests on relevant pull requests.

These are mocked/local checks. They do not prove that real provider services are reachable, that Nominatim traffic is paced correctly across a hosted multi-instance environment, or that a production host has the correct secrets. Before future integration, add response-contract tests against the TypeScript `LocationReport` shape; the current FastAPI response intentionally differs from that schema.
