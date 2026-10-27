import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Place = {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
};

type Source = {
  name: string;
  url: string;
  retrievedAt: string;
  status: "available" | "unavailable";
  note: string;
};

const cache = new Map<string, { expires: number; value: unknown }>();
let lastNominatimRequest = 0;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(9000),
    headers: {
      Accept: "application/json",
      ...init.headers
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.json();
}

async function geocode(query: string): Promise<Place> {
  const key = `geo:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value as Place;

  // Nominatim requires deliberate, user-triggered searches; this route does not implement autocomplete.
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimRequest));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimRequest = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const results = await fetchJson(url.toString(), {
    headers: { "User-Agent": "Infracis/0.1 (location due diligence; contact via repository)" }
  }) as Place[];

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No matching location was found. Try a more specific address or locality.");
  }
  cache.set(key, { expires: Date.now() + 24 * 60 * 60 * 1000, value: results[0] });
  return results[0];
}

async function getWeather(lat: number, lon: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");
  return fetchJson(url.toString()) as Promise<{
    current?: {
      time?: string;
      temperature_2m?: number;
      relative_humidity_2m?: number;
      precipitation?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    current_units?: Record<string, string>;
    timezone?: string;
  }>;
}

async function getAmenities(lat: number, lon: number) {
  // One bounded query on explicit user submission; not a systematic area crawl.
  const query = `[out:json][timeout:8];(node(around:1000,${lat},${lon})[amenity~"^(school|hospital|clinic|pharmacy|bank|marketplace|supermarket|bus_station|library|police|fire_station)$"];way(around:1000,${lat},${lon})[amenity~"^(school|hospital|clinic|pharmacy|bank|marketplace|supermarket|bus_station|library|police|fire_station)$"];);out center tags 60;`;
  const body = new URLSearchParams({ data: query });
  const data = await fetchJson("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body
  }) as { elements?: Array<{ id: number; type: string; tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }> };

  const elements = Array.isArray(data.elements) ? data.elements : [];
  const items = elements.map((element) => ({
    id: `${element.type}-${element.id}`,
    name: element.tags?.name || element.tags?.["name:en"] || "Unnamed mapped amenity",
    category: element.tags?.amenity || "amenity",
    lat: element.lat ?? element.center?.lat ?? null,
    lon: element.lon ?? element.center?.lon ?? null
  }));
  return {
    count: items.length,
    categories: items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}),
    items: items.slice(0, 20)
  };
}

export async function POST(request: NextRequest) {
  let query = "";
  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
  } catch {
    return jsonError("Send a valid JSON body containing a location query.", 400);
  }

  if (query.length < 3 || query.length > 180) {
    return jsonError("Enter a location between 3 and 180 characters.", 400);
  }

  const cacheKey = `analysis:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.value, { headers: { "X-Infracis-Cache": "HIT" } });
  }

  try {
    const place = await geocode(query);
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return jsonError("The location provider returned invalid coordinates.", 502);
    }

    const [weatherResult, amenitiesResult] = await Promise.allSettled([
      getWeather(lat, lon),
      getAmenities(lat, lon)
    ]);
    const retrievedAt = new Date().toISOString();

    const sources: Source[] = [
      {
        name: "OpenStreetMap Nominatim",
        url: "https://nominatim.openstreetmap.org/",
        retrievedAt,
        status: "available",
        note: "Geocoding result; address matching can be imperfect. Not a cadastral or property-boundary record."
      },
      {
        name: "Open-Meteo",
        url: "https://open-meteo.com/",
        retrievedAt,
        status: weatherResult.status === "fulfilled" ? "available" : "unavailable",
        note: "Weather-model output for the coordinate; not an on-site sensor measurement."
      },
      {
        name: "OpenStreetMap via Overpass",
        url: "https://overpass-api.de/",
        retrievedAt,
        status: amenitiesResult.status === "fulfilled" ? "available" : "unavailable",
        note: "Mapped amenities within approximately 1 km; map completeness and freshness vary by area."
      }
    ];

    const result = {
      generatedAt: retrievedAt,
      location: {
        label: place.display_name,
        latitude: lat,
        longitude: lon,
        mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
      },
      weather: weatherResult.status === "fulfilled" ? weatherResult.value.current ?? null : null,
      weatherUnits: weatherResult.status === "fulfilled" ? weatherResult.value.current_units ?? {} : {},
      weatherTimezone: weatherResult.status === "fulfilled" ? weatherResult.value.timezone ?? null : null,
      amenities: amenitiesResult.status === "fulfilled" ? amenitiesResult.value : null,
      sources,
      limitations: [
        "This is a preliminary location context report, not a property inspection, title search, legal opinion, or investment recommendation.",
        "No flood, crime, air-quality, structural, or resale-value conclusion is made by this version.",
        "Missing data or missing mapped amenities must not be interpreted as proof that a risk or service is absent.",
        "Weather values are model output at a coordinate, not a measurement taken at the property."
      ]
    };

    cache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, value: result });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Infracis-Cache": "MISS" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Location analysis failed.";
    const status = message.includes("No matching location") ? 404 : 502;
    return jsonError(
      status === 404 ? message : "One of the required location services could not complete. Please retry shortly; no substitute data was generated.",
      status
    );
  }
}
