import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/providers/nominatim", () => ({ geocodeLocation: vi.fn() }));
vi.mock("@/lib/providers/overpass", () => ({ fetchNearbyAmenities: vi.fn() }));
vi.mock("@/lib/providers/open-meteo", () => ({
  fetchWeatherAndElevation: vi.fn(),
  fetchAirQuality: vi.fn()
}));

import { POST as analyzePost } from "../app/api/analyze/route";
import { POST as comparePost } from "../app/api/compare/route";
import { geocodeLocation } from "@/lib/providers/nominatim";

function post(path: string, body: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body
  });
}

describe("API route input validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed JSON on analysis before calling providers", async () => {
    const response = await analyzePost(post("/api/analyze", "{invalid"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON request body." });
    expect(geocodeLocation).not.toHaveBeenCalled();
  });

  it("rejects missing analysis location", async () => {
    const response = await analyzePost(post("/api/analyze", JSON.stringify({})));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Enter a location address or pick a point on the map." });
    expect(geocodeLocation).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates instead of querying providers", async () => {
    const response = await analyzePost(post("/api/analyze", JSON.stringify({ lat: 91, lon: 0 })));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Coordinates must be finite numbers within latitude -90..90 and longitude -180..180."
    });
    expect(geocodeLocation).not.toHaveBeenCalled();
  });

  it("rejects oversized declared analysis bodies", async () => {
    const response = await analyzePost(post(
      "/api/analyze",
      JSON.stringify({ query: "Noida" }),
      { "content-length": String(20 * 1024) }
    ));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Request body is too large." });
    expect(geocodeLocation).not.toHaveBeenCalled();
  });

  it("requires both comparison locations", async () => {
    const response = await comparePost(post("/api/compare", JSON.stringify({ queryA: "Noida" })));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Provide both Location A and Location B to compare." });
    expect(geocodeLocation).not.toHaveBeenCalled();
  });

  it("rejects overlong comparison queries", async () => {
    const response = await comparePost(post("/api/compare", JSON.stringify({
      queryA: "a".repeat(181),
      queryB: "Noida"
    })));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Each location query must be 180 characters or fewer." });
    expect(geocodeLocation).not.toHaveBeenCalled();
  });
});
