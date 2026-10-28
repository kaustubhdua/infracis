# Data provenance, confidence, and scoring policy

## Core rule

**Absence of evidence is not evidence of absence.** If a source has no record for a location, the product must not interpret that as proof that a hazard or problem does not exist.

## Claim categories

1. **Observed** — directly reported by a source that represents a direct observation or recorded fact, with unit and context.
2. **Provider model output** — a value produced by a forecast, gridded reanalysis, interpolation, or other provider model; never imply it is an on-site sensor measurement.
3. **Calculated** — computed by a documented deterministic formula from identified evidence.
4. **Rule-based interpretation** — an explanatory classification grounded in identified evidence; never presented as an independently verified fact.
5. **Unknown** — missing, stale, contradictory, unsupported, or inaccessible information.

Every report finding must carry one of these labels. Provider-model values must use `provider_model`, with retrieval time separated from the provider-supplied model timestamp.

## Required provenance

For each source-backed item, retain where practical:
- provider and source URL/dataset identifier
- retrieval timestamp
- observation/publication timestamp, if supplied
- geographic resolution/coverage
- license and attribution requirements
- transformations and units
- known limitations
- validation status

Do not invent observation timestamps when the provider supplies none. Use “retrieved at” separately from “observed at.”

## Freshness
Freshness thresholds are source-specific. A live weather observation, annual dataset, historical hazard atlas, and POI record have different update expectations. Configure freshness policy per adapter; never apply one global threshold.

Stale data may remain useful as historical context, but must be labeled as such.

## Future AI grounding (not active in this build)
The current implementation uses deterministic rules and templates in `lib/synthesizer.ts`; it does not call an LLM. If an AI provider is introduced later:
- Pass only normalized evidence and calculations required for the task.
- Require every factual claim to reference one or more evidence IDs.
- Validate returned IDs against the input bundle.
- Reject unsupported factual claims; do not fill gaps from model memory.
- Render uncertainty and conflicting sources explicitly.
- AI may summarize or explain. It must not invent source URLs, statistics, hazard classifications, property prices, crime data, or legal conclusions.
- Keep deterministic fallback rendering when AI is unavailable.

## Location and risk language
- Use “within X metres” only when the distance calculation and coordinate source support it.
- Do not equate nearby POIs with quality or service availability.
- Do not label an area “safe,” “unsafe,” “flood-proof,” or “crime-free” based on incomplete data.
- Historical flood layers are contextual and may omit events; disclose source limitations.
- Air-quality estimates from gridded models must not be described as on-site monitor readings.
- Do not make legal title or investment recommendations.
- Make users aware that this is decision support, not a substitute for professional inspections or legal due diligence.

## Composite scores
Composite scores are disabled by default until there is a defensible, documented method.

If introduced:
- expose formulas and weights;
- separate user preferences from observed facts;
- do not treat missing values as zero;
- show coverage/completeness separately from risk;
- report sensitivity to weights;
- validate against known cases and user feedback;
- label any unvalidated score as experimental.

## Privacy
- Minimize collection of precise user location and search history.
- Do not make saved reports public by default.
- Set explicit retention/deletion behavior.
- Keep credentials server-side.
- Do not store uploaded personal documents unless needed and consented to.
- Do not use personal report data for model training without a clear, separate lawful basis and consent.

## Source licensing
Review each provider's terms before caching, storing, displaying, or redistributing data. Attribute OpenStreetMap appropriately and comply with its license. Government data may have dataset-specific conditions. An accessible public webpage does not automatically mean unrestricted bulk reuse.
