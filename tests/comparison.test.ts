import { describe, it, expect } from "vitest";
import { compareLocations } from "../lib/comparison";
import { assembleLocationReport } from "../lib/evidence-engine";
import { LocationData, WeatherData, AirQualityData, AmenitiesSummary } from "../lib/types";

describe("Location Comparison Engine", () => {
  const locA: LocationData = {
    label: "Indiranagar, Bengaluru",
    latitude: 12.9784,
    longitude: 77.6408,
    mapUrl: "https://osm.org"
  };

  const locB: LocationData = {
    label: "Whitefield, Bengaluru",
    latitude: 12.9698,
    longitude: 77.7500,
    mapUrl: "https://osm.org"
  };

  const weatherA: WeatherData = {
    temperature: 25,
    humidity: 60,
    precipitation: 0,
    windSpeed: 10,
    weatherCode: 1,
    weatherDescription: "Mainly clear",
    observedTime: "2026-10-28T00:00:00Z",
    elevationMeters: 914,
    units: {}
  };

  const weatherB: WeatherData = {
    temperature: 26,
    humidity: 55,
    precipitation: 0,
    windSpeed: 11,
    weatherCode: 1,
    weatherDescription: "Mainly clear",
    observedTime: "2026-10-28T00:00:00Z",
    elevationMeters: 890,
    units: {}
  };

  const airA: AirQualityData = {
    europeanAqi: 35,
    aqiLabel: "Fair (20-40)",
    pm25: 22,
    pm10: 45,
    nitrogenDioxide: 15,
    ozone: 30,
    observedTime: "2026-10-28T00:00:00Z",
    units: {}
  };

  const airB: AirQualityData = {
    europeanAqi: 65,
    aqiLabel: "Poor (60-80)",
    pm25: 45,
    pm10: 85,
    nitrogenDioxide: 28,
    ozone: 40,
    observedTime: "2026-10-28T00:00:00Z",
    units: {}
  };

  const amenitiesA: AmenitiesSummary = {
    totalCount: 15,
    radiusMeters: 1200,
    byGroup: { transit: 3, education: 2, healthcare: 3, essentials: 6, civic: 1 },
    nearest: {
      transit: {
        id: "t1",
        name: "Metro Station A",
        category: "subway_entrance",
        group: "transit",
        distanceMeters: 300,
        lat: 12.97,
        lon: 77.64
      },
      healthcare: {
        id: "h1",
        name: "Hospital A",
        category: "hospital",
        group: "healthcare",
        distanceMeters: 500,
        lat: 12.97,
        lon: 77.64
      }
    },
    items: []
  };

  const amenitiesB: AmenitiesSummary = {
    totalCount: 8,
    radiusMeters: 1200,
    byGroup: { transit: 1, education: 1, healthcare: 1, essentials: 3, civic: 2 },
    nearest: {
      transit: {
        id: "t2",
        name: "Bus Stop B",
        category: "bus_stop",
        group: "transit",
        distanceMeters: 900,
        lat: 12.96,
        lon: 77.75
      },
      healthcare: {
        id: "h2",
        name: "Clinic B",
        category: "clinic",
        group: "healthcare",
        distanceMeters: 1200,
        lat: 12.96,
        lon: 77.75
      }
    },
    items: []
  };

  const reportA = assembleLocationReport("Indiranagar", locA, weatherA, airA, amenitiesA, "2026-10-28T01:00:00Z");
  const reportB = assembleLocationReport("Whitefield", locB, weatherB, airB, amenitiesB, "2026-10-28T01:00:00Z");

  it("calculates transit delta and favors the closer transit stop", () => {
    const comp = compareLocations(reportA, reportB, "transit");
    const transitDelta = comp.deltas.find((d) => d.category === "Mobility");
    expect(transitDelta).toBeDefined();
    expect(transitDelta?.favoredSide).toBe("A"); // 300m vs 900m
    expect(transitDelta?.differenceSummary).toContain("closer to public transit");
  });

  it("favors the lower AQI location for air quality", () => {
    const comp = compareLocations(reportA, reportB, "balanced");
    const aqiDelta = comp.deltas.find((d) => d.category === "Environment");
    expect(aqiDelta).toBeDefined();
    expect(aqiDelta?.favoredSide).toBe("A"); // 35 vs 65 (lower is better)
  });

  it("does not compare capped amenity samples as complete proximity or retail data", () => {
    const cappedAmenities: AmenitiesSummary = {
      ...amenitiesA,
      resultLimitReached: true,
      nearest: {}
    };
    const cappedReport = assembleLocationReport("Dense locality", locA, weatherA, airA, cappedAmenities, "2026-10-28T01:00:00Z");
    const comp = compareLocations(cappedReport, reportB, "balanced");
    const transitDelta = comp.deltas.find((delta) => delta.category === "Mobility");
    const essentialsDelta = comp.deltas.find((delta) => delta.metric === "Mapped Daily Essentials Count (~1.2km)");

    expect(transitDelta?.favoredSide).toBe("incomparable");
    expect(transitDelta?.valueA).toBe("Sample capped; nearest transit unknown");
    expect(essentialsDelta?.favoredSide).toBe("incomparable");
    expect(essentialsDelta?.valueA).toBe("Capped sample");
  });

  it("correctly identifies incomparable metrics when a location has missing data", () => {
    const reportWithoutAmenities = assembleLocationReport("Rural", locA, weatherA, airA, null, "2026-10-28T01:00:00Z");
    const comp = compareLocations(reportWithoutAmenities, reportB, "balanced");
    const transitDelta = comp.deltas.find((d) => d.category === "Mobility");
    expect(transitDelta?.favoredSide).toBe("incomparable");
    expect(transitDelta?.incomparableReason).toBeDefined();
    expect(transitDelta?.valueA).toBe("Amenity provider unavailable");
    const essentialsDelta = comp.deltas.find((delta) => delta.metric === "Mapped Daily Essentials Count (~1.2km)");
    expect(essentialsDelta?.valueA).toBe("Unavailable");
    expect(essentialsDelta?.favoredSide).toBe("incomparable");

  });
  it("returns a profile-specific result from comparable evidence rather than generic advice", () => {
    const comp = compareLocations(reportA, reportB, "family");
    expect(comp.preferenceSummary).toContain("Family priorities result");
    expect(comp.preferenceSummary).toContain("Location A is better supported");
    expect(comp.preferenceSummary).toContain("A: 2, B: 0");
    expect(comp.preferenceSummary).toContain("could not be compared");
  });

  it("does not invent a quietness winner when ambient noise is not measured", () => {
    const comp = compareLocations(reportA, reportB, "quiet");
    expect(comp.preferenceSummary).toContain("No defensible quietness winner");
    expect(comp.preferenceSummary).toContain("do not measure ambient noise");
    expect(comp.preferenceSummary).toContain("not a substitute for noise measurements");
  });

});
