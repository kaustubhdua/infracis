import { LocationData } from "../types";
import { getSharedJson, setSharedJson, waitForNominatimSlot } from "../shared-provider-cache";
import { selectRelevantGeocodeCandidate, GeocodeCandidate } from "./geocode-relevance";

const cache = new Map<string, { expires: number; value: LocationData }>();

export async function geocodeLocation(query: string): Promise<LocationData> {
  const normalizedKey = query.toLowerCase().trim();
  const shared = await getSharedJson<LocationData>(`nominatim:v2:${normalizedKey}`);
  if (shared) return shared;
  const cached = cache.get(normalizedKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // The shared Redis reservation enforces the application-wide 1 req/sec policy.
  // Local spacing is only a development fallback; production fails closed.
  const slotReserved = await waitForNominatimSlot();
  if (!slotReserved) throw new Error("Geocoding is temporarily unavailable because shared provider throttling is not configured or reachable.");

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  // This product investigates a locality/address, not a nearby POI whose label
  // happens to contain the locality name. Nominatim's address layer still
  // supports streets and address points while excluding restaurants, shops,
  // schools, and other POI-only matches that previously crowded out localities.
  url.searchParams.set("layer", "address");
  url.searchParams.set("limit", "10");

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

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Geocoding service returned an invalid response shape.");
  const results = payload as GeocodeCandidate[];

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`No matching location found for "${query}". Try providing locality, city, or postal code.`);
  }

  const item = selectRelevantGeocodeCandidate(query, results);
  if (!item) {
    throw new Error(`No matching location found confidently for "${query}". The top map results did not match enough of the location name, or multiple results were equally plausible. Add a sector, locality, city, or postal code and try again.`);
  }
  if (!item || typeof item !== "object" || typeof item.display_name !== "string" || !item.display_name.trim()) {
    throw new Error("Geocoding service returned a result without a valid location label.");
  }
  const lat = Number(item.lat);
  const lon = Number(item.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error("Geocoding service returned invalid numerical coordinates.");
  }

  const locationData: LocationData = {
    label: item.display_name,
    latitude: lat,
    longitude: lon,
    osmType: item.type,
    boundingbox: Array.isArray(item.boundingbox) &&
      item.boundingbox.length === 4 &&
      item.boundingbox.every((value) => typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) &&
      Number(item.boundingbox[0]) >= -90 && Number(item.boundingbox[0]) <= 90 &&
      Number(item.boundingbox[1]) >= -90 && Number(item.boundingbox[1]) <= 90 &&
      Number(item.boundingbox[2]) >= -180 && Number(item.boundingbox[2]) <= 180 &&
      Number(item.boundingbox[3]) >= -180 && Number(item.boundingbox[3]) <= 180 &&
      Number(item.boundingbox[0]) <= Number(item.boundingbox[1]) &&
      Number(item.boundingbox[2]) <= Number(item.boundingbox[3])
      ? [Number(item.boundingbox[0]), Number(item.boundingbox[1]), Number(item.boundingbox[2]), Number(item.boundingbox[3])]
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
  await setSharedJson(`nominatim:v2:${normalizedKey}`, locationData, 24 * 60 * 60);

  return locationData;
}


const reverseCache = new Map<string, { expires: number; value: string }>();

/** Reverse-geocode only on an explicit user action (e.g. "Use my location"). */
export async function reverseGeocodeLabel(latitude: number, longitude: number): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const key = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const shared = await getSharedJson<string>(`nominatim:reverse:v1:${key}`);
  if (shared && shared.trim()) return shared;
  const cached = reverseCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const slotReserved = await waitForNominatimSlot();
    if (!slotReserved) return null;
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "InfracisLocationDueDiligence/1.0 (contact: github.com/kaustubhdua/infracis)",
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(9000),
      cache: "no-store"
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    const label = (payload as { display_name?: unknown }).display_name;
    if (typeof label !== "string" || !label.trim()) return null;
    const value = label.trim().slice(0, 240);
    if (reverseCache.size >= 500) {
      const oldestKey = reverseCache.keys().next().value;
      if (oldestKey !== undefined) reverseCache.delete(oldestKey);
    }
    reverseCache.set(key, { expires: Date.now() + 24 * 60 * 60 * 1000, value });
    await setSharedJson(`nominatim:reverse:v1:${key}`, value, 24 * 60 * 60);
    return value;
  } catch {
    return null;
  }
}
