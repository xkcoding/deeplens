## ADDED Requirements

### Requirement: SSE event protocol for incremental update
The `POST /api/update` endpoint SHALL accept `{ "projectPath": string, "full"?: boolean }` and return an SSE stream. The stream SHALL emit events in the following order:

| Event | Data Schema | When |
|-------|-------------|------|
| `diff_start` | `{ "lastCommit": string, "headCommit": string }` | Git diff begins |
| `diff_result` | `{ "changedFiles": string[], "count": number }` | Changed files identified |
| `impact_summary` | `{ "affectedDomains": string[], "unchangedDomains": string[], "untrackedFiles": string[] }` | Impact tracing complete |
| `progress` | `{ "phase": "update", "completed": number, "total": number }` | Domain regeneration progress |
| `section_ready` | `{ "target_file": string, "domain_id": string }` | A domain's docs regenerated |
| `index_update` | `{ "domain_id": string, "deletedChunks": number, "insertedChunks": number }` | Vector index updated for a domain |
| `done` | `{ "phase": "update", "affectedDomains": number, "newCommit": string }` | Update complete |
| `error` | `{ "message": string, "phase": "update" }` | Failure |

#### Scenario: Incremental update stream
- **WHEN** the frontend calls `POST /api/update` with a valid project path
- **THEN** the SSE stream emits `diff_start`, `diff_result`, `impact_summary`, per-domain `progress`/`section_ready`/`index_update` events, and concludes with `done`

#### Scenario: No changes detected
- **WHEN** `git diff` returns empty (HEAD equals last analyzed commit)
- **THEN** the stream emits `diff_result` with `count: 0` followed immediately by `done` with `affectedDomains: 0`

#### Scenario: Full re-analysis via API
- **WHEN** the frontend calls `POST /api/update` with `{ "projectPath": "...", "full": true }`
- **THEN** the system ignores the last analyzed commit and runs the full pipeline, emitting standard pipeline events

### Requirement: SSE event protocol for static export
The `POST /api/export` endpoint SHALL accept `{ "projectPath": string, "outputDir"?: string }` and return an SSE stream. The stream SHALL emit:

| Event | Data Schema | When |
|-------|-------------|------|
| `build_start` | `{ "docsDir": string }` | VitePress build begins |
| `build_log` | `{ "line": string }` | Stdout line from vitepress build |
| `build_complete` | `{ "distDir": string }` | Build finished successfully |
| `copy_start` | `{ "from": string, "to": string }` | Copying to output directory (if custom) |
| `done` | `{ "outputDir": string }` | Export complete |
| `error` | `{ "message": string, "phase": "export" }` | Failure |

#### Scenario: Export stream with default output
- **WHEN** the frontend calls `POST /api/export` with only `projectPath`
- **THEN** the stream emits `build_start`, `build_log` lines, `build_complete`, and `done` with the default dist path

#### Scenario: Export stream with custom output
- **WHEN** the frontend calls `POST /api/export` with `outputDir` specified
- **THEN** the stream additionally emits `copy_start` between `build_complete` and `done`

### Requirement: Visualize data flow endpoint
The `POST /api/visualize` endpoint SHALL accept `{ "projectPath": string, "scenario": string, "detailLevel"?: "high-level" | "detailed" }` and return a JSON response `{ "mermaid": string }`. The endpoint SHALL use the project outline and RAG context to construct a prompt, then call the configured LLM to generate a Mermaid data flow diagram for the specified scenario.

#### Scenario: Generate data flow diagram
- **WHEN** the frontend calls `POST /api/visualize` with `{ "projectPath": "/my/project", "scenario": "user login flow" }`
- **THEN** the response contains `{ "mermaid": "graph TD\n  A[User] --> B[Login Page]..." }`

#### Scenario: Visualize with detail level
- **WHEN** the request includes `"detailLevel": "detailed"`
- **THEN** the generated Mermaid diagram includes implementation-level details (function names, data transformations)

#### Scenario: Visualize without analysis
- **WHEN** the project has no outline or docs
- **THEN** the endpoint returns `400` with `{ "error": "No analysis available. Run analysis first." }`

### Requirement: Search endpoints with history
The existing `POST /api/search` and `POST /api/investigate` endpoints SHALL accept an expanded request body `{ "query": string, "messages"?: Array<{ role: "user" | "assistant", content: string }> }`. The `messages` field is optional for backward compatibility. When provided, the `messages` array SHALL be passed as conversation history to the underlying `fastSearch()` or `deepSearch()` function.

#### Scenario: Search with history
- **WHEN** the frontend calls `POST /api/search` with `{ "query": "What about JWT?", "messages": [{"role":"user","content":"How does auth work?"},{"role":"assistant","content":"Auth uses..."}] }`
- **THEN** the search function receives the history and uses it for multi-turn context

#### Scenario: Search without history (backward compatible)
- **WHEN** the frontend calls `POST /api/search` with `{ "query": "How does auth work?" }` (no messages field)
- **THEN** the search function works identically to the current single-turn behavior
