## MODIFIED Requirements

### Requirement: Thought event rendering
`thought` events SHALL be rendered as text paragraphs with a subtle left border accent (e.g., blue). Long thoughts (>200 characters) SHALL be truncated with an expand/collapse toggle. Thoughts SHALL display a timestamp relative to the session start.

_No changes to this requirement._

### Requirement: Deep Search CoT in Flow panel
When the user submits a Deep Search query, the resulting `tool_start`/`tool_end`/`text-delta` events from `POST /api/investigate` SHALL be rendered in the Flow panel as a "Glass Box" investigation trace. This trace SHALL be visually grouped under a header showing the user's query.

_No changes to this requirement._

### Requirement: ThoughtChain reasoning display (MODIFIED)
The ThoughtChainList component's ReasoningRow SHALL display the **full reasoning text** when expanded, without any line clamping or truncation. The `line-clamp-3` CSS class SHALL be removed from the reasoning content. When collapsed, the reasoning row SHALL show a single-line preview (first ~100 characters) with an ellipsis to indicate more content is available.

#### Scenario: Expanded reasoning shows full text
- **WHEN** the user expands the ThoughtChain panel during or after a Deep Search
- **THEN** all reasoning entries display their complete text without truncation, regardless of length

#### Scenario: Collapsed reasoning shows preview
- **WHEN** the ThoughtChain panel is collapsed (default state after streaming completes)
- **THEN** the header shows summary ("Thought for X.Xs · N tools") and individual reasoning entries are hidden

#### Scenario: Long reasoning text
- **WHEN** a reasoning entry contains 2000+ characters of text
- **THEN** the expanded view shows all 2000+ characters with proper text wrapping, no line clamping

### Requirement: ThoughtChain tool duration display (MODIFIED)
Tool entries in the ThoughtChainList SHALL display execution duration when the tool completes. The duration SHALL be computed on the frontend as the time delta between `tool_start` and `tool_end` events (i.e., `Date.now()` at receipt of `tool_end` minus `Date.now()` at receipt of `tool_start`). While a tool is running, a spinner animation SHALL be displayed instead of the duration.

#### Scenario: Tool running indicator
- **WHEN** a `tool_start` event arrives and the corresponding `tool_end` has not yet been received
- **THEN** the tool entry shows a spinning indicator (e.g., `animate-spin` on a loader icon)

#### Scenario: Tool completion with duration
- **WHEN** a `tool_end` event arrives for a previously started tool
- **THEN** the spinner is replaced with a duration badge (e.g., "1.2s" or "850ms")
