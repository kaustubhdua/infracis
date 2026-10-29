# Vercel runtime configuration

This guide lists the environment variables used by the current Next.js application. Configure them in **Vercel → Project → Settings → Environment Variables**, select the appropriate Production/Preview/Development targets, then create a new deployment when deployment is authorized. Do not paste secret values into GitHub, source files, browser-visible variables, or chat.

## Required for analysis and comparison

| Variable | Purpose | Required behavior |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Shared Redis REST endpoint for API rate limiting, global Nominatim request pacing, and provider caching | Required in production. The analysis and comparison routes fail closed with HTTP 503 when shared limiting is absent or unreachable. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-side authentication for the Upstash Redis REST endpoint | Required in production. Keep secret; never prefix with `NEXT_PUBLIC_`. |
| `OVERPASS_API_URL` or `OVERPASS_API_URLS` | HTTPS endpoint(s) for real mapped amenity retrieval | Strongly recommended before real-world evaluation. Use a provider whose terms and capacity fit the deployment. Up to three HTTPS endpoints are supported; 429/406 stops failover. The default public endpoints failed the latest Delhi NCR pilot, so do not represent amenity coverage as verified until a new pilot passes. |
| `GROQ_API_KEY` | Enables optional AI narrative for a location report and comparison | Server-side only. The deterministic evidence report still works without it. Never use `NEXT_PUBLIC_GROQ_API_KEY`. |
| `GROQ_MODEL` | Optional model override | Defaults to `openai/gpt-oss-20b`; only set a model supported by the Groq account. |

## Map and NASA imagery

- The interactive map uses Leaflet and public NASA Earthdata GIBS VIIRS imagery as an optional satellite layer.
- **The GIBS map layer does not use `NASA_API_KEY`**. A NASA API key may be configured in Vercel for other NASA APIs, but the current application source does not read it. Do not claim that a secret is being used just because it exists in Vercel.
- `NEXT_PUBLIC_MAP_TILE_URL` is an optional custom street-tile URL template. If set, ensure the endpoint is permitted for the expected traffic and that attribution remains visible.
- Map tile services can fail independently of the analysis API. The UI should show an unavailable/fallback state rather than imply satellite imagery is current or complete.

## Providers and terms

- Nominatim is a public geocoder with strict usage limits. The app intentionally avoids autocomplete and uses shared request pacing. Verify the global pacing behavior against Redis before launch.
- Open-Meteo values are model-derived, not on-site sensor readings. Its free tier is non-commercial; confirm a suitable plan before commercial use.
- OpenStreetMap/Overpass amenities are community-mapped and incomplete. An empty/unavailable response is not evidence that a facility does not exist.
- Groq text is an optional interpretation of a bounded report payload. It must not invent crime, flood, title, structural, valuation, safety, review, or other unsupported facts.

## Persistence and reviews

The current saved reports, analysis preferences, map preference, and locality experience notes/ratings are browser/device-local. They are not cloud-synced and do not produce a public aggregate rating. Do not add Supabase variables or enable cloud persistence until a dedicated project, migration, Auth, owner-scoped CRUD, and RLS isolation tests are verified.

## Safe verification checklist

- [ ] Verify variable **names and target environments** in Vercel without exposing secret values in logs.
- [ ] Confirm Redis keys are present and test the actual deployed API health/rate-limit behavior.
- [ ] Confirm the Groq route returns a controlled 503 when unconfigured and a bounded, sanitized narrative when configured.
- [ ] Run the 20-location provider pilot with the same Overpass endpoint(s) configured for the application; retain the actual artifact and independently spot-check locality matches.
- [ ] Test map styles with cookies enabled and blocked; test satellite-tile failures.
- [ ] Do not deploy until the operator explicitly authorizes deployment and the release gates in `PRODUCTION_RUNBOOK.md` are satisfied.
