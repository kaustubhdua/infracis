# MVP acceptance and test plan

This document defines tests to execute. It does not claim the tests have passed.

## A. Location workflow
- [ ] Valid address resolves to coordinates and displays the provider used.
- [ ] Ambiguous address asks for clarification or offers grounded candidates.
- [ ] Invalid query produces a useful error.
- [ ] Map selection and text search agree on the selected coordinates.
- [ ] Coordinates and distances use consistent units and a documented method.

## B. Provider integrity
- [ ] Each adapter has a schema validation test using an allowed fixture.
- [ ] Live integration test confirms the provider is actually reachable in the target environment.
- [ ] Source URL/provider and retrieval time appear in the UI.
- [ ] Observation time is distinct from retrieval time.
- [ ] Provider timeout is bounded and visible.
- [ ] Rate limit and upstream 5xx produce a partial/unavailable state, not fabricated data.
- [ ] Cache behavior respects freshness and provider terms.
- [ ] No unsupported coverage claims are shown.

## C. Calculations
- [ ] Proximity calculations have known test coordinates and expected distances.
- [ ] Missing data remains unknown, not zero.
- [ ] Two locations use identical metric definitions.
- [ ] Incomparable metrics are marked as such.
- [ ] Units, rounding, and thresholds are documented.
- [ ] Composite score, if present, exposes weights and is marked experimental until validated.

## D. AI explanation
- [ ] AI input contains only the evidence required for the report.
- [ ] Structured output passes schema validation.
- [ ] Every factual claim references an evidence ID that exists in the input bundle.
- [ ] Unknown evidence IDs and unsupported claims are rejected or removed.
- [ ] Prompt injection in source text does not alter system behavior.
- [ ] AI timeout/failure falls back to deterministic report rendering.
- [ ] Model output never upgrades an unverified claim to verified status.

## E. Persistence and authorization
- [ ] Saved reports survive reload.
- [ ] User A cannot read, update, or delete User B's report.
- [ ] Anonymous/public fixtures are separate from private saved reports.
- [ ] Storage upload size/type limits are enforced if uploads exist.
- [ ] Deletion behavior is documented and tested.

## F. User experience and accessibility
- [ ] Core flow works at narrow mobile widths.
- [ ] All controls have accessible names and keyboard operation.
- [ ] Focus indicators and contrast are adequate.
- [ ] Loading, empty, error, stale, and partial-data states are distinct.
- [ ] Reduced-motion preference is respected.
- [ ] Map is not the only way to access findings; equivalent textual results exist.

## G. Security and release
- [ ] No real credentials or tokens are committed.
- [ ] Secret scan and dependency audit run.
- [ ] API input and request size are bounded.
- [ ] Rate limits protect expensive endpoints.
- [ ] Production build completes.
- [ ] Smoke tests run against the deployed URL.
- [ ] Error reporting does not leak precise location or secrets.
- [ ] README setup steps work on a clean checkout.
- [ ] Known limitations and source attribution are visible.

## Minimum demo release gate
Do not call the MVP complete unless:
1. A real location query works end-to-end.
2. At least two actual data sources return data in the target environment.
3. Each factual result has traceable provenance.
4. Comparison and calculations pass deterministic tests.
5. AI failure and source failure are handled honestly.
6. The deployed application and repository setup have been verified.
