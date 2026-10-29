import { describe, expect, it } from "vitest";
import { cartoVoyagerTileUrl } from "../lib/carto-tiles";

describe("CARTO Voyager tile URL", () => {
  it("adds the project-owned key to the tile URL", () => {
    expect(cartoVoyagerTileUrl("test key")).toBe(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=test%20key"
    );
  });

  it("does not create a broken CARTO URL when the key is missing", () => {
    expect(cartoVoyagerTileUrl(undefined)).toBeNull();
    expect(cartoVoyagerTileUrl("  ")).toBeNull();
    expect(cartoVoyagerTileUrl(null)).toBeNull();
  });

  it("trims accidental whitespace around the key", () => {
    expect(cartoVoyagerTileUrl("  abc123  ")).toContain("?key=abc123");
  });
});
