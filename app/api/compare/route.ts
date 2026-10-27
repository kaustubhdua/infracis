import { NextRequest, NextResponse } from "next/server";
import { compareLocations } from "@/lib/comparison";
import { geocodeLocation } from "@/lib/providers/nominatim";
import { fetchNearbyAmenities } from "@/lib/providers/overpass";
import { fetchWeatherAndElevation, fetchAirQuality } from "@/lib/providers/open-meteo";
import { assembleLocationReport } from "@/lib/evidence-engine";
import { LocationReport, PreferenceProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  try {
    const body = await request.json();
    const queryA = typeof body?.queryA === "string" ? body.queryA.trim() : "";
    const queryB = typeof body?.queryB === "string" ? body.queryB.trim() : "";
    const preference = (body?.preference || "balanced") as PreferenceProfile;

    if (!queryA || !queryB) {
      return NextResponse.json(
        { error: "Provide both Location A and Location B to compare." },
        { status: 400 }
      );
    }

    const [reportA, reportB] = await Promise.all([
      getOrFetchReport(queryA),
      getOrFetchReport(queryB)
    ]);

    const comparison = compareLocations(reportA, reportB, preference);
    return NextResponse.json(comparison);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Comparison failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
