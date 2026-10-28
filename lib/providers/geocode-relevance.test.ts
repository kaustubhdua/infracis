import { describe, expect, it } from "vitest";
import { rankGeocodeCandidates, selectRelevantGeocodeCandidate, type GeocodeCandidate } from "./geocode-relevance";

const candidate = (display_name: string): GeocodeCandidate => ({
  display_name,
  lat: "28.61",
  lon: "77.23"
});

describe("geocoder relevance guard", () => {
  it("prefers a candidate that covers the requested locality and city", () => {
    const results = [
      candidate("Mall Road, New Delhi, Delhi, India"),
      candidate("Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh, India")
    ];
    expect(selectRelevantGeocodeCandidate("Sector 62, Noida", results)?.display_name)
      .toBe("Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh, India");
  });

  it("rejects a nearby POI when important query terms are missing", () => {
    const results = [
      candidate("Sector 62 Metro Station, Noida, Uttar Pradesh, India"),
      candidate("Noida, Gautam Buddha Nagar, Uttar Pradesh, India")
    ];
    expect(selectRelevantGeocodeCandidate("Sector 150, Noida", results)).toBeNull();
  });

  it("rejects equally ranked distinct results instead of guessing", () => {
    const results = [
      candidate("Sector 62, Noida, Uttar Pradesh, India"),
      candidate("Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh, India")
    ];
    expect(selectRelevantGeocodeCandidate("Sector 62, Noida", results)).toBeNull();
  });

  it("handles empty and malformed candidate lists safely", () => {
    expect(rankGeocodeCandidates("  ", [candidate("Noida, India")])).toEqual([]);
    expect(selectRelevantGeocodeCandidate("Sector 62, Noida", [])).toBeNull();
    expect(selectRelevantGeocodeCandidate("Sector 62, Noida", [null as unknown as GeocodeCandidate])).toBeNull();
  });
});
