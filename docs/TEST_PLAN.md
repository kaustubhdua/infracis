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

The counts below were recorded in earlier project notes and are **historical**, not proof that the current branch passes. Do not publish them as current release evidence unless the commands are rerun against the exact commit being released.

| Check | Current release evidence |
|---|---|
| Vitest suite | Must rerun on the release commit |
| TypeScript typecheck | Must rerun on the release commit |
| ESLint | Must rerun on the release commit |
| Production build | Must rerun on the release commit |
| GitHub Actions | Require a successful run for the exact commit |
| Deployed end-to-end smoke tests | Require a real deployment and recorded results |

Run `npm ci`, `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Record the commit SHA, date, Node/npm versions, exit status, and any failures. Do not replace missing evidence with assumed success.


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
