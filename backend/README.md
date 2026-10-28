# Infracis standalone API backend

This is a separately deployable FastAPI service for a future backend hosting step. It is intentionally **not wired into the current Next.js frontend and is not deployed by this change**. The current Next.js route handlers remain the active API until a separate integration change is reviewed.

## What it provides

- `GET /health/live`: process liveness (does not claim dependencies are ready).
- `GET /health/ready`: checks production configuration and Redis reachability.
- `POST /v1/analyze`: resolves a location or validates supplied coordinates, then requests real Open-Meteo weather/air-quality data and OpenStreetMap Overpass amenities.
- Provider failures are returned as explicit unavailable source records. The service does not fill gaps with sample or fabricated data.
- Shared Redis rate limits; production requests fail closed if Redis is unavailable.
- Server-to-server `X-Infracis-API-Key` authentication for analysis endpoints.

## Run locally

Python 3.11+ is recommended.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements-lock.txt
cp .env.example .env
# Start Redis separately and configure REDIS_URL.
# Set APP_ENV=development and a long random INFRACIS_API_KEY.
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs are available at `http://127.0.0.1:8000/docs` in development only.

## Request

```http
POST /v1/analyze
Content-Type: application/json
X-Infracis-API-Key: <server-side secret>
```

Query input:

```json
{"query":"Connaught Place, New Delhi"}
```

Or a coordinate selection:

```json
{"latitude":28.6315,"longitude":77.2167,"label":"Selected map point"}
```

Coordinates and labels are user-provided inputs, not provider-verified address records. A query-based location is resolved by Nominatim. Weather and air-quality values are provider model outputs, not on-site measurements. Overpass amenity records represent mapped features only; absence from the result does not establish absence on the ground.

## Configuration

See `.env.example`. Production mode requires Redis and a configured API secret. Never put `INFRACIS_API_KEY`, Redis credentials, or Supabase service-role credentials in browser-visible variables. The backend does not yet implement report persistence or Supabase Auth; do not imply that it does.

## Verification

```bash
pytest -q
```

The pinned Linux/container dependency set is in `requirements-lock.txt`; `requirements.txt` documents the supported direct dependency ranges for deliberate lockfile updates. Backend CI installs the lockfile, runs `pip check`, audits the resolved environment with `pip-audit`, and runs the tests. The tests use a fake Redis client and mocked HTTP transports; they test validation and failure behavior without relying on live provider responses. Run the provider pilot separately for real-service verification.

## Provider policies

- Nominatim public service: no autocomplete; cache results, identify the application, and enforce at most one uncached request per second app-wide. The Redis gate in this service fails closed if it cannot reserve a slot.
- Open-Meteo: confirm the selected plan permits the intended non-commercial/commercial use and retain attribution.
- OpenStreetMap/Overpass: keep attribution visible in the UI and do not treat mapped amenities as complete or quality-verified.

This is backend source code prepared for later hosting—not evidence of a deployed or production-verified service.
