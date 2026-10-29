# Infracis source registry and launch gates

Status date: 2026-10-28. This registry documents the adapters currently visible in the repository. It is not a legal determination or proof that provider access is approved for a particular commercial deployment.

## Sources

| Source | Current use in code | Data and freshness | License / policy gate | Operational limits and fallback |
|---|---|---|---|---|
| OpenStreetMap Nominatim | Text query to coordinate resolution; request identifies Infracis in User-Agent | Returned place label, coordinates, optional bounding box; result may be ambiguous or centroid-like | Follow the official Nominatim usage policy and OSM attribution/ODbL requirements. Public endpoint is not a general high-volume autocomplete service. | The Next.js adapter uses a shared Redis-backed request-slot reservation and shared cache when configured, with a local cache as an additional fallback. The production API is designed to fail closed if shared throttling cannot be reserved. This implementation still requires operational verification across independent instances and during Redis outages before launch. On provider failure, show a recoverable error; never fabricate coordinates. |
| Photon public geocoder (Komoot) | Best-effort forward-geocoding fallback only when Nominatim has no confident match; the selected provider is recorded in location evidence | OpenStreetMap-derived place candidates and coordinates; may differ from Nominatim labels/coverage | Photon is Apache-2.0 software using OSM data; retain OpenStreetMap attribution/ODbL obligations. The public demo allows reasonable project use but warns that excessive traffic may be throttled and provides no availability guarantee. See [Photon project terms](https://github.com/komoot/photon#demo-server). | 6-second timeout, strict shared relevance selector and coordinate validation, no retries; optional `PHOTON_API_URL` override. Use only as low-volume fallback; sustained traffic requires an appropriately hosted instance. Never imply it is ground truth or use a nearby POI as a locality substitute. |\n| OpenStreetMap Overpass | Nearby mapped amenities around a selected coordinate | Crowdsourced mapped points/ways; coverage and update timing vary by locality | Attribute OpenStreetMap and comply with ODbL and the selected Overpass instance's usage policy. Public instances are shared infrastructure. | The Next.js adapter applies a request timeout, validates the top-level response shape and filters malformed elements, and uses shared Redis caching when configured plus a process-local cache. For low-volume evaluation, the adapter tries the documented Private.coffee Overpass instance first, then the FOSSGIS instance at https://overpass-api.de/api/interpreter. Operators may replace this bounded list with up to three HTTPS endpoints. HTTP 429/406 stops failover to avoid immediate retry after rate limiting. The 2026-10-29 pilot had 0/18 valid responses from the primary FOSSGIS instance; a separate earlier smoke test timed out against Private.coffee and received HTTP 504 from maps.mail.ru. These defaults are a recovery attempt, not a claim of reliability; public instances are best-effort and have no product SLA. Commercial/high-volume launch requires a provider with appropriate terms/capacity or self-hosting. Aggregate load, cache behavior, provider outage handling, and recovery still require live operational tests. If unavailable, show the amenity layer as unavailable, not as zero amenities. |
| Open-Meteo weather API | Current weather variables and elevation lookup | API returns model-derived weather values with a provider timestamp; elevation comes from a DEM | The free API tier is restricted to non-commercial use according to the provider's published terms and requires CC BY 4.0 attribution. Commercial launch must first confirm an appropriate paid plan or select a compliant alternative. No commercial-use approval is assumed by this registry. | The Next.js adapter uses an 8-second timeout, retries once for network failures or transient HTTP 408/5xx responses, checks response shape and bounds numeric fields, and uses shared Redis caching when configured. It does not retry HTTP 429 or ordinary 4xx responses. This is not a measured reliability/SLA claim; if both attempts fail, provider fields must remain unknown. Model output must be labelled `provider_model`, not an on-site sensor observation. |
| Open-Meteo Air Quality API | European AQI and pollutant values | Gridded model/reanalysis output; resolution and timestamp depend on product | Same commercial-use and attribution decision required as above. Verify the exact dataset/model terms for intended usage. | The Next.js adapter uses an 8-second timeout, retries once for network failures or transient HTTP 408/5xx responses, checks response shape and bounds numeric fields, and uses shared Redis caching when configured. It does not retry HTTP 429 or ordinary 4xx responses. Provider health metrics and live outage/recovery evidence remain outstanding; after both attempts fail, keep the result unknown. Do not imply the result is a street-level monitor reading. |

| NASA GIBS | Optional Earth-observation imagery layer in the interactive map; it is visual context only and does not produce parcel-level risk findings | Satellite-derived imagery is product- and date-dependent; availability/resolution varies by layer and geographic location | Attribute NASA Global Imagery Browse Services / Earth Science Data and Information System as required by NASA's GIBS guidance. The legacy NASA Earth API is not the map-tile service; GIBS uses public WMTS endpoints and does not require the legacy NASA API key for this layer. | The map keeps OpenStreetMap as a readable reference layer and overlays GIBS imagery when selected. A tile error can leave the street map available. Imagery must not be described as proof of flood, fire, crime, pollution, property condition, or safety. |
| Groq chat completions | Optional AI-written explanation of already-retrieved location reports and comparisons | Generated text is inference over the supplied report; it is not an independent data source | Requires a valid Groq API key and a model allowed by the account. Keep the key server-side as `GROQ_API_KEY`; never use a `NEXT_PUBLIC_*` variable. Check current model availability and pricing before launch. | The endpoint projects input into an allowlisted summary, rate-limits, enforces request-size bounds and timeout, and returns a graceful error if unconfigured. AI text must not create facts, sources, ratings, or hazard claims; the deterministic report remains primary. |

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


## Live provider pilot runs (2026-10-28)

Two bounded 20-location Delhi NCR pilots were run. Workflow completion means the probe script completed, not that providers passed the release gate.

### Initial baseline

[Initial pilot run and artifact](https://github.com/kaustubhdua/infracis/actions/runs/40658825432)

| Provider | Valid responses | Attempted | Pass rate |
|---|---:|---:|---:|
| Nominatim geocoding | 18 | 20 | 90.0% |
| Open-Meteo weather | 14 | 18 | 77.8% |
| Open-Meteo air quality | 13 | 18 | 72.2% |
| Overpass amenities | 0 | 18 | 0.0% |

The initial Overpass query received timeouts, HTTP 502, and HTTP 429 responses.

### Follow-up after the Overpass query was changed

[Follow-up pilot run and artifact](https://github.com/kaustubhdua/infracis/actions/runs/40660404776)

| Provider | Valid responses | Attempted | Pass rate |
|---|---:|---:|---:|
| Nominatim geocoding | 18 | 20 | 90.0% |
| Open-Meteo weather | 11 | 18 | 61.1% |
| Open-Meteo air quality | 11 | 18 | 61.1% |
| Overpass amenities | 0 | 18 | 0.0% |

The follow-up did not improve the amenity result and recorded lower valid-response rates for the two Open-Meteo endpoints. These are response-shape pass rates for two individual runs, not geographic coverage, ground-truth accuracy, or an SLA. Some valid geocoding responses were nearby POIs rather than the requested neighbourhood, so semantic relevance remains unverified.

An additional bounded endpoint smoke test also failed (Private.coffee timed out after 15 seconds; maps.mail.ru returned HTTP 504). No Overpass endpoint is currently verified as reliable for production. Keep production amenity retrieval disabled until an operator selects a compliant HTTPS endpoint and a repeatable bounded pilot passes. Investigate the Open-Meteo failures before launch; do not interpret provider failure as a missing real-world condition.
