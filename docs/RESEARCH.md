# Research: Infracis location due diligence

Research snapshot: 28 October 2026. This is desk research, not a completed customer-discovery study. Source coverage and access terms must be rechecked during implementation.

## Executive conclusion

The broad category is already served by property portals, mapping tools, real-estate analytics platforms, and hazard-information products. Therefore, “put many location datasets on one map” is not a defensible novelty claim.

The stronger product hypothesis is an **evidence-first location due-diligence workflow**: a user-selected location is assessed using sourced observations and transparent calculations; each claim carries provenance and freshness; uncertainty and missing evidence are visible; and the output tells a buyer what to verify next.

## Primary-source and market evidence

### Official and public data candidates

1. **India Open Government Data Platform — data.gov.in**
   - Portal: https://data.gov.in/
   - Research observation: the portal exposes government datasets and web services across categories including environment, health, economy and more.
   - Use: discover candidate datasets for specific MVP signals. Do not assume a dataset has an API, suitable granularity, current updates, or a license for every use until its individual page is inspected.
   - Risk: portal maintenance or individual dataset quality can affect availability.

2. **NRSC / ISRO Bhuvan flood hazard information**
   - Flood hazard page: https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/flood_hz/flood_hz.php?uname=empty
   - NRSC thematic products: https://www.nrsc.gov.in/nrscnew/Dataproducts_Thematic_overview.php
   - Research observation: historical flood-inundation datasets and thematic map services are available for some geographies. The provider warns that satellite coverage may miss peak inundation, flash flooding, minor flooding, or other events.
   - Use: a clearly caveated contextual layer if the chosen geography is covered and reuse/access is verified.
   - Do not infer that absence of mapped inundation means a property is flood-safe.

3. **OpenStreetMap**
   - Project: https://www.openstreetmap.org/
   - Use: nearby amenities and map context, subject to ODbL attribution and applicable reuse obligations.
   - Risks: completeness and freshness vary by area. POI proximity does not establish quality, opening status, accessibility, or service availability.

4. **Open-Meteo**
   - Documentation: https://open-meteo.com/en/docs
   - Candidate for weather and historical climate variables, subject to endpoint, model, coverage, and license terms.
   - Weather or gridded climate values must not be represented as a direct on-site environmental measurement.

5. **India property regulation and records**
   - RERA portals and land records are jurisdiction-specific. A future legal-document module must link to the relevant official regulator/record and clearly distinguish a search result from legal title verification.
   - Legal checks are out of scope for the first MVP.

## Competitor and adjacent-product review

### PrimusProp — buyer-side real-estate intelligence
- URL: https://primusprop.com/about
- Public positioning includes location, asset, market, financial, legal and risk intelligence for individual buyers.
- Implication: buyer-side property due diligence is already an occupied category. Infracis should not claim to be the first buyer-side intelligence platform.

### PropertyCibil — property intelligence map
- URL: https://www.propertycibil.com/index.html
- Public interface describes property, environment, disaster-risk, AQI, water-level, land-use and other map layers.
- Implication: a layered property map alone is not distinctive.

### DOSL — document-led property due diligence
- URL: https://www.dosl.in/
- Public positioning emphasizes regulator filings, land records, master plans, source-linked document evidence, and careful document reading.
- Implication: provenance and evidence linking are important but not novel by themselves. Infracis needs a clear location-level workflow and transparent unknowns.

### India Flood Atlas / NEER
- URL: https://flood.neer.io/
- Public positioning includes flood-hazard maps and property/portfolio exposure analysis.
- Implication: do not claim flood scoring is unique. Use flood layers only when source, methodology, coverage, and access terms are understood.

### Esri GIS real-estate site selection
- URL: https://distributor-blogs.esri.com/en-in/newsroom/blog/gis-for-real-estate-site-selection
- Discusses catchments, connectivity, competitive supply, demand, and environmental exposure for site selection.
- Implication: developer-oriented GIS suitability is a mature practice. Defer builder scoring until the buyer workflow is validated.

## Differentiation hypothesis to test

Infracis should combine these behaviors into one understandable workflow:
1. Every material claim is tagged as observed, calculated, model-assisted, or unknown.
2. Each claim exposes source, observation/update date, spatial granularity, and limitations.
3. A two-location comparison uses the same metrics and clearly shows incomparable/missing data.
4. AI explains only retrieved evidence and documented calculations; it cannot invent facts or produce untraceable risk scores.
5. The report ends with a prioritized list of due-diligence questions and links to authoritative follow-up sources.

This is a hypothesis, not a verified unique market position.

## Customer discovery plan

Before claiming demand:
- Interview 5–8 prospective renters/home buyers and 2–3 property professionals.
- Ask them to describe the last location/property decision, which sources they used, what they could not verify, and which unknowns caused delay or anxiety.
- Avoid leading questions such as “Would you use an AI location tool?”
- Ask participants to compare a sample report with their current process.
- Record consent and anonymize notes.
- Success signal: users can identify at least one useful, actionable finding they could not readily assemble, and can trace it to evidence.
- Failure signal: users mainly want price inventory, legal title checks, or data the MVP cannot reliably source. Narrow or change the product accordingly.

## Data-source readiness checklist

For each proposed provider, record:
- Official endpoint/page and owner
- License and attribution obligations
- Geographic coverage and spatial resolution
- Observation date versus publication/retrieval date
- Update cadence and known gaps
- API limits, authentication, and cost
- Failure behavior and caching policy
- Fields used and transformations applied
- Manual validation examples

No integration is “real” until it is implemented and tested against the actual provider. Search-result snippets and this research note do not prove runtime availability.

## Research references

- Open Government Data Platform India: https://data.gov.in/
- NRSC flood hazard information: https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/flood_hz/flood_hz.php?uname=empty
- NRSC thematic products: https://www.nrsc.gov.in/nrscnew/Dataproducts_Thematic_overview.php
- OpenStreetMap: https://www.openstreetmap.org/
- Open-Meteo: https://open-meteo.com/en/docs
- PrimusProp: https://primusprop.com/about
- PropertyCibil: https://www.propertycibil.com/index.html
- DOSL: https://www.dosl.in/
- India Flood Atlas: https://flood.neer.io/
- Esri GIS site-selection overview: https://distributor-blogs.esri.com/en-in/newsroom/blog/gis-for-real-estate-site-selection


## 2026-10-28 release-blocking research update

This is a web-researched security and provider-terms check, not a substitute for running the application.

### Framework security: do not release the current dependency set as production-ready

- The repository lockfile pins Next.js **14.2.35**. The official Next.js support policy lists 14.x as unsupported, while the official security advisory page includes critical 2026 issues. The Cyber Security Agency of Singapore's 20 October 2026 alert says affected Next.js versions must be patched immediately and lists fixed releases including Next.js 15.5.28 for 10.x–15.x and 16.4.1 for 16.x.
- Sources: https://nextjs.org/support-policy ; https://github.com/vercel/next.js/security/advisories ; https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2026-148/
- **Release gate:** upgrade to a supported, security-patched Next.js release and compatible `eslint-config-next`, regenerate and commit the lockfile with the package manager, then run all tests, lint, typecheck, build, and deployed smoke tests. Do not edit only the version string while leaving a stale lockfile. A major framework upgrade must be tested, not assumed compatible.

### Weather API terms: product use must match the plan

- Open-Meteo's official terms state its free API is for non-commercial use with a 10,000-call/day ceiling and lower minute/hour limits; commercial use requires an appropriate paid plan. Data attribution under CC BY 4.0 is required. A commercial product must not rely on the free non-commercial tier merely because the endpoint works without an API key.
- Sources: https://open-meteo.com/en/terms ; https://open-meteo.com/
- **Release gate:** decide whether Infracis is non-commercial or commercial. If commercial, obtain the required plan or self-host a compliant instance; display required attribution near the data and document the selected service plan.

### Nominatim: usage policy remains a hard constraint

- The public Nominatim policy allows at most one request per second across the application, requires identifying User-Agent/Referer and attribution, prohibits autocomplete, and advises caching/proxying and a service-switch path. A process-local delay is not a shared global limiter across serverless instances.
- Source: https://operations.osmfoundation.org/policies/nominatim/
- **Release gate:** use an adapter that can switch providers; implement shared caching and enforce policy across the deployed service, or self-host/use another geocoder under its terms. Do not promise unrestricted public geocoding.

### Practical release decision

Until the framework dependency is upgraded, provider terms are aligned with intended use, and the exact release commit passes automated and live checks, Infracis should be presented as a functional MVP in verification—not as a production-ready or certified property-risk service.
