/**
 * Calculates great-circle distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Maps raw OpenStreetMap amenity/transit tags to our 5 standardized due-diligence groups.
 */
export function categorizeAmenity(tag: string): "transit" | "education" | "healthcare" | "essentials" | "civic" | "other" {
  const normalized = tag.toLowerCase().trim();

  if (
    [
      "bus_station",
      "bus_stop",
      "subway_entrance",
      "train_station",
      "railway_station",
      "ferry_terminal",
      "tram_stop"
    ].includes(normalized)
  ) {
    return "transit";
  }

  if (
    [
      "school",
      "kindergarten",
      "college",
      "university",
      "childcare",
      "music_school"
    ].includes(normalized)
  ) {
    return "education";
  }

  if (
    [
      "hospital",
      "clinic",
      "pharmacy",
      "doctors",
      "dentist",
      "health_centre",
      "veterinary"
    ].includes(normalized)
  ) {
    return "healthcare";
  }

  if (
    [
      "supermarket",
      "marketplace",
      "grocery",
      "convenience",
      "bakery",
      "bank",
      "atm",
      "post_office"
    ].includes(normalized)
  ) {
    return "essentials";
  }

  if (
    [
      "park",
      "police",
      "fire_station",
      "library",
      "community_centre",
      "place_of_worship",
      "townhall"
    ].includes(normalized)
  ) {
    return "civic";
  }

  return "other";
}

/**
 * Calculates a step-function proximity score (0-100) based on distance to nearest facility.
 * Distances beyond the threshold scale down to 0. Missing facility yields null (not 0).
 */
export function calculateProximityScore(
  nearestDistanceMeters: number | undefined | null,
  idealMeters = 500,
  maxAcceptableMeters = 2000
): number | null {
  if (nearestDistanceMeters === undefined || nearestDistanceMeters === null) {
    return null; // Missing data remains missing!
  }

  if (nearestDistanceMeters <= idealMeters) {
    return 100;
  }

  if (nearestDistanceMeters >= maxAcceptableMeters) {
    return 0;
  }

  // Linear decay between ideal and max acceptable distance
  const ratio = (maxAcceptableMeters - nearestDistanceMeters) / (maxAcceptableMeters - idealMeters);
  return Math.round(ratio * 100);
}

/**
 * Computes completeness index: percentage of expected location dimensions that
 * returned verified data (Weather, Air Quality, Transit, Healthcare, Education, Essentials, Elevation).
 */
export function calculateDataCompleteness(dimensionsChecked: {
  hasCoordinates: boolean;
  hasWeather: boolean;
  hasAirQuality: boolean;
  hasAmenities: boolean;
  hasElevation: boolean;
}): number {
  const items = [
    dimensionsChecked.hasCoordinates,
    dimensionsChecked.hasWeather,
    dimensionsChecked.hasAirQuality,
    dimensionsChecked.hasAmenities,
    dimensionsChecked.hasElevation
  ];

  const available = items.filter(Boolean).length;
  return Math.round((available / items.length) * 100);
}

/**
 * Translates WMO weather interpretation code into plain English description.
 */
export function interpretWeatherCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return "Weather condition unknown";
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog and depositing rime fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle: light to dense";
    case 61:
    case 63:
    case 65:
      return "Rain: slight to heavy";
    case 71:
    case 73:
    case 75:
      return "Snowfall: slight to heavy";
    case 80:
    case 81:
    case 82:
      return "Rain showers: slight to violent";
    case 95:
      return "Thunderstorm: slight or moderate";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return `Observed weather code (${code})`;
  }
}

/**
 * Categorizes European Air Quality Index (1-5 scale) according to EEA standards.
 */
export function interpretEuropeanAqi(aqi: number | null | undefined): { label: string; severity: "good" | "fair" | "moderate" | "poor" | "very_poor" | "unknown" } {
  if (aqi === null || aqi === undefined) {
    return { label: "Unmonitored / Unavailable", severity: "unknown" };
  }
  if (aqi <= 20) return { label: "Good (1-20)", severity: "good" };
  if (aqi <= 40) return { label: "Fair (20-40)", severity: "fair" };
  if (aqi <= 60) return { label: "Moderate (40-60)", severity: "moderate" };
  if (aqi <= 80) return { label: "Poor (60-80)", severity: "poor" };
  return { label: "Very Poor (>80)", severity: "very_poor" };
}
