import { NextRequest, NextResponse } from "next/server";
import { geocodeLocation } from "@/lib/providers/nominatim";
import { fetchNearbyAmenities } from "@/lib/providers/overpass";
import { fetchWeatherAndElevation, fetchAirQuality } from "@/lib/providers/open-meteo";
import { assembleLocationReport } from "@/lib/evidence-engine";
import { LocationData, LocationReport } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memoryCache = new Map<string, { expires: number; value: LocationReport }>();
const ipWindows = new Map<string, { startedAt: number; count: number }>();
const MAX_QUERY_LENGTH = 180;
const MAX_TRACKED_CLIENTS = 10_000;

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const win = ipWindows.get(clientIp);
  if (!win || now - win.startedAt >= 60_000) {
    // Bound the map so spoofed/rotating addresses cannot grow it without limit.
    if (!win && ipWindows.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = ipWindows.keys().next().value;
      if (oldestKey) ipWindows.delete(oldestKey);
    }
    ipWindows.set(clientIp, { startedAt: now, count: 1 });
    return false;
  }
  win.count += 1;
  return win.count > 15; // Best-effort per-process guard, not a shared production limiter.
}

export async function POST(request: NextRequest) {
  // On hosted platforms these headers are set by the platform proxy. This is
  // only best-effort protection; production traffic needs a trusted shared limiter.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwarded || request.headers.get("x-real-ip") || "unknown-client";

  if (checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Too many search requests. Please wait a minute before requesting another analysis." },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  let query = "";
  let manualLat: number | null = null;
  let manualLon: number | null = null;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }
    const input = body as { query?: unknown; lat?: unknown; lon?: unknown };
    if (typeof input.query === "string") query = input.query.trim();
    if (typeof input.lat === "number" && typeof input.lon === "number") {
      manualLat = input.lat;
      manualLon = input.lon;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body. Provide a query string or coordinates." },
      { status: 400 }
    );
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

  const cacheKey = hasCoordinates
    ? `coord:${manualLat!.toFixed(5)}:${manualLon!.toFixed(5)}`
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
      locationData = {
        label: query || `Coordinates ${manualLat!.toFixed(5)}, ${manualLon!.toFixed(5)}`,
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
