# Prioritized Implementation Backlog

## P0 — Core Release (Completed & Verified)

### Product and Data
- [x] Pilot geography verified (tested with Bengaluru, Noida, and Mumbai pilot points).
- [x] Source registry with provider, license, coverage, cadence, and limitations documented.
- [x] OpenStreetMap Nominatim geocoding provider with polite spacing and bounding box support.
- [x] OpenStreetMap Overpass amenity provider with 1.2km bounded radius and Haversine distance calculations.
- [x] Open-Meteo Weather and Copernicus DEM Elevation integration with separate observation timestamps.
- [x] Open-Meteo / Copernicus European AQI, PM2.5, and PM10 atmospheric reanalysis integration.
- [x] Explicit unknown detection when data layers are unavailable.

### Decision Workflow
- [x] Interactive address search with pilot presets and click-to-pick map coordinate selection.
- [x] Interactive Leaflet map with property pin, amenity color pins, and distance popups.
- [x] Evidence cards with classification badges (`Observed`, `Calculated`, `Model Interpretation`, `Unknown`).
- [x] Deterministic step-function proximity calculations and completeness scoring.
- [x] Side-by-side two-location comparison engine with preference profiles (Balanced, Family, Transit, Healthcare, Quiet).
- [x] Explicit detection of incomparable metrics when data is missing for one candidate location.
- [x] Evidence-grounded findings with strict ID citations.
- [x] On-ground due diligence checklist with priority badges, rationales, and printable styling.
- [x] Auditable JSON export and client-side saved reports in LocalStorage.

### Quality & Verification
- [x] Vitest automated test suite (13/13 passing tests for geospatial, comparison, and evidence integrity).
- [x] TypeScript type checking (`tsc --noEmit` passing with 0 errors).
- [x] ESLint validation passing with 0 errors and 0 warnings.
- [x] Next.js production build passing with 0 errors.
- [x] Runtime server smoke test against `/api/health` and `/api/analyze`.

---

## P1 — Follow-up Enhancements
- [ ] Connect Supabase Auth and execute the prepared migration (`supabase/migrations/202610280001_initial_reports.sql`) for multi-device sync.
- [ ] Multi-radius amenity filters (500m vs 1000m vs 2000m).
- [ ] PDF export with branded print header and map snapshot.
- [ ] Historical seasonal waterlogging crowd-verification map overlay.
