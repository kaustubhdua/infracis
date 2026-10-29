import { WeatherData, AirQualityData } from "../types";
import { interpretWeatherCode, interpretEuropeanAqi } from "../geo";
import { getSharedJson, setSharedJson } from "../shared-provider-cache";
import { fetchWithTransientRetry } from "./http";

export async function fetchWeatherAndElevation(
  lat: number,
  lon: number
): Promise<WeatherData> {
  const cacheKey = `weather:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const cached = await getSharedJson<WeatherData>(cacheKey);
  if (cached) return cached;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetchWithTransientRetry(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store"
  }, 8000);

  if (!response.ok) {
    throw new Error(`Open-Meteo weather service responded with HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Open-Meteo weather service returned an invalid response shape.");
  }
  const data = payload as {
    elevation?: number;
    current?: {
      time?: string;
      temperature_2m?: number;
      relative_humidity_2m?: number;
      precipitation?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    current_units?: Record<string, string>;
  };

  const current = data.current;
  if (!current || typeof current !== "object" || typeof current.time !== "string" || !Number.isFinite(Date.parse(current.time))) {
    throw new Error("Open-Meteo weather service returned missing or invalid current observations.");
  }
  const boundedNumber = (value: unknown, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
  const weatherCode = boundedNumber(current.weather_code, 0, 99);

  const result: WeatherData = {
    temperature: boundedNumber(current.temperature_2m, -100, 70),
    humidity: boundedNumber(current.relative_humidity_2m, 0, 100),
    precipitation: boundedNumber(current.precipitation, 0, 10_000),
    windSpeed: boundedNumber(current.wind_speed_10m, 0, 500),
    weatherCode,
    weatherDescription: interpretWeatherCode(weatherCode),
    observedTime: current?.time ?? null,
    elevationMeters: boundedNumber(data.elevation, -500, 10_000),
    units: data.current_units ?? {}
  };
  await setSharedJson(cacheKey, result, 5 * 60);
  return result;
}

export async function fetchAirQuality(
  lat: number,
  lon: number
): Promise<AirQualityData> {
  const cacheKey = `air-quality:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const cached = await getSharedJson<AirQualityData>(cacheKey);
  if (cached) return cached;
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone"
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetchWithTransientRetry(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store"
  }, 8000);

  if (!response.ok) {
    throw new Error(`Open-Meteo air quality service responded with HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Open-Meteo air quality service returned an invalid response shape.");
  }
  const data = payload as {
    current?: {
      time?: string;
      european_aqi?: number;
      pm10?: number;
      pm2_5?: number;
      nitrogen_dioxide?: number;
      ozone?: number;
    };
    current_units?: Record<string, string>;
  };

  const current = data.current;
  if (!current || typeof current !== "object" || typeof current.time !== "string" || !Number.isFinite(Date.parse(current.time))) {
    throw new Error("Open-Meteo air quality service returned missing or invalid current observations.");
  }
  const nonNegativeOrNull = (value: unknown, max = 1_000_000) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
  const aqi = nonNegativeOrNull(current.european_aqi, 1000);
  const aqiInfo = interpretEuropeanAqi(aqi);

  const result: AirQualityData = {
    europeanAqi: aqi,
    aqiLabel: aqiInfo.label,
    pm25: nonNegativeOrNull(current.pm2_5),
    pm10: nonNegativeOrNull(current.pm10),
    nitrogenDioxide: nonNegativeOrNull(current.nitrogen_dioxide),
    ozone: nonNegativeOrNull(current.ozone),
    observedTime: current?.time ?? null,
    units: data.current_units ?? {}
  };
  await setSharedJson(cacheKey, result, 10 * 60);
  return result;
}
