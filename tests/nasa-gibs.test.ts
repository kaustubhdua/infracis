import { describe, expect, it } from "vitest";
import { nasaGibsTileUrl, shouldFallbackFromNasaTiles } from "../lib/nasa-gibs";

describe("NASA GIBS map layer", () => {
  it("builds the public Web Mercator tile URL with Leaflet x/y placeholders in the correct row/column order", () => {
    expect(nasaGibsTileUrl("2026-10-27")).toBe(
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2026-10-27/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
    );
  });

  it("rejects malformed dates before requesting satellite tiles", () => {
    expect(() => nasaGibsTileUrl("yesterday")).toThrow("YYYY-MM-DD");
    expect(() => nasaGibsTileUrl("2026-13-42")).toThrow("YYYY-MM-DD");
    expect(() => nasaGibsTileUrl("2026-02-31")).toThrow("calendar date");
  });

  it("falls back only after repeated failures with no successful NASA tiles", () => {
    expect(shouldFallbackFromNasaTiles(0, 3)).toBe(false);
    expect(shouldFallbackFromNasaTiles(0, 4)).toBe(true);
    expect(shouldFallbackFromNasaTiles(1, 12)).toBe(false);
  });
});
