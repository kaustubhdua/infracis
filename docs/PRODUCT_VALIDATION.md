# Infracis product validation protocol

## Do not claim validation before interviews
No real user interviews are represented by this document. It defines the protocol and evidence to collect before claiming product-market or usability validation.

## Target participants
Recruit 5–8 adults who have recently rented, bought, or seriously evaluated a home in Delhi NCR. Include a mix of first-time renters, first-time buyers, and people comparing multiple neighborhoods. Do not collect exact home addresses, financial account data, or other unnecessary sensitive details.

## 20-minute interview guide
1. Tell me about the last time you compared two locations before renting or buying.
2. What questions did you need answered, and which were hardest to verify?
3. Which sources did you trust? What did you cross-check manually?
4. Walk me through how you currently compare transport, healthcare, schools, essentials, air quality, and weather.
5. Ask the participant to use Infracis without coaching: investigate one location, inspect source evidence and unknowns, compare two locations, and export a report.
6. Ask them to explain one result in their own words and identify what they would verify independently.
7. What is confusing, misleading, missing, or not worth using?
8. What would make you trust or distrust this report? What would you do next after seeing it?

Record anonymized notes with consent. Separate observed behavior from participant opinion. Do not quote participants publicly without permission.

## Primary success metric
**Evidence-to-action completion rate:** percentage of participants who, without coaching, identify at least one actionable due-diligence check from a report, correctly identify its source or limitation, and state how they would verify it independently.

Initial pilot target: at least 4 of 5 participants complete the task, and at least 4 of 5 correctly distinguish mapped observations/model output from proof of real-world completeness. This is a hypothesis to test, not a measured result.

## Guardrails
- Zero fabricated or unsupported source claims.
- Every participant can locate the source/limitations for material evidence.
- No participant interprets the report as legal title, structural safety, valuation, crime prediction, or a guarantee.
- Track task failures, time to first useful finding, source-link use, comparison completion, and export completion.
- Log every provider error and every location where the app returns incomplete or ambiguous evidence.

## Feedback loop
- Store anonymized findings and severity in a dated issue or research log.
- Review findings weekly during the pilot.
- Label each finding as usability, correctness, coverage, trust, or feature request.
- Assign an owner and acceptance test to every P0/P1 issue.
- Re-test the affected task with a new participant before closing critical trust/correctness findings.
- Publish a short decision log: what changed, what did not change, why, and which metric should move.

## Results template
For each session, record: participant code; relevant housing context; task success/failure; time per task; source/limitation comprehension; observed confusion; severity; anonymized quote if consented; next action. Never fill in sample results without conducting the session.
