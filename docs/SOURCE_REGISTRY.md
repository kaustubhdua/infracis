# Infracis source registry and launch gates

Status date: 2026-10-28. This registry documents the adapters currently visible in the repository. It is not a legal determination or proof that provider access is approved for a particular commercial deployment.

## Sources

| Source | Current use in code | Data and freshness | License / policy gate | Operational limits and fallback |
|---|---|---|---|---|
| OpenStreetMap Nominatim | Text query to coordinate resolution; request identifies Infracis in User-Agent | Returned place label, coordinates, optional bounding box; result may be ambiguous or centroid-like | Follow the official Nominatim usage policy and OSM attribution/ODbL requirements. Public endpoint is not a general high-volume autocomplete service. | The Next.js adapter uses a shared Redis-backed request-slot reservation and shared cache when configured, with a local cache as an additional fallback. The production API is designed to fail closed if shared throttling cannot be reserved. This implementation still requires operational verification across independent instances and during Redis outages before launch. On provider failure, show a recoverable error; never fabricate coordinates. |
| OpenStreetMap Overpass | Nearby mapped amenities around a selected coordinate | Crowdsourced mapped points/ways; coverage and update timing vary by locality | Attribute OpenStreetMap and comply with ODbL and the selected Overpass instance's usage policy. Public instances are shared infrastructure. | The Next.js adapter applies a request timeout, validates the top-level response shape and filters malformed elements, and uses shared Redis caching when configured plus a process-local cache. The default endpoint remains the primary FOSSGIS instance (https://overpass-api.de/api/interpreter); OVERPASS_API_URL can override it after the alternate provider's policy and reliability are verified. This remains a best-effort public service without a product SLA. A one-off smoke test on 2026-10-28 also timed out against Private.coffee and received HTTP 504 from the maps.mail.ru instance, so neither alternate is currently approved as a default. Aggregate load, cache behavior, provider outage handling, and recovery still require live operational tests. If unavailable, show the amenity layer as unavailable, not as zero amenities. |
| Open-Meteo weather API | Current weather variables and elevation lookup | API returns model-derived weather values with a provider timestamp; elevation comes from a DEM | The free API tier is restricted to non-commercial use according to the provider's published terms and requires CC BY 4.0 attribution. Commercial launch must first confirm an appropriate paid plan or select a compliant alternative. No commercial-use approval is assumed by this registry. | The Next.js adapter uses an 8-second timeout, checks response shape and bounds numeric fields, and uses shared Redis caching when configured. This is not yet a measured reliability/SLA claim; provider failures and malformed fields must remain unknown. Model output must be labelled `provider_model`, not an on-site sensor observation. |
| Open-Meteo Air Quality API | European AQI and pollutant values | Gridded model/reanalysis output; resolution and timestamp depend on product | Same commercial-use and attribution decision required as above. Verify the exact dataset/model terms for intended usage. | The Next.js adapter uses an 8-second timeout, checks response shape and bounds numeric fields, and uses shared Redis caching when configured. Provider health metrics and live outage/recovery evidence remain outstanding. Do not imply the result is a street-level monitor reading. |

## Release decisions required

- [ ] Product owner records whether the launch is non-commercial, commercial, or evaluation-only.
- [ ] If commercial, confirm written/provider-account eligibility for Open-Meteo or replace the adapter with a source whose commercial terms are satisfied.
- [ ] Review current terms, attribution, cache and redistribution rules for each source immediately before launch.
- [ ] Choose one pilot geography only after a repeatable real-location sample is evaluated. Greater Noida/Noida is a candidate, not a verified coverage claim.
- [ ] Record sample size, geocoding ambiguity, provider success/failure, latency, data completeness, and manual spot-check outcomes.
- [ ] Add provider health metrics (latency, status, schema failures, cache hit/miss, upstream error rate) without logging unnecessary precise search histories.
- [ ] Establish source-specific freshness labels and keep retrieval timestamps separate from provider timestamps.
- [ ] Do not describe missing map features as proof that a service or hazard is absent.

## Evidence contract

Each returned report should make it possible to identify the provider, source URL, retrieval time, provider timestamp when available, unit, geographic resolution/coverage, license/attribution and limitations. If a value is absent, malformed, out of range, stale under the source-specific policy, or from a failed provider, preserve it as unknown/unavailable rather than substituting zero or synthetic data.

## Official policy references

- Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
- Open-Meteo Terms: https://open-meteo.com/en/terms
- Open-Meteo Pricing: https://open-meteo.com/en/pricing
- OpenStreetMap Copyright and License: https://www.openstreetmap.org/copyright

These links are operational references; review the live text and preserve a dated decision record before launch.


## Live provider pilot baseline (2026-10-28)

The first automated 20-location Delhi NCR pilot completed successfully as a workflow, but the data results **did not pass the release gate**. [Workflow run and artifact](https://github.com/kaustubhdua/infracis/actions/runs/40658825432).

| Provider | Valid responses | Attempted | Pass rate | Interpretation |
|---|---:|---:|---:|---|
| Nominatim geocoding | 18 | 20 | 90.0% | Two queries returned no valid matching result. |
| Open-Meteo weather | 14 | 18 | 77.8% | Four provider calls failed in this run. |
| Open-Meteo air quality | 13 | 18 | 72.2% | Five provider calls failed in this run. |
| Overpass amenities | 0 | 18 | 0.0% | The baseline used overpass-api.de; it returned timeouts, HTTP 502, and HTTP 429 responses. |

These are measured response-shape rates for one run, not geographic coverage or ground-truth accuracy. The Overpass adapter and pilot script were subsequently changed to use a lower-cost query and configurable endpoint. A one-off alternate-endpoint smoke test still failed (Private.coffee timeout; maps.mail.ru HTTP 504). **A new 20-location pilot must be run and reviewed after the query change** before claiming amenity-provider reliability. Open-Meteo failures also need another measured run; do not treat transient failure as missing real-world data. A follow-up one-query endpoint smoke test also failed: Private.coffee timed out after 15 seconds and maps.mail.ru returned HTTP 504. The revised endpoint is therefore not yet verified; keep amenity results explicitly unavailable until a repeatable live response is measured.
