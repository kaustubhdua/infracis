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

## 3. Test Results (Verified)

```
✓ tests/geo.test.ts (7 tests)
✓ tests/comparison.test.ts (3 tests)
✓ tests/evidence.test.ts (3 tests)

Test Files  3 passed (3)
Tests       13 passed (13)
TypeScript  0 errors
ESLint      0 errors, 0 warnings
Build       Success (Static + Dynamic routes)
```
