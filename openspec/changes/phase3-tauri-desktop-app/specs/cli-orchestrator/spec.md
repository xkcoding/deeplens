## ADDED Requirements

### Requirement: sidecar command
The system SHALL provide a `deeplens sidecar [project-path]` command that starts the Node.js process in HTTP server mode. This command SHALL start the Hono API server with all existing endpoints (`/health`, `/api/search`, `/api/investigate`, `/api/status`) plus new pipeline endpoints (`/api/explore`, `/api/generate`, `/api/analyze`, `/api/outline`, `/api/outline/confirm`, `/api/shutdown`, `/api/reload-config`). The command SHALL accept `--port <number>` to specify the API server port (default: auto-detect from 54321). If `project-path` has existing docs, it SHALL also start the VitePress dev server.

#### Scenario: Start sidecar mode
- **WHEN** user runs `deeplens sidecar ./my-project --port 54321`
- **THEN** the Hono API server starts on port 54321 with all endpoints available and `GET /health` returns `{ "status": "ok" }`

#### Scenario: Sidecar with existing docs
- **WHEN** user runs `deeplens sidecar ./my-project` and `./my-project/.deeplens/docs/` exists
- **THEN** the API server starts AND the VitePress dev server starts on an auto-detected port

#### Scenario: Sidecar without project path
- **WHEN** user runs `deeplens sidecar` without specifying a project path
- **THEN** the server starts in standby mode and waits for a project path to be specified via `POST /api/analyze` or `POST /api/explore`

### Requirement: Pipeline API routes
In sidecar mode, the Hono server SHALL register the following additional routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/explore` | POST | Trigger exploration, returns SSE stream |
| `POST /api/generate` | POST | Trigger generation, returns SSE stream |
| `POST /api/analyze` | POST | Full pipeline, returns SSE stream |
| `GET /api/outline` | GET | Get current outline JSON |
| `POST /api/outline/confirm` | POST | Confirm/submit edited outline |
| `POST /api/shutdown` | POST | Graceful shutdown |
| `POST /api/reload-config` | POST | Reload configuration |

These routes SHALL only be registered in sidecar mode, not in the existing `serve` command.

#### Scenario: Pipeline routes available in sidecar mode
- **WHEN** the server runs via `deeplens sidecar`
- **THEN** `POST /api/analyze` returns a `200` SSE stream response

#### Scenario: Pipeline routes unavailable in serve mode
- **WHEN** the server runs via `deeplens serve`
- **THEN** `POST /api/analyze` returns `404`

### Requirement: Sidecar graceful shutdown
The sidecar command SHALL handle `POST /api/shutdown`, `SIGINT`, and `SIGTERM` signals for graceful shutdown. On any shutdown trigger, the system SHALL close the VectorStore database, stop the VitePress subprocess, close the HTTP server, and exit with code 0.

#### Scenario: Shutdown via API
- **WHEN** `POST /api/shutdown` is received
- **THEN** all resources are closed and the process exits with code 0

#### Scenario: Shutdown via SIGTERM
- **WHEN** the sidecar receives SIGTERM (e.g., from Tauri killing the process)
- **THEN** all resources are closed gracefully before process exit

## MODIFIED Requirements

### Requirement: Environment configuration
The system SHALL load configuration from a `.env` file (if present) and environment variables. Required configuration: `ANTHROPIC_API_KEY`. Optional configuration: `ANTHROPIC_BASE_URL` (default: Anthropic official endpoint). The system SHALL validate that required configuration is present before any Agent invocation and display a clear error message if missing. In sidecar mode, configuration SHALL be injected by the Tauri shell via environment variables at spawn time. The `POST /api/reload-config` endpoint SHALL re-read environment variables and update the in-memory `DeepLensConfig` without restarting the process.

#### Scenario: Missing API key
- **WHEN** user runs any Agent command without `ANTHROPIC_API_KEY` set
- **THEN** the system exits with a clear error: "ANTHROPIC_API_KEY is required. Set it in .env or as an environment variable."

#### Scenario: Custom API base URL
- **WHEN** `ANTHROPIC_BASE_URL` is set to a custom endpoint (e.g., a Coding Plan proxy)
- **THEN** the claude-agent-sdk uses that endpoint for all API calls

#### Scenario: .env file loading
- **WHEN** a `.env` file exists in the current directory or project root
- **THEN** its values are loaded as environment variables (lower priority than actual env vars)

#### Scenario: Config reload in sidecar mode
- **WHEN** the Tauri shell calls `POST /api/reload-config` after updating configuration
- **THEN** the sidecar re-reads all config environment variables and updates its in-memory DeepLensConfig

### Requirement: Real-time progress display
The system SHALL display Agent activity in real-time during both exploration and generation phases. In CLI mode, tool calls SHALL be printed as they occur (e.g., `🔧 list_files("src/")`). In sidecar mode, the same events SHALL be emitted as SSE events on the pipeline endpoint streams. Agent reasoning SHALL be displayed when available. Errors and retries SHALL be clearly indicated.

#### Scenario: Tool call logging (CLI mode)
- **WHEN** the Agent calls `read_file("src/main.ts")` during exploration in CLI mode
- **THEN** the terminal shows `  🔧 read_file(src/main.ts)` in real-time

#### Scenario: Tool call event (Sidecar mode)
- **WHEN** the Agent calls `read_file("src/main.ts")` during exploration in sidecar mode
- **THEN** the SSE stream emits `tool_start` event with `{ "tool": "read_file", "args": { "path": "src/main.ts" } }`

#### Scenario: Generation progress (CLI mode)
- **WHEN** the Agent completes writing a hub document in CLI mode
- **THEN** the terminal shows `  📝 wrote domains/user-auth/index.md`

#### Scenario: Generation progress (Sidecar mode)
- **WHEN** the Agent completes writing a hub document in sidecar mode
- **THEN** the SSE stream emits `section_ready` event with `{ "target_file": "domains/user-auth/index.md", "domain_id": "user-auth" }`

#### Scenario: Error with retry
- **WHEN** the Agent produces invalid JSON and the system retries
- **THEN** the terminal shows `  ⚠️ Invalid output, retrying (1/2)...` (CLI) or the SSE stream emits an `error` event (sidecar)
