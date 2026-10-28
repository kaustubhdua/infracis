import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeatherAndElevation, fetchAirQuality } from "./open-meteo";
import { fetchNearbyAmenities } from "./overpass";

afterEach(() => vi.restoreAllMocks());

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
});
