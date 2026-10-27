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

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const win = ipWindows.get(clientIp);
  if (!win || now - win.startedAt >= 60_000) {
    ipWindows.set(clientIp, { startedAt: now, count: 1 });
    return false;
  }
  win.count += 1;
  return win.count > 15; // 15 requests per minute
}

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwarded || request.headers.get("x-real-ip") || "unknown-client";

  if (checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Too many search requests. Please wait a minute before requesting another analysis." },
      { status: 429 }
    );
  }

  let query = "";
  let manualLat: number | null = null;
  let manualLon: number | null = null;

  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
    if (typeof body?.lat === "number" && typeof body?.lon === "number") {
      manualLat = body.lat;
      manualLon = body.lon;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body. Provide a query string or coordinates." },
      { status: 400 }
    );
  }

  if (!query && (manualLat === null || manualLon === null)) {
    return NextResponse.json(
      { error: "Enter a location address or pick a point on the map." },
      { status: 400 }
    );
  }

  const cacheKey = manualLat !== null && manualLon !== null
    ? `coord:${manualLat.toFixed(5)}:${manualLon.toFixed(5)}`
    : `query:${query.toLowerCase()}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.value, {
      headers: { "X-Infracis-Cache": "HIT" }
    });
  }

  try {
    let locationData: LocationData;

    if (manualLat !== null && manualLon !== null) {
      locationData = {
        label: query || `Coordinates ${manualLat.toFixed(5)}, ${manualLon.toFixed(5)}`,
        latitude: manualLat,
        longitude: manualLon,
        mapUrl: `https://www.openstreetmap.org/?mlat=${manualLat}&mlon=${manualLon}#map=16/${manualLat}/${manualLon}`
      };
    } else {
      locationData = await geocodeLocation(query);
    }

    const { latitude: lat, longitude: lon } = locationData;

    // Fetch upstream services concurrently; handle partial failures gracefully without fabricating data
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

    memoryCache.set(cacheKey, {
      expires: Date.now() + 15 * 60 * 1000, // 15 mins cache
      value: report
    });

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "public, s-maxage=300",
        "X-Infracis-Cache": "MISS"
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Location investigation failed.";
    const status = msg.includes("No matching location") ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
