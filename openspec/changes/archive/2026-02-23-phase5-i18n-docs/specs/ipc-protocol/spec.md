## ADDED Requirements

### Requirement: SSE translate phase events
The `POST /api/analyze` endpoint SSE stream SHALL emit a `progress` event with `{ phase: "translate", status: "started" }` before translation begins, and translation-related `progress`, `thought`, `tool_start`, and `doc_written` events during translation. The stream SHALL emit these events AFTER the summary phase completes and BEFORE the `done` event.

#### Scenario: Translate phase in analyze stream
- **WHEN** the summary phase completes during an analyze operation
- **THEN** the SSE stream emits `progress` with `{ phase: "translate", status: "started" }` followed by translation events

#### Scenario: Translation progress events
- **WHEN** 3 out of 5 domains have been translated
- **THEN** a `progress` event with `{ phase: "translate", completed: 3, total: 5 }` is emitted

#### Scenario: Translation doc_written events
- **WHEN** a Chinese document `zh/domains/auth/index.md` is written
- **THEN** a `doc_written` event is emitted with `{ path: "zh/domains/auth/index.md", content: "..." }`

### Requirement: Console logging for all phases
The Sidecar `analyze.ts` route SHALL emit `console.log` messages at the start of each phase for Tauri process monitoring. Each phase SHALL log in the format `[analyze] Starting <phase>...`.

#### Scenario: Explore phase logging
- **WHEN** the explore phase begins
- **THEN** `console.log("[analyze] Starting explorer...")` is emitted (already exists)

#### Scenario: Generate phase logging
- **WHEN** the generate phase begins
- **THEN** `console.log("[analyze] Starting generator...")` is emitted

#### Scenario: Overview phase logging
- **WHEN** the overview phase begins
- **THEN** `console.log("[analyze] Starting overview generator...")` is emitted

#### Scenario: Summary phase logging
- **WHEN** the summary phase begins
- **THEN** `console.log("[analyze] Starting summary generator...")` is emitted

#### Scenario: Translate phase logging
- **WHEN** the translate phase begins
- **THEN** `console.log("[analyze] Starting translator...")` is emitted

### Requirement: UI six-step phase state machine
The desktop UI `ActivitySidebar` SHALL display 6 phase steps: Explore, Outline Review, Generate, Overview, Summary, Translate. The phase index mapping SHALL be: explore=0, outline_review=1, generate=2, overview=3, summary=4, translate=5. The `AppHeader` progress button and `useAgentStream` hook SHALL handle the `translate` phase identically to existing phases.

#### Scenario: Translate phase displayed in sidebar
- **WHEN** the analyze pipeline reaches the translate phase
- **THEN** the ActivitySidebar shows steps 1-5 as completed and step 6 (Translate) as active

#### Scenario: Translate phase in header
- **WHEN** progress phase is "translate"
- **THEN** the AppHeader progress button displays "Translating..." label

#### Scenario: All phases pending initially
- **WHEN** no analysis is running
- **THEN** the ActivitySidebar shows all 6 steps (including Translate) as pending
