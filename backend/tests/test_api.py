from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import main


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.slots: set[str] = set()

    async def ping(self) -> bool:
        return True

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> bool:
        return True

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None) -> bool:
        if nx and key in self.slots:
            return False
        self.slots.add(key)
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
