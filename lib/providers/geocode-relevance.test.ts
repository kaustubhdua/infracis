import { describe, expect, it } from "vitest";
import { getNominatimSearchOptions, rankGeocodeCandidates, selectRelevantGeocodeCandidate, type GeocodeCandidate } from "./geocode-relevance";

const candidate = (display_name: string, metadata: Partial<GeocodeCandidate> = {}): GeocodeCandidate => ({
  display_name,
  lat: "28.61",
  lon: "77.23",
  ...metadata
});

describe("Nominatim query intent", () => {
  it("restricts locality searches to settlements so POIs do not crowd out neighbourhoods", () => {
    expect(getNominatimSearchOptions("Saket, New Delhi, India")).toEqual({
      layer: "address",
      featureType: "settlement"
    });
    expect(getNominatimSearchOptions("Sector 150, Noida, Uttar Pradesh, India")).toEqual({
      layer: "address",
      featureType: "settlement"
    });
  });

  it("keeps road/address queries on the address layer without settlement-only filtering", () => {
    expect(getNominatimSearchOptions("Sohna Road, Gurugram, Haryana, India")).toEqual({
      layer: "address"
    });
    expect(getNominatimSearchOptions("123 MG Road, Bengaluru")).toEqual({
      layer: "address"
    });
  });

  it("includes POI candidates only for explicit POI queries", () => {
    expect(getNominatimSearchOptions("Green Field School, Saket")).toEqual({
      layer: "address,poi"
    });
    expect(getNominatimSearchOptions("Apollo Hospital, Delhi")).toEqual({
      layer: "address,poi"
    });
  });
});

describe("geocoder relevance guard", () => {
  it("treats New Delhi and Delhi locality labels as equivalent city context", () => {
    const saket = candidate("Saket, South Delhi, Delhi, India", {
      category: "place",
      type: "suburb",
      addresstype: "suburb"
    });
    expect(selectRelevantGeocodeCandidate("Saket, New Delhi, India", [saket])).toEqual(saket);
  });

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

  it("requires exact numeric sector and phase tokens", () => {
    const results = [
      candidate("Aap ka Bazar, Sector 23A, Dwarka, New Delhi, India"),
      candidate("Dwarka, New Delhi, Delhi, India")
    ];
    expect(selectRelevantGeocodeCandidate("Dwarka Sector 21, New Delhi, India", results)).toBeNull();
    expect(selectRelevantGeocodeCandidate("Sector 150, Noida, Uttar Pradesh, India", [
      candidate("Sector 18, Noida, Uttar Pradesh, India")
    ])).toBeNull();
  });

  it("rejects a point of interest that only mentions a locality", () => {
    const poi = candidate(
      "Green Field School, Saket Road, Press Enclave, Saket, South Delhi, India",
      { class: "amenity", type: "school", addresstype: "school" }
    );
    expect(selectRelevantGeocodeCandidate("Saket, New Delhi, India", [poi])).toBeNull();

    const explicitPoi = candidate(
      "Green Field School, Saket Road, Press Enclave, Saket, South Delhi, India",
      { class: "amenity", type: "school", addresstype: "school" }
    );
    expect(selectRelevantGeocodeCandidate("Green Field School, Saket", [explicitPoi])).toEqual(explicitPoi);
  });

  it("rejects a jsonv2 category-tagged POI that only mentions a locality", () => {
    const poi = candidate(
      "Green Field School, Saket Road, Press Enclave, Saket, South Delhi, India",
      { category: "amenity", type: "school", addresstype: "amenity" }
    );
    expect(selectRelevantGeocodeCandidate("Saket, New Delhi, India", [poi])).toBeNull();

    const explicitPoi = candidate(
      "Green Field School, Saket Road, Press Enclave, Saket, South Delhi, India",
      { category: "amenity", type: "school", addresstype: "amenity" }
    );
    expect(selectRelevantGeocodeCandidate("Green Field School, Saket", [explicitPoi])).toEqual(explicitPoi);
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
