import { describe, expect, it } from "vitest";
import { hasFiniteFields } from "../scripts/provider-pilot-validation.mjs";

const requestedWeatherFields = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m"
];

describe("live-provider pilot field completeness", () => {
  it("accepts a response only when every requested numeric field is present", () => {
    const response = Object.fromEntries(requestedWeatherFields.map((field, index) => [field, index + 1]));
    expect(hasFiniteFields(response, requestedWeatherFields)).toBe(true);
  });

  it("rejects a partial response even when one field is valid", () => {
    expect(hasFiniteFields({ temperature_2m: 21.5 }, requestedWeatherFields)).toBe(false);
  });

  it("rejects null, strings, NaN, and infinite values", () => {
    expect(hasFiniteFields(null, ["value"])).toBe(false);
    expect(hasFiniteFields({ value: "21" }, ["value"])).toBe(false);
    expect(hasFiniteFields({ value: Number.NaN }, ["value"])).toBe(false);
    expect(hasFiniteFields({ value: Number.POSITIVE_INFINITY }, ["value"])).toBe(false);
  });

  it("does not mutate provider payloads", () => {
    const response = { temperature_2m: 20, humidity: 50 };
    hasFiniteFields(response, ["temperature_2m"]);
    expect(response).toEqual({ temperature_2m: 20, humidity: 50 });
  });
});
