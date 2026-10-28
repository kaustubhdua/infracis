from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import main


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.cache: dict[str, str] = {}
        self.slots: set[str] = set()

    async def ping(self) -> bool:
        return True

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> bool:
        return True

    async def get(self, key: str) -> str | None:
        return self.cache.get(key)

    async def delete(self, key: str) -> int:
        self.cache.pop(key, None)
        return 1

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None) -> bool:
        if nx and key in self.slots:
            return False
        if nx:
            self.slots.add(key)
        self.cache[key] = value
        return True

    async def aclose(self) -> None:
        return None


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch):
    fake_redis = FakeRedis()
    monkeypatch.setattr(main, "redis_client", fake_redis)
    monkeypatch.setattr(main.settings, "app_env", "development")
    monkeypatch.setattr(main.settings, "infracis_api_key", "")
    with TestClient(main.app) as test_client:
        yield test_client


def test_liveness_does_not_claim_provider_readiness(client: TestClient) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive", "service": "infracis-api"}


def test_ready_checks_redis(client: TestClient) -> None:
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_ready_fails_closed_when_redis_is_unavailable(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    class UnavailableRedis:
        async def ping(self) -> bool:
            raise TimeoutError("private redis endpoint details must not reach the client")

    monkeypatch.setattr(main, "redis_client", UnavailableRedis())
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {"detail": "Redis is not reachable."}
    assert "private redis endpoint" not in response.text


def test_analyze_rejects_empty_body(client: TestClient) -> None:
    response = client.post("/v1/analyze", json={})
    assert response.status_code == 422


def test_analyze_rejects_partial_coordinates(client: TestClient) -> None:
    response = client.post("/v1/analyze", json={"latitude": 28.6})
    assert response.status_code == 422


def test_analyze_rejects_extra_fields(client: TestClient) -> None:
    response = client.post("/v1/analyze", json={"query": "Delhi", "secret": "not allowed"})
    assert response.status_code == 422


def test_analyze_rejects_query_and_coordinates_together(client: TestClient) -> None:
    response = client.post("/v1/analyze", json={"query": "Delhi", "latitude": 28.6, "longitude": 77.2})
    assert response.status_code == 422


def test_api_key_is_required_when_configured(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main.settings, "infracis_api_key", "long-test-secret")
    response = client.post("/v1/analyze", json={"latitude": 28.6, "longitude": 77.2})
    assert response.status_code == 401


def test_production_fails_closed_without_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main.settings, "app_env", "production")
    monkeypatch.setattr(main.settings, "infracis_api_key", "")
    response = client.get("/health/ready")
    assert response.status_code == 503


def test_haversine_zero_distance() -> None:
    assert main.haversine_meters(28.6, 77.2, 28.6, 77.2) == pytest.approx(0)


def test_haversine_known_delhi_distance() -> None:
    # Connaught Place to India Gate is approximately 2.4 km (coordinate-dependent).
    distance = main.haversine_meters(28.6315, 77.2167, 28.6129, 77.2295)
    assert 2000 < distance < 2600


@pytest.mark.parametrize(
    ("value", "low", "high", "expected"),
    [
        (4, 0, 10, 4.0),
        (-1, 0, 10, None),
        (float("nan"), 0, 10, None),
        (float("inf"), 0, 10, None),
        (True, 0, 10, None),
        ("4", 0, 10, None),
    ],
)
def test_safe_number(value: Any, low: float, high: float, expected: float | None) -> None:
    assert main.safe_number(value, low, high) == expected


def test_analyze_returns_real_provider_statuses_without_fallbacks(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def unavailable_weather(*args: Any, **kwargs: Any) -> main.SourceStatus:
        return main.SourceStatus(
            provider="Open-Meteo weather",
            status="unavailable",
            source_url="https://api.open-meteo.com/v1/forecast",
            retrieved_at=main.now_iso(),
            note="Weather data could not be retrieved; no substitute values were generated.",
        )

    async def unavailable_air(*args: Any, **kwargs: Any) -> main.SourceStatus:
        return main.SourceStatus(
            provider="Open-Meteo air quality",
            status="unavailable",
            source_url="https://air-quality-api.open-meteo.com/v1/air-quality",
            retrieved_at=main.now_iso(),
            note="Air-quality data could not be retrieved; no substitute values were generated.",
        )

    async def unavailable_amenities(*args: Any, **kwargs: Any) -> main.SourceStatus:
        return main.SourceStatus(
            provider="OpenStreetMap Overpass",
            status="unavailable",
            source_url="https://overpass-api.de/api/interpreter",
            retrieved_at=main.now_iso(),
            note="Mapped features could not be retrieved; no substitute features were generated.",
        )

    monkeypatch.setattr(main, "fetch_weather", unavailable_weather)
    monkeypatch.setattr(main, "fetch_air_quality", unavailable_air)
    monkeypatch.setattr(main, "fetch_amenities", unavailable_amenities)

    response = client.post(
        "/v1/analyze",
        json={"latitude": 28.6315, "longitude": 77.2167, "label": "User-selected map point"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["location"]["resolved_by"] == "user_coordinates"
    assert len(result["sources"]) == 4
    assert all(source["status"] in {"available", "unavailable"} for source in result["sources"])
    assert all(source["status"] == "unavailable" for source in result["sources"][1:])
    assert any("no substitute values" in source["note"] for source in result["sources"][1:])
    assert any("unknown" in note.lower() for note in result["limitations"])


def test_rate_limit_fails_closed_without_redis(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fail_ping() -> bool:
        raise ConnectionError("redis unavailable")

    fake_redis = FakeRedis()
    fake_redis.ping = fail_ping  # type: ignore[method-assign]
    monkeypatch.setattr(main, "redis_client", fake_redis)
    response = client.post("/v1/analyze", json={"latitude": 28.6, "longitude": 77.2})
    assert response.status_code == 503
    assert "rate limiting" in response.json()["detail"].lower()


def test_analyze_rejects_oversized_request_body(client: TestClient) -> None:
    response = client.post(
        "/v1/analyze",
        content=b'{"query":"' + (b"x" * (16 * 1024)) + b'"}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert "16 KiB" in response.json()["detail"]


def test_geocoder_results_are_cached_in_shared_redis(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = {"count": 0}

    async def fake_get_json(*args: Any, **kwargs: Any) -> list[dict[str, str]]:
        calls["count"] += 1
        return [{"display_name": "Connaught Place, New Delhi", "lat": "28.6315", "lon": "77.2167"}]

    async def unavailable_provider(*args: Any, **kwargs: Any) -> main.SourceStatus:
        return main.SourceStatus(
            provider="provider", status="unavailable", source_url="https://example.invalid",
            retrieved_at=main.now_iso(), note="Unavailable; no substitute values were generated."
        )

    monkeypatch.setattr(main, "get_json", fake_get_json)
    monkeypatch.setattr(main, "fetch_weather", unavailable_provider)
    monkeypatch.setattr(main, "fetch_air_quality", unavailable_provider)
    monkeypatch.setattr(main, "fetch_amenities", unavailable_provider)

    first = client.post("/v1/analyze", json={"query": "Connaught Place, New Delhi"})
    second = client.post("/v1/analyze", json={"query": "  connaught   place, new delhi "})
    assert first.status_code == 200
    assert second.status_code == 200
    assert calls["count"] == 1
    assert second.json()["location"]["label"] == "Connaught Place, New Delhi"
