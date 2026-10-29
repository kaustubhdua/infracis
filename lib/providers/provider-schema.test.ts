import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeatherAndElevation, fetchAirQuality } from "./open-meteo";
import { geocodeLocation } from "./nominatim";
import { fetchNearbyAmenities } from "./overpass";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("provider schema validation", () => {
  it("rejects an invalid weather response envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));
    await expect(fetchWeatherAndElevation(28.6139, 77.209)).rejects.toThrow(/invalid response shape/i);
  });

  it("ignores malformed optional Nominatim bounding boxes without accepting invalid coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      lat: "28.6139",
      lon: "77.2090",
      display_name: "New Delhi, India",
      boundingbox: "not-an-array"
    }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const location = await geocodeLocation("New Delhi");
    expect(location.latitude).toBe(28.6139);
    expect(location.longitude).toBe(77.209);
    expect(location.boundingbox).toBeUndefined();
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("layer")).toBe("address,poi");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": expect.stringContaining("Infracis") }) })
    );
  });


  it("uses the OSM-backed Photon fallback only when Nominatim has no relevant locality", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        lat: "28.5200",
        lon: "77.2100",
        display_name: "Green Field School, Saket Road, Saket, New Delhi, India",
        category: "amenity",
        class: "amenity",
        type: "school",
        addresstype: "amenity",
        address: { school: "Green Field School", suburb: "Saket", city: "New Delhi", country: "India" }
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [{
          geometry: { coordinates: [77.201, 28.524] },
          properties: {
            name: "Saket",
            osm_key: "place",
            osm_value: "suburb",
            type: "suburb",
            city: "New Delhi",
            state: "Delhi",
            country: "India",
            extent: [77.18, 28.50, 77.23, 28.55]
          }
        }]
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const location = await geocodeLocation("Saket, New Delhi, India");

    expect(location.label).toContain("Saket");
    expect(location.latitude).toBe(28.524);
    expect(location.longitude).toBe(77.201);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0])).hostname).toBe("photon.komoot.io");
    expect(location.boundingbox).toEqual([28.5, 28.55, 77.18, 77.23]);
  });

    it("rejects weather data without valid current observation time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ current: { temperature_2m: 32 } }), { status: 200 })));
    await expect(fetchWeatherAndElevation(28.6139, 77.209)).rejects.toThrow(/missing or invalid current observations/i);
  });

  it("rejects an invalid air-quality response envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })));
    await expect(fetchAirQuality(28.6139, 77.209)).rejects.toThrow(/invalid response shape/i);
  });

  it("rejects Overpass responses without an elements array", async () => {
    vi.stubEnv("OVERPASS_API_URL", "https://overpass.example/interpreter");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 0.6 }), { status: 200 })));
    await expect(fetchNearbyAmenities(28.6139, 77.209)).rejects.toThrow(/invalid response shape/i);
  });

  it("fails closed in production when no verified Overpass endpoint is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OVERPASS_API_URL", "");
    vi.stubEnv("OVERPASS_API_URLS", "");
    vi.stubEnv("OVERPASS_ALLOW_PUBLIC_FALLBACK", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(11.2345, 22.3456, 1200)).rejects.toThrow(/No verified Overpass endpoint is configured/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires an explicit opt-in before using best-effort public Overpass fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OVERPASS_API_URL", "");
    vi.stubEnv("OVERPASS_API_URLS", "");
    vi.stubEnv("OVERPASS_ALLOW_PUBLIC_FALLBACK", "true");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(11.2345, 22.3456, 1200)).resolves.toMatchObject({ totalCount: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://overpass.private.coffee/api/interpreter");
    expect(fetchMock.mock.calls[1][0]).toBe("https://overpass-api.de/api/interpreter");
  });

  it("does not immediately retry a rate-limited Overpass request", async () => {
    vi.stubEnv("OVERPASS_API_URLS", "https://overpass-primary.example/interpreter;https://overpass-secondary.example/interpreter");
    vi.stubEnv("OVERPASS_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(15.1234, 16.2345, 1200)).rejects.toThrow(/HTTP 429/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects insecure HTTP Overpass endpoint configuration", async () => {
    vi.stubEnv("OVERPASS_API_URL", "http://overpass.example/interpreter");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(13.2345, 24.3456, 1200)).rejects.toThrow(/must use HTTPS/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("excludes amenity records without valid coordinates from proximity and nearest-facility results", async () => {
    vi.stubEnv("OVERPASS_API_URL", "https://overpass.example/interpreter");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      elements: [
        { id: 11, type: "node", lat: 28.614, lon: 77.209, tags: { highway: "bus_stop", name: "Mapped Bus Stop" } },
        { id: 12, type: "node", tags: { amenity: "hospital", name: "Hospital With Missing Coordinates" } },
        { id: 13, type: "node", lat: 28.7, lon: 77.4, tags: { amenity: "hospital", name: "Hospital Outside Requested Radius" } }
      ]
    }), { status: 200 })));

    const summary = await fetchNearbyAmenities(28.6139, 77.209, 1200);

    expect(summary.totalCount).toBe(1);
    expect(summary.nearest.transit?.name).toBe("Mapped Bus Stop");
    expect(summary.nearest.healthcare).toBeUndefined();
    expect(summary.items.every((item) => Number.isFinite(item.distanceMeters) && item.lat !== null && item.lon !== null)).toBe(true);
  });

  it("marks capped Overpass responses and withholds nearest-facility claims", async () => {
    vi.stubEnv("OVERPASS_API_URL", "https://overpass.example/interpreter");
    const elements = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      type: "node",
      lat: 40.1234,
      lon: 50.1234,
      tags: { highway: "bus_stop", name: `Mapped Stop ${index + 1}` }
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements }), { status: 200 })));

    const summary = await fetchNearbyAmenities(40.1234, 50.1234, 1200);

    expect(summary.resultLimitReached).toBe(true);
    expect(summary.totalCount).toBe(100);
    expect(summary.nearest.transit).toBeUndefined();
  });



  it("rejects more than three configured Overpass endpoints before network requests", async () => {
    vi.stubEnv("OVERPASS_API_URLS", [
      "https://overpass-a.example/interpreter",
      "https://overpass-b.example/interpreter",
      "https://overpass-c.example/interpreter",
      "https://overpass-d.example/interpreter"
    ].join(";"));
    vi.stubEnv("OVERPASS_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(14.1234, 15.2345, 1200)).rejects.toThrow(/at most three/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails over to the next explicitly configured HTTPS endpoint after an upstream 502", async () => {
    vi.stubEnv("OVERPASS_API_URLS", "https://overpass-primary.example/interpreter;https://overpass-secondary.example/interpreter");
    vi.stubEnv("OVERPASS_API_URL", "");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const summary = await fetchNearbyAmenities(7.1234, 8.2345, 1200);

    expect(summary.totalCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://overpass-primary.example/interpreter");
    expect(fetchMock.mock.calls[1][0]).toBe("https://overpass-secondary.example/interpreter");
  });

  it("fails over when an endpoint returns malformed JSON shape", async () => {
    vi.stubEnv("OVERPASS_API_URLS", "https://overpass-primary.example/interpreter,https://overpass-secondary.example/interpreter");
    vi.stubEnv("OVERPASS_API_URL", "");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 0.6 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(9.1234, 10.2345, 1200)).resolves.toMatchObject({ totalCount: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects non-HTTPS endpoints before making provider requests", async () => {
    vi.stubEnv("OVERPASS_API_URLS", "https://overpass-primary.example/interpreter;http://insecure.example/interpreter");
    vi.stubEnv("OVERPASS_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(12.1234, 13.2345, 1200)).rejects.toThrow(/must use HTTPS/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses a configured Overpass endpoint and a single lower-cost union query", async () => {
    vi.stubEnv("OVERPASS_API_URL", "https://overpass.example/interpreter");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchNearbyAmenities(1.2345, 2.3456, 1200);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://overpass.example/interpreter",
      expect.objectContaining({ method: "POST" })
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const body = options.body as URLSearchParams;
    const query = body.get("data") ?? "";
    expect(query.split("nwr(around:")).toHaveLength(5);
    expect(query).toContain("[out:json][timeout:6]");
  });
});
