# Prioritized implementation backlog

Each item is unstarted until code and tests demonstrate completion.

## P0 — Must-have for the first useful release

### Product and data
- [ ] Choose one pilot geography after source-coverage checks.
- [ ] Interview prospective users and record findings with consent.
- [ ] Create source registry with provider, license, coverage, cadence, limitations, and status.
- [ ] Implement one geocoding/location-selection provider.
- [ ] Implement a real nearby-amenity source with correct attribution.
- [ ] Implement one environment or hazard source only after confirming geographic coverage and access terms.
- [ ] Normalize data and preserve retrieval/observation timestamps separately.
- [ ] Add source timeout, validation, and unavailable states.

### Decision workflow
- [ ] Build location input and map selection.
- [ ] Build evidence cards and source detail view.
- [ ] Calculate deterministic distances and amenity counts.
- [ ] Build two-location comparison with missing-data handling.
- [ ] Build report sections: findings, evidence, unknowns, and next checks.
- [ ] Add export only after provenance survives export.

### Trust and security
- [ ] Add Supabase project and schema when the initial data model is confirmed.
- [ ] Add RLS and multi-user authorization tests before saving private reports.
- [ ] Keep all secrets server-side.
- [ ] Add structured AI output validation and evidence-ID checks if AI is enabled.
- [ ] Add deterministic no-AI fallback.
- [ ] Add source attribution and limitations UI.

### Quality
- [ ] Unit tests for geospatial and scoring helpers.
- [ ] Integration tests for each real provider adapter.
- [ ] End-to-end happy path and provider-failure path.
- [ ] Responsive/mobile QA and accessibility audit.
- [ ] Production build and deployed smoke test.

## P1 — Strong follow-up
- [ ] Save, revisit, and delete reports.
- [ ] User-adjustable preference weights with transparent calculations.
- [ ] Data freshness indicators and source-health monitoring.
- [ ] Compare report versions over time.
- [ ] Downloadable PDF report.
- [ ] User feedback and correction workflow.

## P2 — Only after validation
- [ ] State-specific official property and regulatory document integrations.
- [ ] Commute-time analysis using a verified routing provider.
- [ ] More climate/hazard layers with documented methodology.
- [ ] Rental and total-cost-of-ownership scenarios.
- [ ] Builder/site selection workflow.
- [ ] Alerts for material changes, with a source-specific update cadence.

## Definition of done
A task is done only when implementation, tests, error handling, documentation, and evidence of execution are present. A UI mockup or an unchecked box is not completion.
