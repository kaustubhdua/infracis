import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { enforceRateLimit } = vi.hoisted(() => ({
  enforceRateLimit: vi.fn()
}));

vi.mock("@/lib/distributed-rate-limit", () => ({ enforceRateLimit }));
vi.mock("@/lib/providers/nominatim", () => ({ geocodeLocation: vi.fn() }));
vi.mock("@/lib/providers/open-meteo", () => ({
  fetchWeatherAndElevation: vi.fn(),
  fetchAirQuality: vi.fn()
}));
vi.mock("@/lib/providers/overpass", () => ({ fetchNearbyAmenities: vi.fn() }));

import { POST as analyze } from "../app/api/analyze/route";
import { POST as compare } from "../app/api/compare/route";
import { fetchWeatherAndElevation, fetchAirQuality } from "../lib/providers/open-meteo";
import { geocodeLocation } from "../lib/providers/nominatim";
import { fetchNearbyAmenities } from "../lib/providers/overpass";

function request(path: string, body: unknown, realIp: string | null = "192.0.2.10", extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(realIp ? { "x-real-ip": realIp } : {}),
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
}

describe("API route input and availability contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 });
  });
  afterEach(() => vi.restoreAllMocks());

  it("does not reuse a manual-coordinate report under a different user-supplied label", async () => {
    vi.mocked(fetchWeatherAndElevation).mockResolvedValue(null as never);
    vi.mocked(fetchAirQuality).mockResolvedValue(null as never);
    vi.mocked(fetchNearbyAmenities).mockResolvedValue(null as never);

    const first = await analyze(request("/api/analyze", {
      query: "Home Entrance",
      lat: 12.34561,
      lon: 45.67891
    }));
    const second = await analyze(request("/api/analyze", {
      query: "Office Entrance",
      lat: 12.34561,
      lon: 45.67891
    }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).location.label).toBe("Home Entrance");
    expect((await second.json()).location.label).toBe("Office Entrance");
  });


  it("does not trust client-supplied X-Forwarded-For when the trusted proxy IP header is absent", async () => {
    const response = await analyze(request(
      "/api/analyze",
      "{invalid",
      null,
      { "x-forwarded-for": "203.0.113.99" }
    ));

    expect(response.status).toBe(400);
    expect(enforceRateLimit).toHaveBeenCalledWith("analyze:unknown-client", 15);
  });

  it("returns a generic provider error without exposing upstream details", async () => {
    vi.mocked(geocodeLocation).mockRejectedValue(
      new Error("Nominatim HTTP 503 internal upstream payload secret")
    );

    const response = await analyze(request("/api/analyze", {
      query: "unique provider error test location"
    }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("A location data provider failed. Please retry shortly.");
    expect(JSON.stringify(body)).not.toContain("internal upstream payload secret");
  });

  it("rejects non-object analyze bodies without contacting providers", async () => {
    const response = await analyze(request("/api/analyze", ["Delhi"]));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/JSON object/i);
  });

  it("rejects out-of-range manual coordinates before provider calls", async () => {
    const response = await analyze(request("/api/analyze", { lat: 91, lon: 77 }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/coordinates must be finite/i);
  });

  it("rejects oversized location queries before provider calls", async () => {
    const response = await analyze(request("/api/analyze", { query: "x".repeat(181) }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/180 characters/i);
  });

  it("returns 503 instead of bypassing a missing shared limiter", async () => {
    enforceRateLimit.mockResolvedValue(null);
    const response = await analyze(request("/api/analyze", { query: "New Delhi" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("returns 429 when the shared limiter denies an analysis", async () => {
    enforceRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const response = await analyze(request("/api/analyze", { query: "New Delhi" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("rejects incomplete comparison inputs without contacting providers", async () => {
    const response = await compare(request("/api/compare", { queryA: "New Delhi" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/both Location A and Location B/i);
  });

  it("rejects oversized comparison inputs", async () => {
    const response = await compare(request("/api/compare", {
      queryA: "x".repeat(181),
      queryB: "New Delhi",
      preference: "balanced"
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/180 characters/i);
  });

  it("rejects unsupported comparison preferences instead of silently changing the user's choice", async () => {
    const response = await compare(request("/api/compare", {
      queryA: "Delhi",
      queryB: "Noida",
      preference: "crime"
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/preference must be one of/i);
  });

  it("returns 503 rather than comparing without shared rate limiting", async () => {
    enforceRateLimit.mockResolvedValue(null);
    const response = await compare(request("/api/compare", { queryA: "Delhi", queryB: "Noida" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});
