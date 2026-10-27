import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistance,
  categorizeAmenity,
  calculateProximityScore,
  calculateDataCompleteness,
  interpretEuropeanAqi,
  interpretWeatherCode
} from "../lib/geo";

describe("Geospatial & Calculation Utilities", () => {
  it("calculates accurate great-circle distance via Haversine", () => {
    // Distance between Connaught Place (28.6315, 77.2167) and India Gate (28.6129, 77.2295) in Delhi is ~2.4km
    const dist = calculateHaversineDistance(28.6315, 77.2167, 28.6129, 77.2295);
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(2600);
  });

  it("returns 0 for identical coordinates", () => {
    const dist = calculateHaversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
    expect(dist).toBe(0);
  });

  it("categorizes OpenStreetMap amenities correctly into standard groups", () => {
    expect(categorizeAmenity("bus_station")).toBe("transit");
    expect(categorizeAmenity("subway_entrance")).toBe("transit");
    expect(categorizeAmenity("hospital")).toBe("healthcare");
    expect(categorizeAmenity("clinic")).toBe("healthcare");
    expect(categorizeAmenity("school")).toBe("education");
    expect(categorizeAmenity("supermarket")).toBe("essentials");
    expect(categorizeAmenity("park")).toBe("civic");
    expect(categorizeAmenity("unknown_custom_tag")).toBe("other");
  });

  it("computes proximity score with step decay and preserves missing values", () => {
    // Within ideal distance (<= 500m) should score 100
    expect(calculateProximityScore(300, 500, 2000)).toBe(100);

    // Beyond max acceptable (>= 2000m) should score 0
    expect(calculateProximityScore(2500, 500, 2000)).toBe(0);

    // Halfway between 500m and 2000m (1250m) should score 50
    expect(calculateProximityScore(1250, 500, 2000)).toBe(50);

    // Missing value must return null, never 0
    expect(calculateProximityScore(undefined)).toBeNull();
    expect(calculateProximityScore(null)).toBeNull();
  });

  it("computes data completeness score correctly", () => {
    const full = calculateDataCompleteness({
      hasCoordinates: true,
      hasWeather: true,
      hasAirQuality: true,
      hasAmenities: true,
      hasElevation: true
    });
    expect(full).toBe(100);

    const partial = calculateDataCompleteness({
      hasCoordinates: true,
      hasWeather: true,
      hasAirQuality: false,
      hasAmenities: true,
      hasElevation: false
    });
    expect(partial).toBe(60);
  });

  it("interprets European AQI correctly", () => {
    expect(interpretEuropeanAqi(15).severity).toBe("good");
    expect(interpretEuropeanAqi(35).severity).toBe("fair");
    expect(interpretEuropeanAqi(55).severity).toBe("moderate");
    expect(interpretEuropeanAqi(75).severity).toBe("poor");
    expect(interpretEuropeanAqi(95).severity).toBe("very_poor");
    expect(interpretEuropeanAqi(null).severity).toBe("unknown");
  });

  it("interprets WMO weather codes into human-readable descriptions", () => {
    expect(interpretWeatherCode(0)).toBe("Clear sky");
    expect(interpretWeatherCode(61)).toBe("Rain: slight to heavy");
    expect(interpretWeatherCode(95)).toBe("Thunderstorm: slight or moderate");
    expect(interpretWeatherCode(null)).toBe("Weather condition unknown");
  });
});
