## MODIFIED Requirements

### Requirement: User confirmation flow
The system SHALL prompt the user to confirm the outline before proceeding to generation. In CLI mode, the user SHALL have the following options: (1) Accept the outline as-is, (2) Edit the outline JSON file manually, (3) Re-run exploration with a different strategy, (4) Abort. After manual editing, the system SHALL re-validate the JSON against the Zod schema. In Sidecar mode (HTTP), the outline SHALL be delivered via SSE `outline_ready` event and confirmed via `POST /api/outline/confirm`. The sidecar SHALL enter a waiting state (SSE `waiting` event) until the outline is confirmed or a re-explore is triggered.

#### Scenario: User accepts outline (CLI mode)
- **WHEN** user selects "Accept" in CLI mode
- **THEN** the outline is saved to `.deeplens/outline.json` and the generation phase begins

#### Scenario: User chooses to edit (CLI mode)
- **WHEN** user selects "Edit" in CLI mode
- **THEN** the system saves the outline to `.deeplens/outline.json`, opens it (prints the path), and waits for user to press Enter after editing

#### Scenario: Edited outline fails validation (CLI mode)
- **WHEN** user edits the outline JSON and the result fails Zod validation in CLI mode
- **THEN** the system displays the validation errors and prompts the user to fix them

#### Scenario: User aborts (CLI mode)
- **WHEN** user selects "Abort" in CLI mode
- **THEN** the system exits without generating documents, preserving the outline file for later use

#### Scenario: Outline delivery via SSE (Sidecar mode)
- **WHEN** exploration completes in sidecar mode
- **THEN** the SSE stream emits `outline_ready` with the outline JSON, followed by `waiting` with `{ "for": "outline_confirm" }`

#### Scenario: Outline confirmation via HTTP (Sidecar mode)
- **WHEN** the frontend sends `POST /api/outline/confirm` with a valid edited outline
- **THEN** the outline is saved to `.deeplens/outline.json`, the sidecar resolves the waiting state, and generation begins

#### Scenario: Invalid outline confirmation (Sidecar mode)
- **WHEN** the frontend sends `POST /api/outline/confirm` with an outline that fails Zod validation
- **THEN** the response is `400` with Zod validation errors and the sidecar remains in waiting state

## ADDED Requirements

### Requirement: Sidecar outline waiting mechanism
In sidecar mode, the outline review flow SHALL use an async Promise-based waiting mechanism. After the exploration agent produces an outline, the pipeline SHALL await a `Promise<Outline>` that is resolved when `POST /api/outline/confirm` is called with a valid outline. This allows the SSE stream to remain open while waiting for user action.

#### Scenario: Pipeline waits for confirmation
- **WHEN** exploration completes and the outline is ready
- **THEN** the pipeline pauses at the `await outlineConfirmed` point, keeping the SSE stream alive with periodic keepalive comments

#### Scenario: Outline confirmed resumes pipeline
- **WHEN** `POST /api/outline/confirm` resolves the waiting Promise
- **THEN** the pipeline continues with the confirmed outline and begins emitting generation events on the same SSE stream
