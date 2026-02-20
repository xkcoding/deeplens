## ADDED Requirements

### Requirement: Chat widget in Artifact panel
The Artifact panel SHALL contain a collapsible chat widget anchored to the bottom of the panel. The chat widget SHALL overlay the VitePress iframe when expanded. The widget SHALL have a toggle button visible at all times (even when collapsed).

#### Scenario: Expand chat widget
- **WHEN** the user clicks the chat toggle button
- **THEN** the chat widget expands to cover the bottom 40% of the Artifact panel, overlaying the iframe

#### Scenario: Collapse chat widget
- **WHEN** the user clicks the toggle button while the chat is expanded
- **THEN** the chat widget collapses back to a single-line bar

### Requirement: Fast/Deep mode tabs
The chat widget SHALL provide two mode tabs: "Fast" and "Deep". "Fast" mode SHALL send queries to `POST /api/search` (Layer 1 document RAG). "Deep" mode SHALL send queries to `POST /api/investigate` (Layer 2 code RAG + Agent Loop). The active mode SHALL be visually highlighted.

#### Scenario: Fast mode query
- **WHEN** the user types a question in Fast mode and presses Enter
- **THEN** the query is sent to `POST /api/search` and the response is streamed via SSE

#### Scenario: Deep mode query
- **WHEN** the user switches to Deep mode and submits a question
- **THEN** the query is sent to `POST /api/investigate` and the response includes tool call events

#### Scenario: Mode switching
- **WHEN** the user clicks the "Deep" tab while in "Fast" mode
- **THEN** the active tab switches to "Deep" and subsequent queries use the investigate endpoint

### Requirement: Streaming message display
The chat widget SHALL render incoming SSE `text-delta` events as incrementally appearing text in the assistant message bubble. The text SHALL be rendered as Markdown (supporting code blocks, bold, lists). The rendering SHALL be smooth without layout jitter.

#### Scenario: Streaming text response
- **WHEN** the sidecar streams `text-delta` events for a Fast Search response
- **THEN** the assistant message bubble incrementally displays the text as Markdown

#### Scenario: Code block in response
- **WHEN** the response contains a fenced code block
- **THEN** the code block is rendered with syntax highlighting

### Requirement: Source citations
After a response completes (SSE `done` event), the chat widget SHALL display source citations below the response. For Fast Search, sources are file paths from the `done` event's `sources` array. For Deep Search, sources are the tool calls made during the response.

#### Scenario: Fast Search sources
- **WHEN** a Fast Search response completes with `{ "sources": ["docs/auth.md", "docs/payment.md"] }`
- **THEN** the chat shows clickable source links below the response

#### Scenario: Click source link
- **WHEN** the user clicks a source citation link
- **THEN** the VitePress iframe navigates to the corresponding document page

### Requirement: Deep Search tool call display
In Deep mode, the chat widget SHALL display tool calls inline within the conversation. Each `tool_start` event SHALL render as a compact card showing the tool name and arguments. The `tool_end` event SHALL update the card with duration.

#### Scenario: Tool call inline display
- **WHEN** a Deep Search agent calls `search_code("auth middleware")`
- **THEN** the chat shows an inline card: "Searching code: auth middleware..." that updates to "Searched code: auth middleware (120ms)" on `tool_end`

### Requirement: Chat history persistence
Chat messages SHALL persist in React state for the current session. Switching between Fast and Deep modes SHALL NOT clear the chat history. Closing and reopening the chat widget SHALL preserve the history. Chat history SHALL be cleared when switching projects.

#### Scenario: Mode switch preserves history
- **WHEN** the user sends a message in Fast mode, switches to Deep mode, then switches back
- **THEN** the Fast mode message and response are still visible

### Requirement: Empty state and guard
The chat widget SHALL display a helpful empty state message: "Ask questions about the codebase. Use Fast for quick answers, Deep for detailed analysis." The chat input SHALL be disabled with a tooltip "Run analysis first" if no index exists (checked via `GET /api/status`).

#### Scenario: Chat before indexing
- **WHEN** the user opens the chat widget before running `deeplens index`
- **THEN** the input is disabled with tooltip "Run analysis first" and the empty state message is shown
