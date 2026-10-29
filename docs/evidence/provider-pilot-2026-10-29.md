# Live provider pilot — 2026-10-29

**Result: FAIL — do not treat public-provider data retrieval as production-ready.**

- Workflow: [Live provider pilot run 40812600499](https://github.com/kaustubhdua/infracis/actions/runs/40812600499)
- Artifact: `infracis-provider-pilot` (artifact ID `12871302227`, SHA-256 `41bf24e8d7b28285d520ab9cad7a309cc1c2047f844ad2ab7a4452762abe9fa8`; retained by GitHub Actions until 2026-11-28)
- Candidate tested by the workflow: `92b52378ea835d8f25c8cbec8d5ab856be9ca632`
- Sample: 20 Delhi NCR locality queries. Nominatim calls were spaced at least 1.1 seconds apart. Weather, air quality, and amenities were attempted only after a valid-looking geocoder response.

## Measured result

| Provider | Attempts | Passed | Failed | Pass rate |
|---|---:|---:|---:|---:|
| Nominatim response envelope | 20 | 18 | 2 | 90.0% |
| Open-Meteo weather | 18 | 10 | 8 | 55.6% |
| Open-Meteo air quality | 18 | 10 | 8 | 55.6% |
| Overpass amenities | 18 | 0 | 18 | 0.0% |

A pass means the response shape and all requested fields met the script's checks. It does **not** establish ground truth, completeness, or the application-level geocoder's acceptance rate.

## Findings

1. **Overpass is the clearest release blocker.** Neither of the two public endpoints returned a valid amenity result for any of the 18 geocoded samples. The recorded causes were HTTP 502 and timeouts. The code correctly leaves amenity evidence unavailable; the release must not represent this as zero nearby amenities.
2. **Weather and air-quality reliability was poor in this run.** Eight of 18 requests for each provider failed, usually with `fetch failed`. This is one runner/session, not a statistically representative long-term uptime estimate, but it is insufficient evidence for a reliable production claim.
3. **Raw geocoder success overstates locality resolution.** The pilot uses a single Nominatim result (`limit=1`) to measure provider responses, not the app's five-candidate relevance selector. Several returned labels were businesses or points of interest for locality queries (including a school for Saket and shops for Rohini Sector 10 and Lajpat Nagar). These samples must be treated as semantic mismatches in this raw-provider probe; do not interpret the 90% figure as application-level geocoding accuracy.
4. **No synthetic fallback was used.** Failed requests remain failed/unknown, as required.

## Required next actions

- Keep the production release gate closed until an appropriately licensed and capacity-matched Overpass endpoint is configured and verified against the real application route. Public shared endpoints have no service-level guarantee.
- Investigate why the hosted runner could not consistently reach Open-Meteo, then rerun a small bounded verification with per-provider timing/status and an explicit retry/backoff policy that respects provider terms.
- Extend the pilot to exercise the app's actual geocode relevance selector (five candidates), not only the raw Nominatim first result; manually review each resolved label and coordinate.
- Keep the Nominatim app-wide 1 request/second limit, attribution, caching, and ability to switch provider. See the [official Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/).
- Keep Open-Meteo non-commercial terms and attribution in scope; select a suitable paid plan or compliant alternative before commercial use. See [official Open-Meteo terms](https://open-meteo.com/en/terms).

## Limitations

This was one bounded live run from GitHub-hosted CI. It does not prove all-time availability, real-user latency, application deployment health, or location ground truth. No deployment was performed.
