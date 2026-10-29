import { calculateHaversineDistance, categorizeAmenity } from "../geo";
import { AmenityItem, AmenitiesSummary } from "../types";
import { getSharedJson, setSharedJson } from "../shared-provider-cache";

const cache = new Map<string, { expires: number; value: AmenitiesSummary }>();

export async function fetchNearbyAmenities(
  lat: number,
  lon: number,
  radiusMeters = 1200
): Promise<AmenitiesSummary> {
  const cacheKey = `amenities:${lat.toFixed(4)}:${lon.toFixed(4)}:${radiusMeters}`;
  const shared = await getSharedJson<AmenitiesSummary>(cacheKey);
  if (shared) return shared;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Bounded query for essential due-diligence categories
  // Use one union with nwr selectors to reduce query overhead on shared public infrastructure.
  const query = `[out:json][timeout:6];
(
  nwr(around:${radiusMeters},${lat},${lon})[amenity~"^(school|kindergarten|college|university|hospital|clinic|pharmacy|bank|atm|marketplace|supermarket|bus_station|police|fire_station|library|place_of_worship)$"];
  nwr(around:${radiusMeters},${lat},${lon})[highway="bus_stop"];
  nwr(around:${radiusMeters},${lat},${lon})[railway~"^(station|subway_entrance|tram_stop)$"];
  nwr(around:${radiusMeters},${lat},${lon})[leisure~"^(park|playground)$"];
);
out center tags 100;`;

  const body = new URLSearchParams({ data: query });
  const configuredList = process.env.OVERPASS_API_URLS?.trim();
  const configuredSingle = process.env.OVERPASS_API_URL?.trim();
  const configuredEndpoints = configuredList
    ? configuredList.split(/[;,]/).map((value) => value.trim()).filter(Boolean)
    : configuredSingle ? [configuredSingle] : [];
  if (configuredEndpoints.length > 3) {
    throw new Error("Configure at most three OVERPASS_API_URLS endpoints to keep provider retries bounded.");
  }
  // For evaluation and low-volume, non-commercial use, try a documented public
  // instance first and a second instance as bounded failover. Public instances
  // are best-effort and have no SLA; commercial/high-volume deployments must
  // configure an appropriately licensed, capacity-matched provider.
  const endpointValues = configuredEndpoints.length > 0
    ? configuredEndpoints
    : [
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
      ];
  const endpoints = endpointValues.map((value) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("OVERPASS_API_URL and OVERPASS_API_URLS must contain valid HTTPS URLs.");
    }
    if (parsed.protocol !== "https:") throw new Error("OVERPASS_API_URL and OVERPASS_API_URLS must use HTTPS.");
    return parsed.toString();
  });

  type OverpassElement = {
    id: number;
    type: string;
    tags?: Record<string, string>;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
  };
  let elementsFromProvider: OverpassElement[] | null = null;
  let lastProviderError = "Overpass providers are unavailable.";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "InfracisLocationDueDiligence/1.0 (https://github.com/kaustubhdua/infracis)"
        },
        body,
        signal: AbortSignal.timeout(7000),
        cache: "no-store"
      });
      if (!response.ok) {
        lastProviderError = `Overpass amenity service responded with HTTP ${response.status}`;
        // Do not immediately retry a rate-limited endpoint; honour its backoff.
        if (response.status === 429 || response.status === 406) break;
        continue;
      }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
          !Array.isArray((payload as { elements?: unknown }).elements)) {
        lastProviderError = "Overpass returned an invalid response shape.";
        continue;
      }
      elementsFromProvider = (payload as { elements: OverpassElement[] }).elements;
      break;
    } catch {
      lastProviderError = "Overpass amenity service timed out or could not be reached.";
    }
  }
  if (!elementsFromProvider) throw new Error(lastProviderError);
  const data = { elements: elementsFromProvider };

  // Overpass output is capped at 100 elements. Reaching the cap means the result is a sample,
  // so do not present category counts or a sampled feature as a verified nearest facility.
  const resultLimitReached = (data.elements ?? []).length >= 100;
  const elements = (data.elements ?? []).filter((elem) =>
    elem && typeof elem === "object" && Number.isInteger(elem.id) &&
    (elem.type === "node" || elem.type === "way" || elem.type === "relation") &&
    (elem.tags === undefined || (typeof elem.tags === "object" && elem.tags !== null && !Array.isArray(elem.tags)))
  );

  const items: AmenityItem[] = elements
    .map((elem) => {
      const itemLat = elem.lat ?? elem.center?.lat ?? null;
      const itemLon = elem.lon ?? elem.center?.lon ?? null;

      const tagVal =
        elem.tags?.amenity ||
        elem.tags?.railway ||
        elem.tags?.highway ||
        elem.tags?.leisure ||
        "amenity";

      const group = categorizeAmenity(tagVal);

      const validCoordinates = itemLat !== null && itemLon !== null && Number.isFinite(itemLat) && Number.isFinite(itemLon) && itemLat >= -90 && itemLat <= 90 && itemLon >= -180 && itemLon <= 180;
      const safeLat = validCoordinates ? itemLat : null;
      const safeLon = validCoordinates ? itemLon : null;
      const distance = validCoordinates
          ? calculateHaversineDistance(lat, lon, safeLat!, safeLon!)
          : radiusMeters;

      const name =
        elem.tags?.name ||
        elem.tags?.["name:en"] ||
        elem.tags?.brand ||
        `Mapped ${tagVal.replace(/_/g, " ")}`;

      return {
        id: `${elem.type}-${elem.id}`,
        name,
        category: tagVal,
        group,
        distanceMeters: distance,
        lat: safeLat,
        lon: safeLon
      };
    })
    // A record without a valid point/center cannot support a proximity claim.
    // Do not assign it an invented distance or let it become the "nearest" result.
    .filter((item) => item.lat !== null && item.lon !== null && item.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const byGroup = {
    transit: items.filter((i) => i.group === "transit").length,
    education: items.filter((i) => i.group === "education").length,
    healthcare: items.filter((i) => i.group === "healthcare").length,
    essentials: items.filter((i) => i.group === "essentials").length,
    civic: items.filter((i) => i.group === "civic").length
  };

  const nearest = resultLimitReached ? {} : {
    transit: items.find((i) => i.group === "transit"),
    education: items.find((i) => i.group === "education"),
    healthcare: items.find((i) => i.group === "healthcare"),
    essentials: items.find((i) => i.group === "essentials"),
    civic: items.find((i) => i.group === "civic")
  };

  const summary: AmenitiesSummary = {
    totalCount: items.length,
    radiusMeters,
    resultLimitReached,
    byGroup,
    nearest,
    items: items.slice(0, 35) // keep top 35 closest
  };

  if (!cache.has(cacheKey) && cache.size >= 1000) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, {
    expires: Date.now() + 60 * 60 * 1000, // 1 hour cache
    value: summary
  });
  await setSharedJson(cacheKey, summary, 60 * 60);

  return summary;
}
