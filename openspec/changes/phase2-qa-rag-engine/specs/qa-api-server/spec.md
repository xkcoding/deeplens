## ADDED Requirements

### Requirement: Hono API server initialization
The system SHALL create a Hono application that serves the Q&A REST API. The server SHALL listen on a configurable port (default 3000, auto-incrementing if occupied). The server SHALL apply CORS middleware allowing all origins. The server SHALL include a `GET /health` endpoint that returns `{ "status": "ok" }`.

#### Scenario: Start server on default port
- **WHEN** `deeplens serve` is executed and port 3000 is available
- **THEN** the Hono server starts on port 3000 and logs the URL

#### Scenario: Port conflict auto-resolution
- **WHEN** port 3000 is occupied
- **THEN** the server tries 3001, 3002, etc. until an available port is found

#### Scenario: Health check
- **WHEN** a client sends `GET /health`
- **THEN** the server responds with `200 { "status": "ok" }`

### Requirement: POST /api/search (Fast Search)
The system SHALL expose `POST /api/search` that accepts `{ "query": string }` as JSON body. The endpoint SHALL invoke the Fast Search pipeline and return results as an SSE stream (`Content-Type: text/event-stream`). If the request body is invalid (missing `query`), the endpoint SHALL return `400` with an error message.

#### Scenario: Valid search request
- **WHEN** a client sends `POST /api/search` with `{ "query": "How does auth work?" }`
- **THEN** the server streams SSE events: multiple `text-delta` events followed by a `done` event

#### Scenario: Missing query field
- **WHEN** a client sends `POST /api/search` with `{}` or no body
- **THEN** the server responds with `400 { "error": "query is required" }`

#### Scenario: Index not built
- **WHEN** a search is performed but the vector store has no data
- **THEN** the server responds with `400 { "error": "Index not found. Run 'deeplens index' first." }`

### Requirement: POST /api/investigate (Deep Search)
The system SHALL expose `POST /api/investigate` that accepts `{ "query": string }` as JSON body. The endpoint SHALL invoke the Deep Search Agent Loop and return results as an SSE stream. The stream SHALL include `tool_start`, `tool_end`, `text-delta`, and `done` event types.

#### Scenario: Valid investigate request
- **WHEN** a client sends `POST /api/investigate` with `{ "query": "Explain the data flow from API to DB" }`
- **THEN** the server streams SSE events showing tool calls and the final answer

#### Scenario: Long-running investigation
- **WHEN** the Deep Search Agent takes multiple steps
- **THEN** `tool_start`/`tool_end` events are streamed in real-time so the client can show progress

### Requirement: GET /api/status (Index status)
The system SHALL expose `GET /api/status` that returns the current indexing state. The response SHALL include: total chunk count, total indexed files, last indexed timestamp, and the embedding model name.

#### Scenario: Index exists
- **WHEN** a client sends `GET /api/status` after indexing
- **THEN** the server responds with `200 { "totalChunks": 150, "totalFiles": 12, "lastIndexed": "2026-02-19T10:00:00Z", "embedModel": "Qwen/Qwen3-Embedding-8B" }`

#### Scenario: No index exists
- **WHEN** a client sends `GET /api/status` before any indexing
- **THEN** the server responds with `200 { "totalChunks": 0, "totalFiles": 0, "lastIndexed": null, "embedModel": "Qwen/Qwen3-Embedding-8B" }`

### Requirement: CLI `deeplens index` command
The system SHALL add a `deeplens index <project-path>` CLI command that triggers the indexing pipeline. The command SHALL validate that `SILICONFLOW_API_KEY` is configured before proceeding. The command SHALL display progress during indexing and a summary upon completion (files processed, chunks created, time elapsed).

#### Scenario: Successful indexing
- **WHEN** `deeplens index ./my-project` is run with valid configuration
- **THEN** the CLI displays progress, then shows "Indexed 12 files, 150 chunks in 8.3s"

#### Scenario: Missing SiliconFlow API key
- **WHEN** `deeplens index` is run without `SILICONFLOW_API_KEY` set
- **THEN** the CLI exits with an error: "SILICONFLOW_API_KEY is required for indexing"

### Requirement: CLI `deeplens serve` command
The system SHALL add a `deeplens serve [project-path]` CLI command that starts both the Hono API server and optionally the VitePress preview server. The command SHALL accept `--api-port` and `--docs-port` options. The command SHALL validate that `SILICONFLOW_API_KEY` is configured. The command SHALL handle `SIGINT`/`SIGTERM` for graceful shutdown of both servers.

#### Scenario: Start both API and docs servers
- **WHEN** `deeplens serve ./my-project` is run
- **THEN** the Hono API server starts (default port 3000) and VitePress starts (default port 5173)
- **AND** both URLs are displayed in the terminal

#### Scenario: Custom ports
- **WHEN** `deeplens serve --api-port 8080 --docs-port 4000` is run
- **THEN** the API server starts on 8080 and VitePress on 4000

#### Scenario: Graceful shutdown
- **WHEN** the user presses Ctrl+C
- **THEN** both the Hono server and VitePress dev server are stopped gracefully

### Requirement: Error handling middleware
The system SHALL include error handling middleware in the Hono app that catches unhandled exceptions and returns structured JSON error responses. Internal errors SHALL return `500 { "error": "Internal server error" }` without exposing stack traces.

#### Scenario: Unhandled exception in route
- **WHEN** a route handler throws an unexpected error
- **THEN** the middleware catches it and returns `500 { "error": "Internal server error" }`

#### Scenario: SiliconFlow API timeout
- **WHEN** the SiliconFlow API does not respond within 30 seconds
- **THEN** the request fails with `502 { "error": "Upstream API timeout" }`
