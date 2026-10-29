import { LocationData } from "../types";
import { getSharedJson, setSharedJson, waitForNominatimSlot } from "../shared-provider-cache";
import { selectRelevantGeocodeCandidate, GeocodeCandidate } from "./geocode-relevance";

const cache = new Map<string, { expires: number; value: LocationData }>();

function toLocationData(item: GeocodeCandidate): LocationData | null {
  if (!item || typeof item.display_name !== "string" || !item.display_name.trim()) return null;
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const box = item.boundingbox;
  const boundingbox = Array.isArray(box) &&
    box.length === 4 &&
    box.every((value) => typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) &&
    Number(box[0]) >= -90 && Number(box[0]) <= 90 &&
    Number(box[1]) >= -90 && Number(box[1]) <= 90 &&
    Number(box[2]) >= -180 && Number(box[2]) <= 180 &&
    Number(box[3]) >= -180 && Number(box[3]) <= 180 &&
    Number(box[0]) <= Number(box[1]) &&
    Number(box[2]) <= Number(box[3])
    ? [Number(box[0]), Number(box[1]), Number(box[2]), Number(box[3])] as [number, number, number, number]
    : undefined;
  return {
    label: item.display_name.trim(),
    latitude: lat,
    longitude: lon,
    osmType: item.type,
    boundingbox,
    mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
  };
}

type PhotonProperties = Record<string, unknown> & {
  name?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
  extent?: number[];
};

function photonFeatureToCandidate(feature: unknown): GeocodeCandidate | null {
  if (!feature || typeof feature !== "object" || Array.isArray(feature)) return null;
  const value = feature as { geometry?: { coordinates?: unknown }; properties?: unknown };
  const coordinates = value.geometry?.coordinates;
  const props = value.properties as PhotonProperties | undefined;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || !props) return null;
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const address: Record<string, string> = {};
  for (const key of ["name", "housenumber", "street", "district", "suburb", "locality", "city", "county", "state", "postcode", "country"]) {
    const part = props[key];
    if (typeof part === "string" && part.trim()) address[key] = part.trim();
  }
  const labelParts = ["name", "street", "district", "suburb", "locality", "city", "county", "state", "postcode", "country"]
    .map((key) => address[key])
    .filter((part): part is string => !!part);
  const displayName = [...new Set(labelParts)].join(", ");
  if (!displayName) return null;

  let boundingbox: [string, string, string, string] | undefined;
  const extent = props.extent;
  if (Array.isArray(extent) && extent.length === 4 && extent.every((n) => typeof n === "number" && Number.isFinite(n))) {
    // Photon extent order is west, south, east, north; Nominatim uses south, north, west, east.
    boundingbox = [String(extent[1]), String(extent[3]), String(extent[0]), String(extent[2])];
  }
  const category = typeof props.osm_key === "string" ? props.osm_key : "place";
  const featureType = typeof props.type === "string" ? props.type : typeof props.osm_value === "string" ? props.osm_value : "locality";
  return {
    lat: String(lat),
    lon: String(lon),
    display_name: displayName,
    category,
    class: category,
    type: featureType,
    addresstype: featureType,
    address,
    boundingbox
  };
}

/** Best-effort Photon fallback. Its public demo has no SLA; strict relevance checks still apply. */
export async function geocodeWithPhoton(query: string): Promise<LocationData | null> {
  try {
    const configured = process.env.PHOTON_API_URL?.trim() || "https://photon.komoot.io/api/";
    const url = new URL(configured);
    if (url.protocol !== "https:") return null;
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("lang", "en");
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/geo+json, application/json", "User-Agent": "InfracisLocationDueDiligence/1.0 (https://github.com/kaustubhdua/infracis)" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store"
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray((payload as { features?: unknown }).features)) return null;
    const candidates = (payload as { features: unknown[] }).features
      .map(photonFeatureToCandidate)
      .filter((candidate): candidate is GeocodeCandidate => candidate !== null);
    const selected = selectRelevantGeocodeCandidate(query, candidates);
    return selected ? toLocationData(selected) : null;
  } catch {
    return null;
  }
}

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

  let locationData: LocationData | null = null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    // Keep the locality recall broad enough to return place features, but never
    // accept a POI that only mentions the searched locality.
    url.searchParams.set("layer", "address,poi");
    url.searchParams.set("limit", "10");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "InfracisLocationDueDiligence/1.0 (contact: github.com/kaustubhdua/infracis)",
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(9000),
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Nominatim geocoding failed with HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("Nominatim returned an invalid response shape.");
    const item = selectRelevantGeocodeCandidate(query, payload as GeocodeCandidate[]);
    if (item) locationData = toLocationData(item);
  } catch {
    // A strict no-match or an upstream failure may use the alternate OSM-backed
    // geocoder, but it must pass the exact same relevance and coordinate checks.
  }

  if (!locationData) locationData = await geocodeWithPhoton(query);
  if (!locationData) {
    throw new Error(`Could not confidently resolve "${query}". Try adding the city, sector, locality, or postal code; unrelated nearby points of interest are not accepted as substitutes.`);
  }

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
