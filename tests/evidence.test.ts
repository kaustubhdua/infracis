import { describe, it, expect } from "vitest";
import { assembleLocationReport } from "../lib/evidence-engine";
import { LocationData, WeatherData, AirQualityData, AmenitiesSummary } from "../lib/types";

describe("Evidence Engine & Provenance Integrity", () => {
  const mockLocation: LocationData = {
    label: "Indiranagar, Bengaluru, Karnataka, India",
    latitude: 12.9784,
    longitude: 77.6408,
    mapUrl: "https://www.openstreetmap.org/?mlat=12.9784&mlon=77.6408#map=16/12.9784/77.6408"
  };

  const mockWeather: WeatherData = {
    temperature: 24.5,
    humidity: 65,
    precipitation: 0,
    windSpeed: 12.2,
    weatherCode: 1,
    weatherDescription: "Mainly clear",
    observedTime: "2026-10-28T00:00:00Z",
    elevationMeters: 914,
    units: { temperature_2m: "°C", precipitation: "mm" }
  };

  const mockAirQuality: AirQualityData = {
    europeanAqi: 42,
    aqiLabel: "Moderate (40-60)",
    pm25: 28.4,
    pm10: 52.1,
    nitrogenDioxide: 18.2,
    ozone: 34.0,
    observedTime: "2026-10-28T00:00:00Z",
    units: { pm2_5: "µg/m³" }
  };

  const mockAmenities: AmenitiesSummary = {
    totalCount: 14,
    radiusMeters: 1200,
    byGroup: {
      transit: 3,
      education: 2,
      healthcare: 4,
      essentials: 5,
      civic: 0
    },
    nearest: {
      transit: {
        id: "node-101",
        name: "Indiranagar Metro Station",
        category: "subway_entrance",
        group: "transit",
        distanceMeters: 380,
        lat: 12.9783,
        lon: 77.6412
      },
      healthcare: {
        id: "node-202",
        name: "Chinmaya Mission Hospital",
        category: "hospital",
        group: "healthcare",
        distanceMeters: 620,
        lat: 12.9771,
        lon: 77.6450
      },
      education: {
        id: "node-303",
        name: "National Public School",
        category: "school",
        group: "education",
        distanceMeters: 750,
        lat: 12.9760,
        lon: 77.6465
      },
      essentials: {
        id: "node-404",
        name: "Nature's Basket",
        category: "supermarket",
        group: "essentials",
        distanceMeters: 290,
        lat: 12.9790,
        lon: 77.6420
      }
    },
    items: []
  };

  it("assembles complete evidence records with verifiable IDs", () => {
    const report = assembleLocationReport(
      "Indiranagar",
      mockLocation,
      mockWeather,
      mockAirQuality,
      mockAmenities,
      "2026-10-28T01:00:00Z"
    );

    expect(report.id).toBeDefined();
    expect(report.evidence.length).toBeGreaterThanOrEqual(5);

    // Verify evidence record schema
    for (const ev of report.evidence) {
      expect(ev.id).toBeDefined();
      expect(ev.provider).toBeDefined();
      expect(ev.sourceUrl).toMatch(/^https?:\/\//);
      expect(ev.limitations).toBeDefined();
      expect(["observed", "provider_model", "calculated", "rule_based_interpretation", "unknown"]).toContain(
        ev.classification
      );
    }
  });

  it("records the actual geocoder used in source provenance", () => {
    const nominatimReport = assembleLocationReport("Indiranagar", mockLocation, null, null, null, "2026-10-28T01:00:00Z");
    const nominatimEvidence = nominatimReport.evidence.find((item) => item.id === "ev-geo-01");
    expect(nominatimEvidence?.provider).toBe("OpenStreetMap Nominatim");
    expect(nominatimEvidence?.sourceUrl).toBe("https://nominatim.openstreetmap.org/");

    const photonLocation = { ...mockLocation, geocodingProvider: "photon" as const };
    const photonReport = assembleLocationReport("Saket", photonLocation, null, null, null, "2026-10-28T01:00:00Z");
    const photonEvidence = photonReport.evidence.find((item) => item.id === "ev-geo-01");
    expect(photonEvidence?.provider).toBe("Photon (OpenStreetMap-backed geocoder)");
    expect(photonEvidence?.sourceUrl).toBe("https://photon.komoot.io/");
  });

  it("labels gridded weather and air-quality estimates as provider model output", () => {
    const report = assembleLocationReport("Indiranagar", mockLocation, mockWeather, mockAirQuality, mockAmenities, "2026-10-28T01:00:00Z");
    const modeled = report.evidence.filter((item) => item.category === "weather" || item.category === "air_quality" || item.category === "topography");
    expect(modeled.length).toBeGreaterThan(0);
    expect(modeled.every((item) => item.classification === "provider_model")).toBe(true);
  });

  it("labels air-quality and elevation findings as provider-model output", () => {
    const report = assembleLocationReport(
      "Indiranagar",
      mockLocation,
      mockWeather,
      mockAirQuality,
      mockAmenities,
      "2026-10-28T01:00:00Z"
    );
    expect(report.findings.find((finding) => finding.id === "fnd-air-quality")?.classification).toBe("provider_model");
    expect(report.findings.find((finding) => finding.id === "fnd-topography")?.classification).toBe("provider_model");
  });

  it("strictly validates that every finding references valid evidence IDs in the report", () => {
    const report = assembleLocationReport(
      "Indiranagar",
      mockLocation,
      mockWeather,
      mockAirQuality,
      mockAmenities,
      "2026-10-28T01:00:00Z"
    );

    const validIds = new Set(report.evidence.map((e) => e.id));

    for (const finding of report.findings) {
      expect(finding.supportingEvidenceIds.length).toBeGreaterThan(0);
      for (const id of finding.supportingEvidenceIds) {
        expect(validIds.has(id)).toBe(true);
      }
    }
  });

  it("does not treat a capped amenity sample as proof of nearest-facility absence", () => {
    const cappedAmenities: AmenitiesSummary = {
      ...mockAmenities,
      totalCount: 100,
      resultLimitReached: true,
      nearest: {},
      items: []
    };
    const report = assembleLocationReport(
      "Dense Urban Locality",
      mockLocation,
      null,
      null,
      cappedAmenities,
      "2026-10-28T01:00:00Z"
    );

    expect(report.scores.transitAccessibilityScore).toBeNull();
    expect(report.scores.healthcareAccessScore).toBeNull();
    expect(report.unknowns.some((item) => item.includes("100-element output cap"))).toBe(true);
    expect(report.findings.some((finding) => finding.headline.includes("Public Transit Access Unverified in Open Feeds"))).toBe(false);
    expect(report.evidence.find((item) => item.id === "ev-amenity-total")?.limitations).toContain("partial sample");

    const completeSampleReport = assembleLocationReport(
      "Dense Urban Locality",
      mockLocation,
      null,
      null,
      { ...mockAmenities, resultLimitReached: false },
      "2026-10-28T01:00:00Z"
    );
    expect(report.scores.completenessScore).toBeLessThan(completeSampleReport.scores.completenessScore);
  });

  it("reports explicit unknowns when optional data layers are null", () => {
    const reportWithoutAirOrAmenities = assembleLocationReport(
      "Remote Village",
      mockLocation,
      mockWeather,
      null, // Air quality unavailable
      null, // Amenities unavailable
      "2026-10-28T01:00:00Z"
    );

    expect(reportWithoutAirOrAmenities.scores.completenessScore).toBeLessThan(100);
    expect(reportWithoutAirOrAmenities.scores.transitAccessibilityScore).toBeNull();
    expect(reportWithoutAirOrAmenities.scores.healthcareAccessScore).toBeNull();
    expect(reportWithoutAirOrAmenities.scores.educationAccessScore).toBeNull();
    expect(reportWithoutAirOrAmenities.scores.dailyConvenienceScore).toBeNull();
    expect(reportWithoutAirOrAmenities.findings.some((finding) =>
      finding.headline.includes("Public Transit Access Unverified in Open Feeds")
    )).toBe(false);
    expect(
      reportWithoutAirOrAmenities.unknowns.some((u) => u.toLowerCase().includes("air quality"))
    ).toBe(true);
    expect(
      reportWithoutAirOrAmenities.unknowns.some((u) => u.toLowerCase().includes("amenity"))
    ).toBe(true);
  });
});
