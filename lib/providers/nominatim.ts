import { LocationData } from "../types";

const cache = new Map<string, { expires: number; value: LocationData }>();
let lastRequestTimestamp = 0;

export async function geocodeLocation(query: string): Promise<LocationData> {
  const normalizedKey = query.toLowerCase().trim();
  const cached = cache.get(normalizedKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Comply with Nominatim 1 req/sec policy
  const now = Date.now();
  const waitMs = Math.max(0, 1100 - (now - lastRequestTimestamp));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestTimestamp = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "InfracisLocationDueDiligence/1.0 (contact: github.com/kaustubhdua/infracis)",
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(9000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed with HTTP ${response.status}`);
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    type?: string;
    boundingbox?: [string, string, string, string];
  }>;

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`No matching location found for "${query}". Try providing locality, city, or postal code.`);
  }

  const item = results[0];
  const lat = Number(item.lat);
  const lon = Number(item.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Geocoding service returned invalid numerical coordinates.");
  }

  const locationData: LocationData = {
    label: item.display_name,
    latitude: lat,
    longitude: lon,
    osmType: item.type,
    boundingbox: item.boundingbox
      ? [
          Number(item.boundingbox[0]),
          Number(item.boundingbox[1]),
          Number(item.boundingbox[2]),
          Number(item.boundingbox[3])
        ]
      : undefined,
    mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
  };

  if (!cache.has(normalizedKey) && cache.size >= 2000) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(normalizedKey, {
    expires: Date.now() + 24 * 60 * 60 * 1000,
    value: locationData
  });

  return locationData;
}
