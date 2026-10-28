# Infracis source registry and launch gates

Status date: 2026-10-28. This registry documents the adapters currently visible in the repository. It is not a legal determination or proof that provider access is approved for a particular commercial deployment.

## Sources

| Source | Current use in code | Data and freshness | License / policy gate | Operational limits and fallback |
|---|---|---|---|---|
| OpenStreetMap Nominatim | Text query to coordinate resolution; request identifies Infracis in User-Agent | Returned place label, coordinates, optional bounding box; result may be ambiguous or centroid-like | Follow the official Nominatim usage policy and OSM attribution/ODbL requirements. Public endpoint is not a general high-volume autocomplete service. | Code has a process-local spacing guard and 24-hour process-local cache only. This does **not** enforce a global 1 request/second limit across serverless instances. Before public launch, configure an application-wide shared gate or use a provider whose terms and capacity match the intended use. On provider failure, show a recoverable error; never fabricate coordinates. |
| OpenStreetMap Overpass | Nearby mapped amenities around a selected coordinate | Crowdsourced mapped points/ways; coverage and update timing vary by locality | Attribute OpenStreetMap and comply with ODbL and the selected Overpass instance's usage policy. Public instances are shared infrastructure. | Code applies request timeout and process-local cache. Add concurrency control, bounded retries with jitter only where safe, response schema validation, and operational monitoring before scale. If unavailable, show the amenity layer as unavailable, not as zero amenities. |
| Open-Meteo weather API | Current weather variables and elevation lookup | API returns model-derived weather values with a provider timestamp; elevation comes from a DEM | The free API tier is restricted to non-commercial use according to the provider's published terms and requires CC BY 4.0 attribution. Commercial launch must first confirm an appropriate paid plan or select a compliant alternative. No commercial-use approval is assumed by this registry. | 8-second timeout currently; no shared cache/metrics. Model output must be labelled `provider_model`, not an on-site sensor observation. Failure should leave fields unknown. |
| Open-Meteo Air Quality API | European AQI and pollutant values | Gridded model/reanalysis output; resolution and timestamp depend on product | Same commercial-use and attribution decision required as above. Verify the exact dataset/model terms for intended usage. | 8-second timeout currently; add schema/range validation, provider status metrics, and graceful unknown state. Do not imply the result is a street-level monitor reading. |

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
