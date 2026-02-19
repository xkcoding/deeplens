## ADDED Requirements

### Requirement: Deep Search Agent Loop
The system SHALL provide a Deep Search function that uses the Vercel AI SDK `streamText()` with `maxSteps: 10` to run an Agent Loop. The LLM SHALL autonomously decide which tools to call, how many times, and when to produce a final answer. The system prompt SHALL instruct the Agent to investigate thoroughly before answering.

#### Scenario: Simple question resolved in one step
- **WHEN** a user asks "What framework is used for the API server?"
- **THEN** the Agent calls `search_docs` once, finds the answer, and produces a response in ≤2 steps

#### Scenario: Complex question requiring multiple tools
- **WHEN** a user asks "How does data flow from the API endpoint to the database?"
- **THEN** the Agent calls `search_docs` to find relevant documentation, then `search_code` to find implementation details, then `read_file` to examine specific files, and synthesizes a comprehensive answer

#### Scenario: Maximum steps reached
- **WHEN** the Agent has not produced a final answer after 10 tool-calling steps
- **THEN** the loop terminates and the Agent produces a best-effort answer with what it has gathered so far

### Requirement: Deep Search tool definitions
The system SHALL expose the following tools to the Deep Search Agent via Vercel AI SDK `tool()`:

1. **`search_docs(query: string)`** — Embeds the query and performs KNN search on `source_type: "doc"` chunks. Returns top-5 matching document chunks with metadata.
2. **`search_code(query: string)`** — Embeds the query and performs KNN search on `source_type: "code"` chunks. Returns top-5 matching code chunks with metadata.
3. **`read_file(path: string)`** — Reads the content of a source file from the project. Returns file content or error if not found.
4. **`grep_search(pattern: string, path?: string)`** — Searches for a text pattern across the project. Returns matching file paths with line numbers and context.

#### Scenario: Tool result fed back to LLM
- **WHEN** the Agent calls `search_docs("authentication")` and receives 5 chunks
- **THEN** the chunk contents are returned as the tool result and the LLM processes them in the next step

#### Scenario: read_file tool with invalid path
- **WHEN** the Agent calls `read_file` with a non-existent path
- **THEN** the tool returns an error message, and the Agent can decide to try a different path or use `grep_search`

#### Scenario: grep_search with scoped path
- **WHEN** the Agent calls `grep_search("handleAuth", "src/auth/")`
- **THEN** only files within `src/auth/` are searched

### Requirement: Deep Search streaming output
The system SHALL stream Deep Search progress via SSE with the following event types:
- `event: tool_start` — Sent when a tool call begins, with `data` containing `{ "tool": "<name>", "args": {...} }`
- `event: tool_end` — Sent when a tool call completes, with `data` containing `{ "tool": "<name>" }`
- `event: text-delta` — Sent for each text token of the Agent's reasoning or final answer
- `event: done` — Sent when the Agent loop completes, with metadata including total steps and tools used

#### Scenario: Streaming with tool calls
- **WHEN** the Agent performs 3 tool calls before producing an answer
- **THEN** the client receives `tool_start` → `tool_end` events for each call, interspersed with `text-delta` events for reasoning, ending with `done`

#### Scenario: Client-side progress display
- **WHEN** a `tool_start` event is received
- **THEN** the client can display a progress indicator showing which tool is being called and with what arguments
