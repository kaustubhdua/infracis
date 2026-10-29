import { NextRequest, NextResponse } from "next/server";
import { geocodeLocation, reverseGeocodeLabel } from "@/lib/providers/nominatim";
import { fetchNearbyAmenities } from "@/lib/providers/overpass";
import { fetchWeatherAndElevation, fetchAirQuality } from "@/lib/providers/open-meteo";
import { assembleLocationReport } from "@/lib/evidence-engine";
import { LocationData, LocationReport } from "@/lib/types";
import { readJsonWithLimit } from "@/lib/request-body";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memoryCache = new Map<string, { expires: number; value: LocationReport }>();
const MAX_QUERY_LENGTH = 180;
export async function POST(request: NextRequest) {
  // x-real-ip is set by the hosting proxy. Do not trust the client-controlled
  // leftmost X-Forwarded-For value. Production requires the shared Redis limiter.
  const clientIp = request.headers.get("x-real-ip")?.trim() || "unknown-client";
  const rateLimit = await enforceRateLimit(`analyze:${clientIp}`, 15);
  if (!rateLimit) {
    return NextResponse.json(
      { error: "Search service is temporarily unavailable because shared rate limiting is not configured or reachable." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many search requests. Please wait a minute before requesting another analysis." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    );
  }

  let query = "";
  let manualLat: number | null = null;
  let manualLon: number | null = null;

  const parsedBody = await readJsonWithLimit(request, 16 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  }
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const input = body as { query?: unknown; lat?: unknown; lon?: unknown; reverseGeocode?: unknown };
  if (typeof input.query === "string") query = input.query.trim();
  if (typeof input.lat === "number" && typeof input.lon === "number") {
    manualLat = input.lat;
    manualLon = input.lon;
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Location query must be ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const hasCoordinates = manualLat !== null && manualLon !== null;
  if (!query && !hasCoordinates) {
    return NextResponse.json(
      { error: "Enter a location address or pick a point on the map." },
      { status: 400 }
    );
  }

  if (hasCoordinates && (
    !Number.isFinite(manualLat) || !Number.isFinite(manualLon) ||
    manualLat! < -90 || manualLat! > 90 || manualLon! < -180 || manualLon! > 180
  )) {
    return NextResponse.json(
      { error: "Coordinates must be finite numbers within latitude -90..90 and longitude -180..180." },
      { status: 400 }
    );
  }

  // A user-supplied label is part of a manual-coordinate report. Include it in
  // the report cache key so the same pin cannot inherit another label.
  const cacheKey = hasCoordinates
    ? `coord:${manualLat!.toFixed(5)}:${manualLon!.toFixed(5)}:${query.toLowerCase()}`
    : `query:${query.toLowerCase()}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.value, {
      headers: { "Cache-Control": "no-store", "X-Infracis-Cache": "HIT" }
    });
  }

  try {
    let locationData: LocationData;

    if (hasCoordinates) {
      let label = query || `Coordinates ${manualLat!.toFixed(5)}, ${manualLon!.toFixed(5)}`;
      // Reverse-geocode only when the client explicitly requests a locality label,
      // rather than on every map click, to respect Nominatim's global rate policy.
      if (input.reverseGeocode === true) {
        const reverseLabel = await reverseGeocodeLabel(manualLat!, manualLon!);
        if (reverseLabel) label = reverseLabel;
      }
      locationData = {
        label,
        latitude: manualLat!,
        longitude: manualLon!,
        mapUrl: `https://www.openstreetmap.org/?mlat=${manualLat}&mlon=${manualLon}#map=16/${manualLat}/${manualLon}`
      };
    } else {
      locationData = await geocodeLocation(query);
    }

    const { latitude: lat, longitude: lon } = locationData;

    // Fetch upstream services concurrently; partial failures remain explicit unknowns.
    const [weatherRes, airQualityRes, amenitiesRes] = await Promise.allSettled([
      fetchWeatherAndElevation(lat, lon),
      fetchAirQuality(lat, lon),
      fetchNearbyAmenities(lat, lon, 1200)
    ]);

    const weather = weatherRes.status === "fulfilled" ? weatherRes.value : null;
    const airQuality = airQualityRes.status === "fulfilled" ? airQualityRes.value : null;
    const amenities = amenitiesRes.status === "fulfilled" ? amenitiesRes.value : null;

    const report = assembleLocationReport(
      query || locationData.label,
      locationData,
      weather,
      airQuality,
      amenities,
      new Date().toISOString()
    );

    if (!memoryCache.has(cacheKey) && memoryCache.size >= 1000) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey !== undefined) memoryCache.delete(oldestKey);
    }
    memoryCache.set(cacheKey, {
      expires: Date.now() + 15 * 60 * 1000,
      value: report
    });

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
        "X-Infracis-Cache": "MISS"
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Location investigation failed.";
    const status = msg.includes("No matching location") ? 404 : 502;
    return NextResponse.json(
      { error: status === 404 ? msg : "A location data provider failed. Please retry shortly." },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
