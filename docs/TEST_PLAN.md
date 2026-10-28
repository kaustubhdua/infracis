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
- **Evidence Record Schema:** Ensures every record has non-empty ID, provider, source URL, limitations, and valid classification (`observed`, `calculated`, `model_interpretation`, `unknown`).
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
