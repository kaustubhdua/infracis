import { NextRequest, NextResponse } from "next/server";
import { compareLocations } from "@/lib/comparison";
import { geocodeLocation } from "@/lib/providers/nominatim";
import { fetchNearbyAmenities } from "@/lib/providers/overpass";
import { fetchWeatherAndElevation, fetchAirQuality } from "@/lib/providers/open-meteo";
import { assembleLocationReport } from "@/lib/evidence-engine";
import { LocationReport, PreferenceProfile } from "@/lib/types";
import { readJsonWithLimit } from "@/lib/request-body";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two geocodes and provider failover run concurrently; allow the bounded workflow to finish.
export const maxDuration = 40;

const MAX_QUERY_LENGTH = 180;
const validPreferences = new Set<PreferenceProfile>(["balanced", "family", "transit", "healthcare", "quiet"]);
async function getOrFetchReport(query: string): Promise<LocationReport> {
  const locationData = await geocodeLocation(query);
  const { latitude: lat, longitude: lon } = locationData;

  const [weatherRes, airQualityRes, amenitiesRes] = await Promise.allSettled([
    fetchWeatherAndElevation(lat, lon),
    fetchAirQuality(lat, lon),
    fetchNearbyAmenities(lat, lon, 1200)
  ]);

  return assembleLocationReport(
    query,
    locationData,
    weatherRes.status === "fulfilled" ? weatherRes.value : null,
    airQualityRes.status === "fulfilled" ? airQualityRes.value : null,
    amenitiesRes.status === "fulfilled" ? amenitiesRes.value : null,
    new Date().toISOString()
  );
}

export async function POST(request: NextRequest) {
  // x-real-ip is set by the hosting proxy. Do not trust client-controlled
  // X-Forwarded-For. Production requires the shared Redis limiter.
  const clientIp = request.headers.get("x-real-ip")?.trim() || "unknown-client";
  const rateLimit = await enforceRateLimit(`compare:${clientIp}`, 8);
  if (!rateLimit) {
    return NextResponse.json(
      { error: "Comparison service is temporarily unavailable because shared rate limiting is not configured or reachable." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many comparison requests. Please wait a minute before trying again." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    );
  }

  const parsedBody = await readJsonWithLimit(request, 16 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  }
  const body = parsedBody.value;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const input = body as { queryA?: unknown; queryB?: unknown; preference?: unknown };
  const queryA = typeof input.queryA === "string" ? input.queryA.trim() : "";
  const queryB = typeof input.queryB === "string" ? input.queryB.trim() : "";
  if (input.preference !== undefined &&
      (typeof input.preference !== "string" || !validPreferences.has(input.preference as PreferenceProfile))) {
    return NextResponse.json(
      { error: "Preference must be one of balanced, family, transit, healthcare, or quiet." },
      { status: 400 }
    );
  }
  const preference: PreferenceProfile = input.preference === undefined
    ? "balanced"
    : input.preference as PreferenceProfile;

  if (!queryA || !queryB) {
    return NextResponse.json(
      { error: "Provide both Location A and Location B to compare." },
      { status: 400 }
    );
  }

  if (queryA.length > MAX_QUERY_LENGTH || queryB.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Each location query must be ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  try {
    const [reportA, reportB] = await Promise.all([
      getOrFetchReport(queryA),
      getOrFetchReport(queryB)
    ]);

    const comparison = compareLocations(reportA, reportB, preference);
    return NextResponse.json(comparison, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const isNotFound = message.includes("No matching location");
    return NextResponse.json(
      { error: isNotFound ? message : "Comparison data could not be retrieved. Please retry shortly." },
      { status: isNotFound ? 404 : 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
