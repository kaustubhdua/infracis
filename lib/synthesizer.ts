import {
  LocationData,
  WeatherData,
  AirQualityData,
  AmenitiesSummary,
  EvidenceRecord,
  EvidenceClassification
} from "./types";

export interface GroundedFinding {
  id: string;
  headline: string;
  explanation: string;
  classification: EvidenceClassification;
  supportingEvidenceIds: string[];
  riskLevel?: "neutral" | "favorable" | "caution";
}

/**
 * Generates transparent, evidence-grounded findings.
 * Does not manufacture claims. Every statement links to verified evidence IDs.
 */
export function generateGroundedFindings(
  location: LocationData,
  weather: WeatherData | null,
  airQuality: AirQualityData | null,
  amenities: AmenitiesSummary | null,
  evidence: EvidenceRecord[]
): GroundedFinding[] {
  const findings: GroundedFinding[] = [];
  const evidenceMap = new Map(evidence.map((e) => [e.id, e]));

  // 1. Transit Finding
  if (amenities?.nearest.transit) {
    const transit = amenities.nearest.transit;
    const isClose = transit.distanceMeters <= 500;
    findings.push({
      id: "fnd-transit",
      headline: isClose
        ? `High Pedestrian Transit Proximity (~${transit.distanceMeters}m)`
        : `Moderate Transit Proximity (~${transit.distanceMeters}m)`,
      explanation: `The closest mapped public transit stop is "${transit.name}" located approximately ${transit.distanceMeters} meters straight-line from this coordinate. Verified via OpenStreetMap records.`,
      classification: "calculated",
      supportingEvidenceIds: ["ev-transit-nearest", "ev-geo-01"].filter((id) =>
        evidenceMap.has(id)
      ),
      riskLevel: isClose ? "favorable" : "neutral"
    });
  } else if (amenities) {
    // A valid provider response with no mapped transit is different from an outage.
    findings.push({
      id: "fnd-transit-gap",
      headline: "Public Transit Access Unverified in Open Feeds",
      explanation:
        "No public transit stops, metro stations, or railway terminals were found within a 1.2 km radius in OpenStreetMap. Physical on-ground verification of local shared autos or private shuttles is recommended.",
      classification: "model_interpretation",
      supportingEvidenceIds: ["ev-amenity-total"].filter((id) => evidenceMap.has(id)),
      riskLevel: "caution"
    });
  }

  // 2. Healthcare & Emergency Services
  if (amenities?.nearest.healthcare) {
    const health = amenities.nearest.healthcare;
    findings.push({
      id: "fnd-healthcare",
      headline: `Medical Emergency Proximity: ${health.name} (~${health.distanceMeters}m)`,
      explanation: `Healthcare facility "${health.name}" (${health.category.replace(/_/g, " ")}) is within ${health.distanceMeters}m straight-line. Emergency transit times will depend on lane congestion during peak hours.`,
      classification: "calculated",
      supportingEvidenceIds: ["ev-health-nearest"].filter((id) => evidenceMap.has(id)),
      riskLevel: health.distanceMeters <= 1000 ? "favorable" : "neutral"
    });
  }

  // 3. Air Quality Context
  if (airQuality && airQuality.europeanAqi !== null) {
    const aqi = airQuality.europeanAqi;
    const isUnhealthy = aqi > 50;
    findings.push({
      id: "fnd-air-quality",
      headline: `Atmospheric Air Quality: ${airQuality.aqiLabel}`,
      explanation: `Copernicus atmospheric reanalysis models report European AQI of ${aqi} (PM2.5: ${airQuality.pm25 ?? "N/A"} µg/m³). Note that regional models do not reflect hyper-local pollution from diesel power generators or immediate arterial road exhaust.`,
      classification: "observed",
      supportingEvidenceIds: ["ev-aqi-eu", "ev-aqi-pm25"].filter((id) => evidenceMap.has(id)),
      riskLevel: isUnhealthy ? "caution" : "favorable"
    });
  }

  // 4. Daily Convenience & Essentials
  if (amenities?.nearest.essentials) {
    const essentials = amenities.nearest.essentials;
    findings.push({
      id: "fnd-essentials",
      headline: `Daily Essentials: ${essentials.name} (~${essentials.distanceMeters}m)`,
      explanation: `Essential retail (${essentials.category.replace(/_/g, " ")}) is accessible within ${essentials.distanceMeters}m straight-line, supporting quick daily grocery trips.`,
      classification: "calculated",
      supportingEvidenceIds: ["ev-essentials-nearest"].filter((id) => evidenceMap.has(id)),
      riskLevel: "favorable"
    });
  }

  // 5. Elevation & Topographic Context
  if (weather && weather.elevationMeters !== null) {
    findings.push({
      id: "fnd-topography",
      headline: `Terrain Elevation: ${weather.elevationMeters}m Above Sea Level`,
      explanation: `Copernicus DEM topography records ground elevation of ~${weather.elevationMeters}m. Check if the access road sits lower than connecting arterial roads to determine stormwater ponding risk during heavy rainfall.`,
      classification: "observed",
      supportingEvidenceIds: ["ev-topography-elevation"].filter((id) => evidenceMap.has(id)),
      riskLevel: "neutral"
    });
  }

  return findings;
}
