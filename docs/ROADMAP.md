# Infracis product roadmap

## Product thesis

Help a buyer or renter investigate a location before committing by assembling evidence, explaining trade-offs, comparing locations, and exposing what remains unknown.

## Product scope decisions

### Initial persona
A person evaluating a specific residential location.

### Initial job to be done
“Help me understand what the available evidence says about this location, compare it with another, and know what I should verify before deciding.”

### First geography
Choose one pilot geography only after confirming provider coverage and finding at least two useful real data sources. Greater Noida/Noida may be a candidate because of the team's context, but the choice must be validated against actual data coverage rather than assumed.

### Out of scope for MVP
- Builder/developer suitability and construction forecasting
- Legal title certification, encumbrance verification, or investment advice
- Nationwide comprehensive coverage
- Claims of predicting crime, flooding, resale prices, or future infrastructure without validated methods
- Scraping websites against terms or redistributing data without rights

## Phase 0 — Repository and evidence foundation
**Goal:** Establish a trustworthy project foundation.

- [x] Write product README and scope.
- [x] Document initial desk research and adjacent products.
- [x] Document proposed architecture and data policy.
- [x] Define acceptance tests and release gates.
- [ ] Confirm team ownership, target pilot geography, and hosting constraints.
- [ ] Validate provider access, license, coverage, and rate limits.
- [ ] Create a source registry with a named owner for each integration.

**Exit gate:** The MVP data plan uses sources the team can actually access and legally reuse.

## Phase 1 — Customer/problem validation
- Interview 5–8 prospective home buyers/renters and 2–3 domain professionals.
- Capture current workflow, key unknowns, sources used, and trust concerns.
- Test whether source-linked location reports help people make a better next-step decision.
- Narrow the first report to 3–5 evidence-backed signals.
- Write a one-sentence value proposition and measurable hypothesis.

**Exit gate:** At least several target users can explain a concrete decision improvement from the prototype report; otherwise revise the concept.

## Phase 2 — Data feasibility spike
- Test geocoding for the chosen geography.
- Test nearby amenity retrieval with source attribution.
- Test one environmental or hazard dataset for actual geographic coverage.
- Measure provider response, completeness, latency, and failure behavior.
- Save raw provider response fixtures only where licensing and privacy permit.
- Add source metadata: provider, URL, fetched_at, observed_at, geometry/coverage, license, and limitations.

**Exit gate:** Two or three actual sources work in a repeatable local test; missing coverage is represented honestly.

## Phase 3 — MVP application
- Create responsive landing/search experience.
- Implement location search and map selection.
- Implement source adapter interfaces and server-side retrieval.
- Normalize provider data into a stable internal schema.
- Build deterministic proximity and completeness metrics.
- Show evidence cards with source, timestamp, coverage, and limitations.
- Implement two-location comparison using identical metric definitions.
- Generate an evidence-linked report with findings, unknowns, and next checks.
- Add loading, empty, stale-data, partial-failure, and provider-error states.

**Exit gate:** A user can complete search → inspect evidence → compare → export/report without a fabricated result.

## Phase 4 — AI-assisted explanation
- Give the model only retrieved, normalized evidence and deterministic calculations.
- Require structured output with claim IDs referencing evidence IDs.
- Validate output schema and reject unknown evidence IDs.
- Mark all model interpretations explicitly.
- Never let AI calculate authoritative safety, legal, or investment scores.
- Add an honest no-AI fallback that renders the same facts and rule-based explanations.

**Exit gate:** Unsupported claims are rejected or clearly flagged; model/provider failure does not break core analysis.

## Phase 5 — Trust, security, and quality
- Configure Supabase Row Level Security for private saved reports.
- Keep all provider secrets server-side.
- Validate inputs and constrain request size.
- Add rate limiting and abuse protections where supported.
- Add audit logs for saved reports and changes.
- Test keyboard access, screen-reader labels, contrast, reduced motion, and mobile layouts.
- Add unit tests for calculations, integration tests for adapters, and end-to-end core flow tests.
- Add privacy notice and retention/deletion behavior.

**Exit gate:** No cross-user report access, no secret exposure, and all critical workflows pass tests.

## Phase 6 — Pilot and measurement
- Run a small supervised pilot with real locations.
- Manually validate a sample of extracted POIs and all high-impact claims.
- Track source coverage, freshness, failure rate, unsupported-claim rate, report completion, and user usefulness.
- Collect feedback with consent.
- Do not claim impact until there is evidence.

**Exit gate:** The team can state what works, where it works, what it does not cover, and how the results were evaluated.

## Phase 7 — Release and operations
- Deploy a preview environment first.
- Set production environment variables in the hosting platform.
- Run smoke tests against the deployed URL.
- Add error reporting, provider health checks, and clear degraded-mode behavior.
- Document deployment and rollback.
- Tag a version only after release gates pass.
- Maintain a known-limitations page.

**Exit gate:** A clean setup and deployment are reproducible by another team member.

## Phase 8 — Future expansion (not MVP)
- Official property/regulatory document connectors by state
- Flood/climate layers where coverage and licensing are verified
- Total cost of ownership and scenario analysis
- Commute analysis using a licensed/available routing service
- Builder/site selection, only after separate discovery and validation
- Longitudinal changes and alerts, with freshness guarantees

## Suggested 24-hour hackathon cut

- Hours 0–2: choose geography, define 3 signals, validate sources
- Hours 2–5: scaffold UI, schema, environment setup
- Hours 5–9: working location search and first source adapter
- Hours 9–12: second source adapter and deterministic metrics
- Hours 12–16: evidence cards and location comparison
- Hours 16–18: evidence-grounded report explanation
- Hours 18–21: tests, security, and failure states
- Hours 21–23: deploy and test real public URL
- Hours 23–24: freeze, record demo, document limitations, tag release

If real data access fails, reduce scope rather than silently substituting fake live data. A small real workflow is better than a broad mockup.
