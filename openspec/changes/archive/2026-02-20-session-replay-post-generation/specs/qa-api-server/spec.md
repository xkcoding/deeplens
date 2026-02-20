## MODIFIED Requirements

### Requirement: Hono API server initialization
The system SHALL create a Hono application that serves the Q&A REST API. The server SHALL listen on a configurable port (default 3000, auto-incrementing if occupied). The server SHALL apply CORS middleware allowing all origins. The server SHALL include a `GET /health` endpoint that returns `{ "status": "ok" }`. The Q&A routes (`/api/search`, `/api/investigate`, `/api/status`) SHALL use a late-binding proxy pattern: catch-all routes are registered at startup, but delegate to a dynamically-created Hono sub-application. If the sub-application is not yet initialized, these routes SHALL return `503 { "error": "Not vectorized yet" }`.

#### Scenario: Start server on default port
- **WHEN** `deeplens serve` is executed and port 3000 is available
- **THEN** the Hono server starts on port 3000 and logs the URL

#### Scenario: Port conflict auto-resolution
- **WHEN** port 3000 is occupied
- **THEN** the server tries 3001, 3002, etc. until an available port is found

#### Scenario: Health check
- **WHEN** a client sends `GET /health`
- **THEN** the server responds with `200 { "status": "ok" }`

#### Scenario: Q&A routes before vectorization
- **WHEN** a client sends `POST /api/search` before any vectorization has been done and no `deeplens.db` exists
- **THEN** the server responds with `503 { "error": "Not vectorized yet" }`

#### Scenario: Q&A routes after vectorization
- **WHEN** `POST /api/vectorize` completes successfully
- **THEN** subsequent requests to `/api/search`, `/api/investigate`, and `/api/status` are handled by the dynamically-created Q&A sub-application

#### Scenario: Q&A routes with pre-existing database
- **WHEN** the sidecar starts and `deeplens.db` already exists
- **THEN** the Q&A sub-application is initialized immediately at startup and Q&A routes work without needing to vectorize
