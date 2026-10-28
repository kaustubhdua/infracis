import { NextRequest, NextResponse } from "next/server";
import { compareLocations } from "@/lib/comparison";
import { geocodeLocation } from "@/lib/providers/nominatim";
import { fetchNearbyAmenities } from "@/lib/providers/overpass";
import { fetchWeatherAndElevation, fetchAirQuality } from "@/lib/providers/open-meteo";
import { assembleLocationReport } from "@/lib/evidence-engine";
import { LocationReport, PreferenceProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 180;
const validPreferences = new Set<PreferenceProfile>(["balanced", "family", "transit", "healthcare", "quiet"]);
const ipWindows = new Map<string, { startedAt: number; count: number }>();

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const win = ipWindows.get(clientIp);
  if (!win || now - win.startedAt >= 60_000) {
    if (!win && ipWindows.size >= 10_000) {
      const oldestKey = ipWindows.keys().next().value;
      if (oldestKey) ipWindows.delete(oldestKey);
    }
    ipWindows.set(clientIp, { startedAt: now, count: 1 });
    return false;
  }
  win.count += 1;
  return win.count > 8;
}

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
  // Best-effort per-process protection only. Production traffic still needs a
  // trusted shared limiter; proxy headers must be set by the hosting platform.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = request.headers.get("x-real-ip") || forwarded || "unknown-client";
  if (checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Too many comparison requests. Please wait a minute before trying again." },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const input = body as { queryA?: unknown; queryB?: unknown; preference?: unknown };
  const queryA = typeof input.queryA === "string" ? input.queryA.trim() : "";
  const queryB = typeof input.queryB === "string" ? input.queryB.trim() : "";
  const preference = typeof input.preference === "string" && validPreferences.has(input.preference as PreferenceProfile)
    ? input.preference as PreferenceProfile
    : "balanced";

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
