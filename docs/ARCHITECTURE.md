# Architecture

## Design goals
- Evidence provenance is a first-class data model.
- Deterministic calculations are separate from AI language generation.
- Providers are isolated behind adapters so failures and licensing constraints are explicit.
- Partial coverage is visible; the system does not imply national coverage.
- User reports are private by default.

## Proposed components

### Web client
Next.js + TypeScript + Tailwind CSS.
Responsibilities: location search, map, preferences, evidence cards, comparison, report review, loading/error/empty states.

### Server/API
Server-side route handlers or a small FastAPI service. Start with one backend style to reduce deployment complexity; do not build both unless a concrete requirement appears.
Responsibilities: validate inputs, call provider adapters, normalize results, calculate metrics, orchestrate evidence-grounded explanations, persist reports.

### Provider adapters
Each adapter implements a common interface and returns normalized evidence plus source metadata. Adapters must not return unlabelled fabricated fallback data.

Suggested interface shape:

```ts
type EvidenceStatus = "observed" | "calculated" | "model_interpretation" | "unknown";

type SourceMetadata = {
  provider: string;
  sourceUrl: string;
  retrievedAt: string;
  observedAt?: string;
  license?: string;
  coverageDescription?: string;
  limitations: string[];
};

type EvidenceItem = {
  id: string;
  category: string;
  title: string;
  value: unknown;
  unit?: string;
  status: EvidenceStatus;
  source: SourceMetadata;
  geometry?: GeoJSON.Geometry;
};
```

### Data providers
Initial candidates (verify before implementation):
- OpenStreetMap/Overpass or a suitable geocoding/POI provider for amenities and context.
- Open-Meteo for selected weather/climate context.
- Official NRSC/Bhuvan or other official hazard layers only if the pilot geography, access method, and reuse terms are verified.
- data.gov.in for discovery of suitable official datasets.

Provider adapters must support timeout, bounded retries, cache policy, schema validation, and a clear unavailable response.

### Database
Supabase PostgreSQL. Enable PostGIS if available and useful. Store report metadata and normalized evidence snapshots; avoid copying large datasets that the source license does not permit redistributing.

Suggested entities:
- profiles (only if authentication is required)
- saved_reports
- report_locations
- evidence_items
- source_registry
- comparison_metrics
- report_events

Use RLS policies so users can only access their own saved reports. Public demo fixtures must be clearly identified and separated from user data.

## Request flow

1. Client sends a location query and explicit analysis preferences.
2. Server validates query and resolves coordinates through a chosen provider.
3. Adapters fetch relevant evidence concurrently with timeouts.
4. Normalizer validates and standardizes each result.
5. Deterministic engine calculates proximity, coverage, and comparison metrics.
6. Confidence/completeness logic evaluates source freshness and missing data; it does not claim statistical confidence unless calibrated.
7. Optional AI explanation receives only the evidence bundle and calculation results.
8. Output schema validation ensures every claim references known evidence IDs.
9. Client renders evidence, assumptions, limitations, and next checks.
10. If one provider fails, show partial results and name the unavailable source.

## Scoring policy
Do not introduce one opaque “Livability Score” until metric definitions and weights are justified. Start with a transparent metric table and user-selected priorities. If a composite score is later added:
- show each component and weight;
- allow users to change weights;
- distinguish missing from zero;
- show coverage/completeness separately;
- perform sensitivity analysis;
- validate against user feedback and known examples.

## Security
- No secrets in NEXT_PUBLIC_* variables or client bundles.
- Validate all input and enforce response-size limits.
- Use server-side provider calls where credentials are required.
- Apply Supabase RLS and test with multiple users.
- Avoid storing precise home-search histories longer than necessary.
- Sanitize uploaded content and avoid executing user-provided files.
- Rate-limit expensive AI/provider routes.
- Do not treat model output as trusted instructions or authoritative data.

## Observability
Log provider status, latency, cache outcome, and validation errors without storing unnecessary personal data. Surface operational status in the report so the user can tell the difference between “no risk found” and “source unavailable.”
