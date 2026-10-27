import { WeatherData, AirQualityData } from "../types";
import { interpretWeatherCode, interpretEuropeanAqi } from "../geo";

export async function fetchWeatherAndElevation(
  lat: number,
  lon: number
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo weather service responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
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
  const weatherCode = current?.weather_code ?? null;

  return {
    temperature: current?.temperature_2m ?? null,
    humidity: current?.relative_humidity_2m ?? null,
    precipitation: current?.precipitation ?? null,
    windSpeed: current?.wind_speed_10m ?? null,
    weatherCode,
    weatherDescription: interpretWeatherCode(weatherCode),
    observedTime: current?.time ?? null,
    elevationMeters: data.elevation ?? null,
    units: data.current_units ?? {}
  };
}

export async function fetchAirQuality(
  lat: number,
  lon: number
): Promise<AirQualityData> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone"
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo air quality service responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
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
  const aqi = current?.european_aqi ?? null;
  const aqiInfo = interpretEuropeanAqi(aqi);

  return {
    europeanAqi: aqi,
    aqiLabel: aqiInfo.label,
    pm25: current?.pm2_5 ?? null,
    pm10: current?.pm10 ?? null,
    nitrogenDioxide: current?.nitrogen_dioxide ?? null,
    ozone: current?.ozone ?? null,
    observedTime: current?.time ?? null,
    units: data.current_units ?? {}
  };
}
