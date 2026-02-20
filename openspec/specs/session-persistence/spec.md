## ADDED Requirements

### Requirement: Session event stream persistence
The analyze route SHALL append every SSE event to `<projectRoot>/.deeplens/session.jsonl` as a JSONL line with format `{ "ts": <unix_ms>, "event": "<event_type>", "data": <event_data> }`. The system SHALL use `fs.appendFile` for each event. The system SHALL ensure the `.deeplens/` directory exists before writing.

#### Scenario: Events written during analysis
- **WHEN** the analyze pipeline runs and emits events (thought, tool_start, tool_end, progress, outline_ready, waiting, doc_written, section_ready, done, error)
- **THEN** each event is appended as a JSON line to `.deeplens/session.jsonl` with a `ts` timestamp

#### Scenario: doc_written events store path only
- **WHEN** a `doc_written` event is written to session.jsonl
- **THEN** the data field SHALL contain only `{ "path": "<relative_path>" }` without the `content` field

#### Scenario: Non doc_written events store full data
- **WHEN** any event other than `doc_written` is written to session.jsonl
- **THEN** the data field SHALL contain the complete original event data

### Requirement: Outline confirmed event persistence
The analyze route SHALL write an `outline_confirmed` event to session.jsonl when the user confirms the outline via `POST /api/outline/confirm`. The event data SHALL contain the full confirmed outline object.

#### Scenario: Outline confirmation recorded
- **WHEN** the user confirms the outline
- **THEN** a line `{ "ts": ..., "event": "outline_confirmed", "data": { "outline": <confirmed_outline> } }` is appended to session.jsonl

### Requirement: Session reset on new analysis
The analyze route SHALL truncate (overwrite with empty content) the existing `session.jsonl` at the beginning of a new analysis before writing any new events.

#### Scenario: Re-analysis clears old session
- **WHEN** the user clicks Analyze on a project that already has a session.jsonl
- **THEN** the old session.jsonl is cleared before the new analysis events are written

### Requirement: Outline JSON persistence in sidecar mode
The analyze route SHALL save the confirmed outline to `<projectRoot>/.deeplens/outline.json` after the user confirms the outline. This matches existing CLI behavior.

#### Scenario: Outline saved after confirmation
- **WHEN** the user confirms the outline in sidecar (GUI) mode
- **THEN** `outline.json` is written to `.deeplens/` with the confirmed outline JSON (pretty-printed)

### Requirement: Session read API
The sidecar server SHALL expose `GET /api/session?projectPath=<path>` that reads and returns the session.jsonl contents. The response SHALL be `{ "exists": true, "events": [...] }` if the file exists, or `{ "exists": false, "events": [] }` if not.

#### Scenario: Session exists
- **WHEN** a client requests `GET /api/session?projectPath=/path/to/project` and session.jsonl exists
- **THEN** the server responds with `{ "exists": true, "events": [<parsed_jsonl_lines>] }`

#### Scenario: No session exists
- **WHEN** a client requests `GET /api/session` and session.jsonl does not exist
- **THEN** the server responds with `{ "exists": false, "events": [] }`

### Requirement: Docs batch read API
The sidecar server SHALL expose `POST /api/docs/read` accepting `{ "projectPath": string, "paths": string[] }`. The endpoint SHALL read each file from `<projectPath>/.deeplens/docs/<path>` and return `{ "files": { "<path>": "<content>", ... } }`. Missing files SHALL be silently skipped.

#### Scenario: Batch read existing docs
- **WHEN** a client sends `POST /api/docs/read` with paths `["domains/auth/index.md", "domains/api/index.md"]`
- **THEN** the server reads each file and returns their contents in the `files` map

#### Scenario: Some files missing
- **WHEN** a client requests docs and one path does not exist on disk
- **THEN** the missing path is omitted from the `files` map without error

### Requirement: Frontend session replay
The `useAgentStream` hook SHALL expose a `replaySession` method that accepts an array of raw session events. The method SHALL process all events synchronously using a pure `applyEvent` function, collect `doc_written` paths, batch-fetch file contents via `POST /api/docs/read`, fill the documents map, and set the final state with `isRunning: false` and `isWaiting: false`.

#### Scenario: Replay restores full UI state
- **WHEN** the user opens a previously analyzed project
- **THEN** the frontend fetches `GET /api/session`, calls `replaySession`, and the UI shows the complete document tree, phase stepper at "done", and document preview with content

#### Scenario: Replay with missing docs gracefully degrades
- **WHEN** replay encounters doc_written events but some files are missing from disk
- **THEN** the documents map contains only the files that exist; missing docs show empty preview

### Requirement: Automatic session loading on project open
When a project is selected in the GUI, the `App.tsx` component SHALL automatically fetch `GET /api/session` and call `replaySession` if events exist. Session loading failure SHALL be silently caught without affecting normal usage.

#### Scenario: Project with existing session
- **WHEN** the user selects a project that has a `.deeplens/session.jsonl`
- **THEN** the UI automatically restores the last analysis state

#### Scenario: Project without session
- **WHEN** the user selects a project with no session.jsonl
- **THEN** the UI shows the default empty state, no errors

#### Scenario: Session loading failure
- **WHEN** the session API call fails (network error, malformed data)
- **THEN** the error is caught silently and the UI remains in default empty state
