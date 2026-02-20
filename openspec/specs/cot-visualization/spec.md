## ADDED Requirements

### Requirement: Real-time event rendering in Flow panel
The Flow panel SHALL render Agent events from all SSE streams (exploration, generation, search) in real-time as a chronological timeline. New events SHALL appear at the bottom of the timeline with smooth scroll-to-bottom behavior. The user SHALL be able to scroll up to review past events without auto-scroll disrupting their position.

#### Scenario: Auto-scroll on new event
- **WHEN** the user is at the bottom of the Flow panel and a new event arrives
- **THEN** the panel auto-scrolls to show the new event

#### Scenario: Manual scroll position preserved
- **WHEN** the user scrolls up to review past events and new events arrive
- **THEN** the scroll position remains where the user left it, and a "Jump to latest" button appears

### Requirement: Thought event rendering
`thought` events SHALL be rendered as text paragraphs with a subtle left border accent (e.g., blue). Long thoughts (>200 characters) SHALL be truncated with an expand/collapse toggle. Thoughts SHALL display a timestamp relative to the session start.

#### Scenario: Display thought event
- **WHEN** the SSE stream emits `thought` with content "Detected Spring Boot project structure with 3 modules..."
- **THEN** the Flow panel appends a styled text block with the thought content and a relative timestamp

### Requirement: Tool call event rendering
`tool_start` events SHALL be rendered as compact cards showing a wrench icon, tool name, and abbreviated arguments. On `tool_end`, the card SHALL update to show the duration badge (e.g., "120ms" in a pill). The card SHALL be expandable to reveal full arguments JSON.

#### Scenario: Tool call card lifecycle
- **WHEN** `tool_start` with `{ "tool": "read_file", "args": { "path": "src/main.ts" } }` arrives
- **THEN** a card appears: "read_file — src/main.ts" with a spinning indicator

#### Scenario: Tool call completion
- **WHEN** `tool_end` with `{ "tool": "read_file", "duration_ms": 85 }` arrives
- **THEN** the spinning indicator on the matching card is replaced with a "85ms" duration badge

### Requirement: Progress bar rendering
`progress` events SHALL be rendered as a horizontal progress bar spanning the full Flow panel width. The bar SHALL show the phase label ("Exploring" / "Generating" / "Indexing"), completed count, and total count. The bar SHALL update in place (not create new elements).

#### Scenario: Generation progress update
- **WHEN** the stream emits `progress` with `{ "phase": "generate", "completed": 3, "total": 8 }`
- **THEN** the progress bar shows "Generating 3/8" at 37.5% fill

### Requirement: Error event rendering
`error` events SHALL be rendered as red-highlighted blocks with an error icon. The block SHALL display the error message and the phase in which it occurred. Error blocks SHALL not be auto-collapsed.

#### Scenario: Display error event
- **WHEN** the stream emits `error` with `{ "message": "Agent exceeded max turns", "phase": "explore" }`
- **THEN** a red error block appears: "Exploration Error: Agent exceeded max turns"

### Requirement: Phase separators
When a new phase begins (indicated by a `progress` event with `completed: 0` or a `done` event followed by a new phase), the Flow panel SHALL insert a visual phase separator: a horizontal line with the phase name (e.g., "Generation Phase").

#### Scenario: Phase transition
- **WHEN** the exploration phase completes and generation begins
- **THEN** a separator line "Generation Phase" appears between the exploration and generation events

### Requirement: Deep Search CoT in Flow panel
When the user submits a Deep Search query, the resulting `tool_start`/`tool_end`/`text-delta` events from `POST /api/investigate` SHALL be rendered in the Flow panel as a "Glass Box" investigation trace. This trace SHALL be visually grouped under a header showing the user's query.

#### Scenario: Deep Search events in Flow panel
- **WHEN** the user asks "How does the auth middleware validate tokens?" in Deep mode
- **THEN** the Flow panel shows a grouped section: query header, followed by tool calls and reasoning text as they arrive

### Requirement: Flow panel clear and filter
The Flow panel SHALL provide a "Clear" button to reset the event timeline. It SHALL also provide filter toggles to show/hide specific event types (thoughts, tools, errors). Filters SHALL persist during the session.

#### Scenario: Filter out tool events
- **WHEN** the user toggles off the "Tools" filter
- **THEN** all `tool_start`/`tool_end` cards are hidden from the timeline, but thoughts and progress remain visible
