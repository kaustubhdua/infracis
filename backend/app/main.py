from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import math
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Literal

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from redis.asyncio import Redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("infracis.backend")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    infracis_api_key: str = ""
    redis_url: str = ""
    request_timeout_seconds: float = Field(default=10.0, ge=1, le=30)
    rate_limit_analyze_per_minute: int = Field(default=12, ge=1, le=120)
    nominatim_min_interval_seconds: float = Field(default=1.0, ge=1, le=10)
    overpass_radius_meters: int = Field(default=1200, ge=100, le=5000)
    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    open_meteo_base_url: str = "https://api.open-meteo.com"
    open_meteo_air_quality_base_url: str = "https://air-quality-api.open-meteo.com"
    overpass_url: str = "https://overpass-api.de/api/interpreter"

    @property
    def production(self) -> bool:
        return self.app_env.lower() == "production"


settings = Settings()
redis_client: Redis | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_number(value: Any, low: float, high: float) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) and low <= number <= high else None


class AnalyzeInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    query: str | None = Field(default=None, min_length=1, max_length=180)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    label: str | None = Field(default=None, min_length=1, max_length=180)

    @model_validator(mode="after")
    def validate_location_input(self) -> "AnalyzeInput":
        has_query = bool(self.query and self.query.strip())
        has_lat = self.latitude is not None
        has_lon = self.longitude is not None
        if has_query and (has_lat or has_lon):
            raise ValueError("Provide either query or coordinates, not both.")
        if has_lat != has_lon:
            raise ValueError("Both latitude and longitude are required together.")
        if not has_query and not (has_lat and has_lon):
            raise ValueError("Provide a location query or both coordinates.")
        return self


class SourceStatus(BaseModel):
    provider: str
    status: Literal["available", "unavailable", "not_requested"]
    source_url: str
    retrieved_at: str
    note: str
    data: dict[str, Any] | list[dict[str, Any]] | None = None


class LocationSummary(BaseModel):
    label: str
    latitude: float
    longitude: float
    map_url: str
    resolved_by: Literal["nominatim", "user_coordinates"]


class AnalyzeResponse(BaseModel):
    generated_at: str
    location: LocationSummary
    sources: list[SourceStatus]
    limitations: list[str]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    created_redis = False
    if settings.redis_url and redis_client is None:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
        created_redis = True
    yield
    if created_redis and redis_client is not None:
        await redis_client.aclose()
        redis_client = None


app = FastAPI(
    title="Infracis API",
    description="Evidence-first location due diligence. Provider outputs are not property guarantees.",
    version="0.1.0",
    docs_url=None if settings.production else "/docs",
    redoc_url=None if settings.production else "/redoc",
    lifespan=lifespan,
)

class BodySizeLimitMiddleware:
    """Bound request bodies even when Content-Length is missing or untrusted."""

    def __init__(self, app: Any, max_bytes: int = 16 * 1024) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") != "http" or scope.get("path") != "/v1/analyze" or scope.get("method") != "POST":
            await self.app(scope, receive, send)
            return

        chunks: list[bytes] = []
        total = 0
        while True:
            message = await receive()
            if message.get("type") == "http.disconnect":
                return
            chunk = message.get("body", b"")
            total += len(chunk)
            if total > self.max_bytes:
                response = JSONResponse(status_code=413, content={"detail": "Request body exceeds the 16 KiB limit."})
                await response(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        body = b"".join(chunks)
        sent = False

        async def replay_receive() -> dict[str, Any]:
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            return {"type": "http.disconnect"}

        await self.app(scope, replay_receive, send)


app.add_middleware(BodySizeLimitMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled request error path=%s", request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal service error. No upstream payload or stack trace is exposed."})


async def require_api_key(
    request: Request,
    x_infracis_api_key: str | None = Header(default=None, alias="X-Infracis-API-Key"),
) -> None:
    if not settings.infracis_api_key:
        if settings.production:
            raise HTTPException(status_code=503, detail="API authentication is not configured.")
        # Development remains explicit: requests without a configured key are allowed locally.
        return
    if not x_infracis_api_key or not hmac.compare_digest(
        x_infracis_api_key.encode("utf-8"), settings.infracis_api_key.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="A valid server-to-server API key is required.")


async def require_redis() -> Redis:
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Shared rate limiting is not configured.")
    try:
        await redis_client.ping()
    except Exception as exc:
        logger.warning("Redis readiness check failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Shared rate limiting is temporarily unavailable.") from exc
    return redis_client


@app.get("/health/live", tags=["health"])
async def liveness() -> dict[str, str]:
    return {"status": "alive", "service": "infracis-api"}


@app.get("/health/ready", tags=["health"])
async def readiness() -> dict[str, str]:
    if settings.production and not settings.infracis_api_key:
        raise HTTPException(status_code=503, detail="API authentication is not configured.")
    if settings.production and redis_client is None:
        raise HTTPException(status_code=503, detail="Redis is not configured.")
    if redis_client is not None:
        try:
            await redis_client.ping()
        except Exception as exc:
            logger.warning("Redis readiness failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="Redis is not reachable.") from exc
    return {"status": "ready", "service": "infracis-api"}


async def rate_limit(request: Request, redis: Redis = Depends(require_redis)) -> None:
    # Do not trust client-supplied X-Forwarded-For. Hosting must configure trusted
    # proxy handling before request.client.host can be considered a client identity.
    client_host = request.client.host if request.client else "unknown"
    key = f"infracis:backend:rate:{hashlib.sha256(client_host.encode()).hexdigest()}"
    try:
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 60)
    except Exception as exc:
        logger.warning("Redis rate limit failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Shared rate limiting is temporarily unavailable.") from exc
    if count > settings.rate_limit_analyze_per_minute:
        raise HTTPException(
            status_code=429,
            detail="Too many analysis requests. Please wait before retrying.",
            headers={"Retry-After": "60"},
        )


async def reserve_nominatim_slot(redis: Redis) -> None:
    # A single global Redis key coordinates all backend instances. If the slot
    # cannot be reserved, fail closed rather than violating the public service policy.
    try:
        reserved = await redis.set(
            "infracis:provider:nominatim:slot",
            str(time.time()),
            nx=True,
            ex=max(1, math.ceil(settings.nominatim_min_interval_seconds)),
        )
    except Exception as exc:
        logger.warning("Nominatim slot reservation failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Geocoding is unavailable because shared provider throttling is unavailable.") from exc
    if not reserved:
        raise HTTPException(
            status_code=429,
            detail="Geocoding is briefly rate-limited. Please retry in a moment.",
            headers={"Retry-After": "1"},
        )


async def get_json(client: httpx.AsyncClient, url: str, *, params: dict[str, Any] | None = None,
                   data: dict[str, Any] | None = None) -> Any:
    response = await client.get(url, params=params) if data is None else await client.post(url, data=data)
    response.raise_for_status()
    return response.json()


async def resolve_location(
    client: httpx.AsyncClient, redis: Redis, payload: AnalyzeInput
) -> tuple[LocationSummary, str | None]:
    if payload.latitude is not None and payload.longitude is not None:
        lat = safe_number(payload.latitude, -90, 90)
        lon = safe_number(payload.longitude, -180, 180)
        if lat is None or lon is None:
            raise HTTPException(status_code=422, detail="Coordinates must be finite values within valid latitude/longitude ranges.")
        label = payload.label or f"Selected map point ({lat:.5f}, {lon:.5f})"
        return LocationSummary(
            label=label,
            latitude=lat,
            longitude=lon,
            map_url=f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}",
            resolved_by="user_coordinates",
        ), None

    assert payload.query is not None
    normalized_query = " ".join(payload.query.casefold().split())
    cache_key = "infracis:provider:nominatim:query:" + hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()
    try:
        cached = await redis.get(cache_key)
        if cached:
            try:
                cached_location = LocationSummary.model_validate_json(cached)
                return cached_location, "https://nominatim.openstreetmap.org/"
            except Exception:
                # Discard malformed/stale cache entries; never return unvalidated cached data.
                await redis.delete(cache_key)
    except Exception as exc:
        logger.warning("Nominatim cache read failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Geocoding is unavailable because shared provider caching is unavailable.") from exc

    await reserve_nominatim_slot(redis)
    url = f"{settings.nominatim_base_url.rstrip('/')}/search"
    try:
        data = await get_json(
            client,
            url,
            params={"q": payload.query, "format": "jsonv2", "addressdetails": 1, "limit": 1},
        )
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Nominatim request failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Geocoding provider is temporarily unavailable.") from exc
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Geocoding provider returned an invalid response.")
    if not data:
        raise HTTPException(status_code=404, detail="No matching location found. Try adding locality, city, or postal code.")
    item = data[0]
    if not isinstance(item, dict) or not isinstance(item.get("display_name"), str):
        raise HTTPException(status_code=502, detail="Geocoding provider returned an invalid location record.")
    try:
        raw_lat = float(item.get("lat", "nan"))
        raw_lon = float(item.get("lon", "nan"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=502, detail="Geocoding provider returned invalid coordinates.")
    lat = safe_number(raw_lat, -90, 90)
    lon = safe_number(raw_lon, -180, 180)
    if lat is None or lon is None:
        raise HTTPException(status_code=502, detail="Geocoding provider returned invalid coordinates.")
    resolved = LocationSummary(
        label=item["display_name"],
        latitude=lat,
        longitude=lon,
        map_url=f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}",
        resolved_by="nominatim",
    )
    try:
        await redis.set(cache_key, resolved.model_dump_json(), ex=24 * 60 * 60)
    except Exception as exc:
        logger.warning("Nominatim cache write failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Geocoding is unavailable because shared provider caching is unavailable.") from exc
    return resolved, "https://nominatim.openstreetmap.org/"


async def fetch_weather(client: httpx.AsyncClient, lat: float, lon: float) -> SourceStatus:
    retrieved = now_iso()
    base = settings.open_meteo_base_url.rstrip("/")
    url = f"{base}/v1/forecast"
    try:
        data = await get_json(client, url, params={
            "latitude": lat, "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
            "timezone": "auto",
        })
        current = data.get("current") if isinstance(data, dict) else None
        if not isinstance(current, dict) or not isinstance(current.get("time"), str):
            raise ValueError("invalid current weather shape")
        fields = {
            "temperature_2m": (-100, 70),
            "relative_humidity_2m": (0, 100),
            "precipitation": (0, 10000),
            "weather_code": (0, 99),
            "wind_speed_10m": (0, 500),
        }
        normalized = {key: safe_number(current.get(key), low, high) for key, (low, high) in fields.items()}
        normalized["time"] = current["time"]
        normalized["units"] = data.get("current_units", {}) if isinstance(data, dict) else {}
        return SourceStatus(provider="Open-Meteo weather", status="available", source_url=url,
                            retrieved_at=retrieved, note="Forecast-model current conditions, not an on-site measurement.",
                            data=normalized)
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.info("Weather provider unavailable: %s", type(exc).__name__)
        return SourceStatus(provider="Open-Meteo weather", status="unavailable", source_url=url,
                            retrieved_at=retrieved, note="Weather data could not be retrieved or validated; no substitute values were generated.")


async def fetch_air_quality(client: httpx.AsyncClient, lat: float, lon: float) -> SourceStatus:
    retrieved = now_iso()
    url = f"{settings.open_meteo_air_quality_base_url.rstrip('/')}/v1/air-quality"
    try:
        data = await get_json(client, url, params={
            "latitude": lat, "longitude": lon,
            "current": "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone",
            "timezone": "auto",
        })
        current = data.get("current") if isinstance(data, dict) else None
        if not isinstance(current, dict) or not isinstance(current.get("time"), str):
            raise ValueError("invalid current air quality shape")
        fields = {
            "european_aqi": (0, 1000), "pm10": (0, 10000), "pm2_5": (0, 10000),
            "nitrogen_dioxide": (0, 10000), "ozone": (0, 10000),
        }
        normalized = {key: safe_number(current.get(key), low, high) for key, (low, high) in fields.items()}
        normalized["time"] = current["time"]
        normalized["units"] = data.get("current_units", {}) if isinstance(data, dict) else {}
        return SourceStatus(provider="Open-Meteo air quality", status="available", source_url=url,
                            retrieved_at=retrieved, note="Modelled air-quality estimates; not a local regulatory monitor measurement.",
                            data=normalized)
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.info("Air-quality provider unavailable: %s", type(exc).__name__)
        return SourceStatus(provider="Open-Meteo air quality", status="unavailable", source_url=url,
                            retrieved_at=retrieved, note="Air-quality data could not be retrieved or validated; no substitute values were generated.")


async def fetch_amenities(client: httpx.AsyncClient, lat: float, lon: float) -> SourceStatus:
    retrieved = now_iso()
    url = settings.overpass_url
    radius = settings.overpass_radius_meters
    query = f"""[out:json][timeout:10];
(
  node(around:{radius},{lat},{lon})[amenity~"^(school|kindergarten|college|university|hospital|clinic|pharmacy|bank|atm|marketplace|supermarket|bus_station|police|fire_station|library)$"];
  way(around:{radius},{lat},{lon})[amenity~"^(school|kindergarten|college|university|hospital|clinic|pharmacy|bank|atm|marketplace|supermarket|bus_station|police|fire_station|library)$"];
  node(around:{radius},{lat},{lon})[highway=bus_stop];
  node(around:{radius},{lat},{lon})[railway~"^(station|subway_entrance|tram_stop)$"];
  node(around:{radius},{lat},{lon})[leisure~"^(park|playground)$"];
);
out center tags 100;"""
    try:
        data = await get_json(client, url, data={"data": query})
        elements = data.get("elements") if isinstance(data, dict) else None
        if not isinstance(elements, list):
            raise ValueError("invalid Overpass response shape")
        items: list[dict[str, Any]] = []
        for element in elements[:100]:
            if not isinstance(element, dict) or not isinstance(element.get("id"), int):
                continue
            tags = element.get("tags", {})
            if not isinstance(tags, dict):
                tags = {}
            item_lat = safe_number(element.get("lat", (element.get("center") or {}).get("lat")), -90, 90)
            item_lon = safe_number(element.get("lon", (element.get("center") or {}).get("lon")), -180, 180)
            category = tags.get("amenity") or tags.get("railway") or tags.get("highway") or tags.get("leisure") or "mapped_feature"
            items.append({
                "id": f"{element.get('type', 'element')}-{element['id']}",
                "name": tags.get("name") or tags.get("name:en") or tags.get("brand") or f"Mapped {str(category).replace('_', ' ')}",
                "category": category,
                "latitude": item_lat,
                "longitude": item_lon,
                "distance_meters": round(haversine_meters(lat, lon, item_lat, item_lon), 1) if item_lat is not None and item_lon is not None else None,
                "source_url": f"https://www.openstreetmap.org/{element.get('type', 'node')}/{element['id']}",
            })
        items.sort(key=lambda item: item["distance_meters"] if item["distance_meters"] is not None else float("inf"))
        return SourceStatus(provider="OpenStreetMap Overpass", status="available", source_url=url,
                            retrieved_at=retrieved,
                            note=f"{len(items)} mapped features returned within {radius} m. Map coverage is incomplete; absence does not prove absence on the ground.",
                            data=items)
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.info("Overpass provider unavailable: %s", type(exc).__name__)
        return SourceStatus(provider="OpenStreetMap Overpass", status="unavailable", source_url=url,
                            retrieved_at=retrieved, note="Mapped amenity data could not be retrieved or validated; no substitute features were generated.")


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * earth_radius * math.asin(min(1.0, math.sqrt(a)))


@app.post("/v1/analyze", response_model=AnalyzeResponse, tags=["analysis"], dependencies=[Depends(require_api_key), Depends(rate_limit)])
async def analyze(payload: AnalyzeInput, redis: Redis = Depends(require_redis)) -> AnalyzeResponse:
    timeout = httpx.Timeout(settings.request_timeout_seconds, connect=min(4.0, settings.request_timeout_seconds))
    headers = {
        "Accept": "application/json",
        "User-Agent": "InfracisLocationDueDiligence/1.0 (https://github.com/kaustubhdua/infracis)",
    }
    async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=False) as client:
        location, geocode_source = await resolve_location(client, redis, payload)
        weather, air_quality, amenities = await asyncio.gather(
            fetch_weather(client, location.latitude, location.longitude),
            fetch_air_quality(client, location.latitude, location.longitude),
            fetch_amenities(client, location.latitude, location.longitude),
        )
    sources = [weather, air_quality, amenities]
    if geocode_source:
        sources.insert(0, SourceStatus(
            provider="OpenStreetMap Nominatim", status="available", source_url=geocode_source,
            retrieved_at=now_iso(), note="Location label and coordinates resolved by Nominatim."
        ))
    else:
        sources.insert(0, SourceStatus(
            provider="User-selected coordinates", status="available", source_url=location.map_url,
            retrieved_at=now_iso(), note="Coordinates and label were supplied by the user and were not reverse-geocoded."
        ))
    limitations = [
        "This report evaluates a location, not a specific property, building, title, or legal status.",
        "Weather and air-quality values are provider model estimates, not guaranteed on-site measurements.",
        "OpenStreetMap amenities are mapped features, not a complete inventory or a guarantee of opening hours, quality, accessibility, or safety.",
        "A missing or unavailable source is unknown, not evidence that a risk or amenity is absent.",
        "No synthetic values are generated when providers fail.",
    ]
    return AnalyzeResponse(generated_at=now_iso(), location=location, sources=sources, limitations=limitations)
