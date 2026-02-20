## ADDED Requirements

### Requirement: SSE event protocol for exploration
The `POST /api/explore` endpoint SHALL accept `{ "projectPath": string }` and return an SSE stream. The stream SHALL emit events in the following order during exploration: `thought` (Agent reasoning text), `tool_start` (before each MCP tool call), `tool_end` (after each MCP tool call), `progress` (phase progress), and either `outline_ready` (success with outline JSON) or `error` (failure).

#### Scenario: Successful exploration stream
- **WHEN** the frontend sends `POST /api/explore` with a valid project path
- **THEN** the SSE stream emits `thought`, `tool_start`/`tool_end` pairs, and concludes with `outline_ready` containing the JSON outline

#### Scenario: Exploration failure
- **WHEN** the exploration agent fails after all retries
- **THEN** the SSE stream emits an `error` event with `{ "message": "...", "phase": "explore" }` and closes

### Requirement: SSE event protocol for generation
The `POST /api/generate` endpoint SHALL accept `{ "projectPath": string, "outline": object }` and return an SSE stream. The stream SHALL emit: `thought`, `tool_start`/`tool_end`, `section_ready` (when a domain document is written), `progress` (completed/total domains), and `done` upon completion.

#### Scenario: Generation with progress
- **WHEN** the frontend sends `POST /api/generate` with a confirmed outline containing 5 domains
- **THEN** the SSE stream emits 5 `section_ready` events (one per domain) interspersed with `thought` and `tool_start`/`tool_end` events, followed by a `done` event

### Requirement: SSE event protocol for full pipeline
The `POST /api/analyze` endpoint SHALL accept `{ "projectPath": string }` and return a long-running SSE stream that covers the full pipeline: explore → wait for outline confirmation → generate → index. After emitting `outline_ready`, the stream SHALL emit a `waiting` event with `{ "for": "outline_confirm" }` and pause until `POST /api/outline/confirm` is called.

#### Scenario: Full pipeline with outline confirmation
- **WHEN** the frontend sends `POST /api/analyze`
- **THEN** the stream emits exploration events, then `outline_ready`, then `waiting`, and resumes with generation events after `POST /api/outline/confirm` is called

#### Scenario: Pipeline interrupted during waiting
- **WHEN** the SSE connection drops while the pipeline is in `waiting` state
- **THEN** the pipeline preserves the outline on disk and can be resumed by calling `POST /api/generate` with the saved outline

### Requirement: Unified SSE event format
All SSE events SHALL use the following JSON data formats:

| Event | Data Schema |
|-------|-------------|
| `thought` | `{ "content": string }` |
| `tool_start` | `{ "tool": string, "args": object }` |
| `tool_end` | `{ "tool": string, "duration_ms": number }` |
| `outline_ready` | `{ "outline": Outline }` |
| `section_ready` | `{ "target_file": string, "domain_id": string }` |
| `progress` | `{ "phase": "explore"\|"generate"\|"index", "completed": number, "total": number }` |
| `done` | `{ "phase": "explore"\|"generate"\|"index" }` |
| `error` | `{ "message": string, "phase": string }` |
| `waiting` | `{ "for": string }` |
| `text-delta` | `string` (raw text chunk, for search streams) |

#### Scenario: Event data is valid JSON
- **WHEN** the frontend parses any SSE event data field
- **THEN** the data is valid JSON (except `text-delta` which is a raw string)

### Requirement: Outline API endpoints
The system SHALL expose `GET /api/outline` returning the current outline as JSON (or 404 if none exists) and `POST /api/outline/confirm` accepting `{ "outline": Outline }` that validates against the Zod schema, persists to `.deeplens/outline.json`, and resolves the pipeline's waiting state.

#### Scenario: Fetch current outline
- **WHEN** exploration has completed and the frontend calls `GET /api/outline`
- **THEN** the response is `200` with the outline JSON body

#### Scenario: Fetch outline before exploration
- **WHEN** the frontend calls `GET /api/outline` before any exploration has run
- **THEN** the response is `404` with `{ "error": "No outline available" }`

#### Scenario: Confirm valid outline
- **WHEN** the frontend sends `POST /api/outline/confirm` with a valid outline
- **THEN** the response is `200` with `{ "status": "confirmed" }` and the pipeline resumes

#### Scenario: Confirm invalid outline
- **WHEN** the frontend sends `POST /api/outline/confirm` with an outline that fails Zod validation
- **THEN** the response is `400` with `{ "error": [Zod issues] }`

### Requirement: Existing search SSE compatibility
The existing `POST /api/search` and `POST /api/investigate` endpoints SHALL continue to use their current SSE event formats (`text-delta`, `tool_start`, `tool_end`, `done`). The new pipeline events (`thought`, `outline_ready`, `section_ready`, `waiting`) SHALL only appear on the new pipeline endpoints.

#### Scenario: Search endpoints unchanged
- **WHEN** the frontend calls `POST /api/search` or `POST /api/investigate`
- **THEN** the SSE events match the existing Phase 2 format exactly

### Requirement: Config reload endpoint
The system SHALL expose a `POST /api/reload-config` endpoint. When called, the sidecar SHALL re-read environment variables and update its in-memory `DeepLensConfig` object. This enables the Tauri shell to inject updated configuration without restarting the sidecar.

#### Scenario: Reload config after settings change
- **WHEN** the frontend changes a setting and Tauri calls `POST /api/reload-config`
- **THEN** the sidecar updates its config and subsequent operations use the new values
