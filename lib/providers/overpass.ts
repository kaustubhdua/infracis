import { calculateHaversineDistance, categorizeAmenity } from "../geo";
import { AmenityItem, AmenitiesSummary } from "../types";

const cache = new Map<string, { expires: number; value: AmenitiesSummary }>();

export async function fetchNearbyAmenities(
  lat: number,
  lon: number,
  radiusMeters = 1200
): Promise<AmenitiesSummary> {
  const cacheKey = `amenities:${lat.toFixed(4)}:${lon.toFixed(4)}:${radiusMeters}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Bounded query for essential due-diligence categories
  const query = `[out:json][timeout:10];
(
  node(around:${radiusMeters},${lat},${lon})[amenity~"^(school|kindergarten|college|university|hospital|clinic|pharmacy|bank|atm|marketplace|supermarket|bus_station|police|fire_station|library|place_of_worship)$"];
  way(around:${radiusMeters},${lat},${lon})[amenity~"^(school|kindergarten|college|university|hospital|clinic|pharmacy|bank|atm|marketplace|supermarket|bus_station|police|fire_station|library|place_of_worship)$"];
  node(around:${radiusMeters},${lat},${lon})[highway~"^(bus_stop)$"];
  node(around:${radiusMeters},${lat},${lon})[railway~"^(station|subway_entrance|tram_stop)$"];
  node(around:${radiusMeters},${lat},${lon})[leisure~"^(park|playground)$"];
  way(around:${radiusMeters},${lat},${lon})[leisure~"^(park|playground)$"];
);
out center tags 100;`;

  const body = new URLSearchParams({ data: query });
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "InfracisLocationDueDiligence/1.0"
    },
    body,
    signal: AbortSignal.timeout(11000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Overpass amenity service responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    elements?: Array<{
      id: number;
      type: string;
      tags?: Record<string, string>;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
    }>;
  };

  const elements = Array.isArray(data.elements) ? data.elements : [];

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

      const distance =
        itemLat !== null && itemLon !== null
          ? calculateHaversineDistance(lat, lon, itemLat, itemLon)
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
        lat: itemLat,
        lon: itemLon
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const byGroup = {
    transit: items.filter((i) => i.group === "transit").length,
    education: items.filter((i) => i.group === "education").length,
    healthcare: items.filter((i) => i.group === "healthcare").length,
    essentials: items.filter((i) => i.group === "essentials").length,
    civic: items.filter((i) => i.group === "civic").length
  };

  const nearest = {
    transit: items.find((i) => i.group === "transit"),
    education: items.find((i) => i.group === "education"),
    healthcare: items.find((i) => i.group === "healthcare"),
    essentials: items.find((i) => i.group === "essentials"),
    civic: items.find((i) => i.group === "civic")
  };

  const summary: AmenitiesSummary = {
    totalCount: items.length,
    radiusMeters,
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

  return summary;
}
