import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeatherAndElevation, fetchAirQuality } from "./open-meteo";
import { fetchNearbyAmenities } from "./overpass";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("provider schema validation", () => {
  it("rejects an invalid weather response envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));
    await expect(fetchWeatherAndElevation(28.6139, 77.209)).rejects.toThrow(/invalid response shape/i);
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 0.6 }), { status: 200 })));
    await expect(fetchNearbyAmenities(28.6139, 77.209)).rejects.toThrow(/invalid response shape/i);
  });

  it("fails closed in production when no verified Overpass endpoint is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OVERPASS_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(11.2345, 22.3456, 1200)).rejects.toThrow(/not configured for production/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects insecure HTTP Overpass endpoint configuration", async () => {
    vi.stubEnv("OVERPASS_API_URL", "http://overpass.example/interpreter");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNearbyAmenities(13.2345, 24.3456, 1200)).rejects.toThrow(/must use HTTPS/i);
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
    expect(query).toContain("[out:json][timeout:10]");
  });
});
