import { writeFile } from "node:fs/promises";
import { hasFiniteFields } from "./provider-pilot-validation.mjs";
import { selectRelevantGeocodeCandidate } from "../lib/providers/geocode-relevance.ts";

const locations = [
  "Connaught Place, New Delhi, India",
  "Dwarka Sector 21, New Delhi, India",
  "Saket, New Delhi, India",
  "Rohini Sector 10, New Delhi, India",
  "Lajpat Nagar, New Delhi, India",
  "Hauz Khas, New Delhi, India",
  "Anand Vihar, New Delhi, India",
  "Vasant Kunj, New Delhi, India",
  "Mayur Vihar Phase 1, New Delhi, India",
  "Karol Bagh, New Delhi, India",
  "Sector 62, Noida, Uttar Pradesh, India",
  "Sector 150, Noida, Uttar Pradesh, India",
  "Sector 18, Noida, Uttar Pradesh, India",
  "Indirapuram, Ghaziabad, Uttar Pradesh, India",
  "Vaishali, Ghaziabad, Uttar Pradesh, India",
  "Cyber City, Gurugram, Haryana, India",
  "Sector 56, Gurugram, Haryana, India",
  "Sohna Road, Gurugram, Haryana, India",
  "Faridabad Sector 15, Haryana, India",
  "Greater Noida Knowledge Park, Uttar Pradesh, India"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const checks = [];
let lastNominatimAt = 0;

const configuredOverpassList = process.env.OVERPASS_API_URLS?.trim();
const configuredOverpassSingle = process.env.OVERPASS_API_URL?.trim();
const configuredOverpassEndpoints = configuredOverpassList
  ? configuredOverpassList.split(/[;,]/).map((value) => value.trim()).filter(Boolean)
  : configuredOverpassSingle ? [configuredOverpassSingle] : [];
if (configuredOverpassEndpoints.length > 3) {
  throw new Error("Configure at most three OVERPASS_API_URLS endpoints for a bounded pilot run.");
}
const overpassEndpoints = (configuredOverpassEndpoints.length
  ? configuredOverpassEndpoints
  : [
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter"
    ]).map((endpoint) => {
    let parsedEndpoint;
    try {
      parsedEndpoint = new URL(endpoint);
    } catch {
      throw new Error("OVERPASS_API_URLS must contain valid HTTPS URLs.");
    }
    if (parsedEndpoint.protocol !== "https:") throw new Error("OVERPASS_API_URLS must use HTTPS.");
    return { url: parsedEndpoint.toString(), label: parsedEndpoint.host };
  });

async function checkJson(url, options = {}, timeoutMs = 12_000) {
  const started = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    const elapsedMs = Date.now() - started;
    if (!response.ok) return { ok: false, status: response.status, elapsedMs, error: `HTTP ${response.status}` };
    const body = await response.json();
    return { ok: true, status: response.status, elapsedMs, body };
  } catch (error) {
    return { ok: false, elapsedMs: Date.now() - started, error: error instanceof Error ? error.message : "Unknown fetch failure" };
  }
}

for (const query of locations) {
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
  if (wait) await sleep(wait);
  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
  geocodeUrl.searchParams.set("q", query);
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("addressdetails", "1");
  geocodeUrl.searchParams.set("limit", "5");
  const geo = await checkJson(geocodeUrl.toString(), {
    headers: { "User-Agent": "InfracisProviderPilot/1.0 (https://github.com/kaustubhdua/infracis)", Accept: "application/json" }
  });
  lastNominatimAt = Date.now();
  const candidates = geo.ok && Array.isArray(geo.body) ? geo.body : [];
  // Use the same conservative relevance selector as the live app. A syntactically
  // valid first Nominatim result is not enough: it may be a shop or other nearby POI.
  const selected = selectRelevantGeocodeCandidate(query, candidates);
  const lat = Number(selected?.lat);
  const lon = Number(selected?.lon);
  const validGeo = !!selected && typeof selected.display_name === "string" &&
    Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lon) && lon >= -180 && lon <= 180;

  const result = {
    query,
    geocoding: {
      ok: validGeo,
      status: geo.status ?? null,
      elapsedMs: geo.elapsedMs,
      resolvedLabel: validGeo ? selected.display_name : null,
      resolvedClass: validGeo && typeof (selected.category ?? selected.class) === "string" ? (selected.category ?? selected.class) : null,
      resolvedType: validGeo && typeof selected.type === "string" ? selected.type : null,
      resolvedAddressType: validGeo && typeof selected.addresstype === "string" ? selected.addresstype : null,
      latitude: validGeo ? lat : null,
      longitude: validGeo ? lon : null,
      error: validGeo ? null : geo.error ?? (geo.ok ? "No valid matching result" : "Geocoding request failed"),
      source: "OpenStreetMap Nominatim"
    },
    weather: null,
    airQuality: null,
    amenities: null
  };

  if (validGeo) {
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(lat));
    weatherUrl.searchParams.set("longitude", String(lon));
    weatherUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m");
    weatherUrl.searchParams.set("timezone", "auto");
    const weather = await checkJson(weatherUrl.toString(), { headers: { Accept: "application/json" } });
    const current = weather.ok ? weather.body?.current : null;
    const weatherValid = !!current && typeof current.time === "string" && Number.isFinite(Date.parse(current.time)) &&
      hasFiniteFields(current, ["temperature_2m", "relative_humidity_2m", "precipitation", "weather_code", "wind_speed_10m"]);
    result.weather = {
      ok: weatherValid, status: weather.status ?? null, elapsedMs: weather.elapsedMs,
      observationTime: weatherValid ? current.time : null,
      fieldsReturned: current && typeof current === "object" ? Object.keys(current).filter((key) => current[key] !== null && current[key] !== undefined) : [],
      error: weatherValid ? null : weather.error ?? "Invalid or missing current weather fields",
      source: "Open-Meteo Forecast API"
    };

    const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    airUrl.searchParams.set("latitude", String(lat));
    airUrl.searchParams.set("longitude", String(lon));
    airUrl.searchParams.set("current", "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone");
    airUrl.searchParams.set("timezone", "auto");
    const air = await checkJson(airUrl.toString(), { headers: { Accept: "application/json" } });
    const airCurrent = air.ok ? air.body?.current : null;
    const airValid = !!airCurrent && typeof airCurrent.time === "string" && Number.isFinite(Date.parse(airCurrent.time)) &&
      hasFiniteFields(airCurrent, ["european_aqi", "pm10", "pm2_5", "nitrogen_dioxide", "ozone"]);
    result.airQuality = {
      ok: airValid, status: air.status ?? null, elapsedMs: air.elapsedMs,
      observationTime: airValid ? airCurrent.time : null,
      fieldsReturned: airCurrent && typeof airCurrent === "object" ? Object.keys(airCurrent).filter((key) => airCurrent[key] !== null && airCurrent[key] !== undefined) : [],
      error: airValid ? null : air.error ?? "Invalid or missing current air-quality fields",
      source: "Open-Meteo Air Quality API"
    };

    const overpassQuery = `[out:json][timeout:10];(nwr(around:1200,${lat},${lon})[amenity~"^(school|kindergarten|college|university|hospital|clinic|pharmacy|bank|atm|marketplace|supermarket|bus_station|police|fire_station|library|place_of_worship)$"];nwr(around:1200,${lat},${lon})[highway="bus_stop"];nwr(around:1200,${lat},${lon})[railway~"^(station|subway_entrance|tram_stop)$"];nwr(around:1200,${lat},${lon})[leisure~"^(park|playground)$"];);out center tags 100;`;
    let overpass = null;
    const overpassAttempts = [];
    for (const endpointConfig of overpassEndpoints) {
      const endpoint = endpointConfig.url;
      const probe = await checkJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "InfracisProviderPilot/1.0 (https://github.com/kaustubhdua/infracis)"
        },
        body: new URLSearchParams({ data: overpassQuery })
      }, 7000);
      const elements = probe.ok && Array.isArray(probe.body?.elements) ? probe.body.elements : null;
      overpassAttempts.push({
        endpoint: endpointConfig.label,
        ok: elements !== null,
        status: probe.status ?? null,
        elapsedMs: probe.elapsedMs,
        error: elements !== null ? null : probe.error ?? "Invalid or missing elements array"
      });
      if (elements !== null) {
        overpass = { ...probe, endpoint: endpointConfig.label, elements };
        break;
      }
    }
    const elements = overpass?.elements ?? null;
    result.amenities = {
      ok: elements !== null,
      status: overpass?.status ?? null,
      elapsedMs: overpassAttempts.reduce((total, attempt) => total + (attempt.elapsedMs ?? 0), 0),
      endpoint: overpass?.endpoint ?? null,
      attempts: overpassAttempts,
      returnedElementCount: elements?.length ?? null,
      namedElementCount: elements?.filter((element) => typeof element?.tags?.name === "string" && element.tags.name.trim()).length ?? null,
      error: elements !== null ? null : overpassAttempts.at(-1)?.error ?? "No Overpass endpoint was configured or reachable",
      source: "OpenStreetMap Overpass API"
    };
    // Be conservative with the shared public Overpass service.
    await sleep(1100);
  }
  checks.push(result);
}

const counts = {};
for (const field of ["geocoding", "weather", "airQuality", "amenities"]) {
  const present = checks.filter((sample) => sample[field] !== null);
  counts[field] = {
    attempted: present.length,
    passed: present.filter((sample) => sample[field].ok).length,
    failed: present.filter((sample) => !sample[field].ok).length,
    passRate: present.length ? Number((present.filter((sample) => sample[field].ok).length / present.length).toFixed(4)) : null
  };
}
const report = {
  generatedAt: new Date().toISOString(),
  pilotGeography: "Delhi NCR, India",
  sampleCount: locations.length,
  method: "Live provider calls; Nominatim queries are spaced at least 1.1 seconds apart and request up to five candidates. Geocoding passes only when the same conservative token-relevance selector used by production accepts a candidate; provider-data passes require the response envelope and every requested field to be present and valid. Neither proves geographic completeness or ground truth. Overpass failover is sequential and bounded to at most three explicitly configured HTTPS endpoints.",
  attribution: [
    "© OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright",
    "Weather and air-quality data from Open-Meteo (CC BY 4.0) — https://open-meteo.com/en/terms"
  ],
  limitations: [
    "Mapped amenity absence is not proof that an amenity does not exist.",
    "Weather and air quality are model/grid estimates, not on-site measurements.",
    "This automated probe does not independently verify geocoded addresses against local ground truth.",
    "Public providers may rate-limit or return partial results."
  ],
  counts,
  samples: checks
};
await writeFile("provider-pilot-report.json", JSON.stringify(report, null, 2));
const lines = [
  "# Infracis live-provider pilot",
  "",
  `- Generated: ${report.generatedAt}`,
  `- Geography: ${report.pilotGeography}`,
  `- Sample count: ${report.sampleCount}`,
  "",
  "| Provider | Passed | Failed | Pass rate |",
  "|---|---:|---:|---:|",
  ...Object.entries(counts).map(([name, stats]) => `|${name}|${stats.passed}|${stats.failed}|${stats.passRate === null ? "n/a" : (stats.passRate * 100).toFixed(1) + "%"}|`),
  "",
  "Geocoding passes only when the production relevance guard accepts one of up to five candidates. Other provider passes require response shape and all expected fields. Neither proves geographic completeness or ground truth.",
  "",
  "## Failed samples",
  ...checks.flatMap((sample) => ["geocoding", "weather", "airQuality", "amenities"].filter((field) => sample[field] && !sample[field].ok).map((field) => `- ${sample.query} — ${field}: ${sample[field].error}`)),
  "",
  "## Limitations",
  ...report.limitations.map((item) => `- ${item}`),
  "",
  ...report.attribution.map((item) => `- ${item}`)
];
await writeFile("provider-pilot-report.md", lines.join("\n") + "\n");
console.log(JSON.stringify({ generatedAt: report.generatedAt, sampleCount: report.sampleCount, counts }, null, 2));
